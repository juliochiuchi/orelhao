import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { decrypt, encrypt, type EncryptedPayload } from "@/crypto"
import { compressImage, decryptBlob, encryptBlob } from "@/lib/image"
import { randomId } from "@/lib/random"
import { supabase } from "@/supabase"
import type {
  ChatLocalMessage,
  ChatMessage,
  ChatPlainImageMessage,
  ChatPlainMessage,
  ChatTypingPayload,
  OnlineUser,
  TypingUser,
} from "@/types/chat"

type Status = "idle" | "connecting" | "connected" | "error"

const STORAGE_BUCKET = "chat-images"
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function useE2EEChat(params: {
  roomCode: string
  key: CryptoKey
  myId: string
  myName: string
}) {
  const [status, setStatus] = useState<Status>("idle")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [error, setError] = useState<string | null>(null)

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const seenRef = useRef<Set<string>>(new Set())
  const typingRef = useRef<Map<string, { senderName: string; lastTypedAt: number }>>(new Map())
  const typingPruneTimerRef = useRef<number | null>(null)
  const typingIdleTimerRef = useRef<number | null>(null)
  const amITypingRef = useRef(false)
  const lastTypingPingAtRef = useRef(0)
  const onlineRef = useRef<Map<string, { senderName: string }>>(new Map())

  const channelName = useMemo(() => `room:${params.roomCode}`, [params.roomCode])
  const typingTtlMs = 6_000
  const typingIdleMs = 1_200
  const typingPingMs = 2_000

  const syncTypingState = useCallback(() => {
    const now = Date.now()
    const next: TypingUser[] = []
    for (const [senderId, v] of typingRef.current.entries()) {
      if (senderId === params.myId) continue
      if (now - v.lastTypedAt > typingTtlMs) continue
      next.push({ senderId, senderName: v.senderName })
    }
    next.sort((a, b) => a.senderName.localeCompare(b.senderName))
    setTypingUsers(next)
  }, [params.myId, typingTtlMs])

  const syncOnlineState = useCallback(() => {
    const next: OnlineUser[] = []
    for (const [senderId, v] of onlineRef.current.entries()) {
      next.push({ senderId, senderName: v.senderName })
    }
    next.sort((a, b) => a.senderName.localeCompare(b.senderName))
    setOnlineUsers(next)
  }, [])

  const scheduleTypingPrune = useCallback(() => {
    if (typingPruneTimerRef.current) window.clearInterval(typingPruneTimerRef.current)
    typingPruneTimerRef.current = window.setInterval(() => {
      syncTypingState()
    }, 1_000)
  }, [syncTypingState])

  const appendMessage = useCallback(
    (plain: ChatLocalMessage) => {
      if (seenRef.current.has(plain.id)) return
      seenRef.current.add(plain.id)
      setMessages(prev => [
        ...prev,
        {
          ...plain,
          mine: plain.senderId === params.myId,
        },
      ])
    },
    [params.myId],
  )

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id))
    seenRef.current.delete(id)
  }, [])

  const setMessageUploadError = useCallback((id: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === id ? { ...m, uploadStatus: "error" } : m,
      ),
    )
  }, [])

  const sendTyping = useCallback(
    async (isTyping: boolean) => {
      const channel = channelRef.current
      if (!channel) return

      const plain: ChatTypingPayload = {
        senderId: params.myId,
        senderName: params.myName,
        isTyping,
        sentAt: Date.now(),
      }

      const payload = await encrypt(params.key, JSON.stringify(plain))
      await channel.send({
        type: "broadcast",
        event: "typing",
        payload,
      })
    },
    [params.key, params.myId, params.myName],
  )

  const notifyTypingActivity = useCallback(() => {
    const now = Date.now()
    if (!amITypingRef.current) {
      amITypingRef.current = true
      lastTypingPingAtRef.current = now
      sendTyping(true).catch(() => undefined)
    } else if (now - lastTypingPingAtRef.current >= typingPingMs) {
      lastTypingPingAtRef.current = now
      sendTyping(true).catch(() => undefined)
    }

    if (typingIdleTimerRef.current) window.clearTimeout(typingIdleTimerRef.current)
    typingIdleTimerRef.current = window.setTimeout(() => {
      amITypingRef.current = false
      lastTypingPingAtRef.current = 0
      sendTyping(false).catch(() => undefined)
    }, typingIdleMs)
  }, [sendTyping, typingIdleMs, typingPingMs])

  const stopTyping = useCallback(() => {
    if (typingIdleTimerRef.current) window.clearTimeout(typingIdleTimerRef.current)
    typingIdleTimerRef.current = null
    if (!amITypingRef.current) return
    amITypingRef.current = false
    lastTypingPingAtRef.current = 0
    sendTyping(false).catch(() => undefined)
  }, [sendTyping])

  const broadcastPayload = useCallback(
    async (plain: ChatPlainMessage) => {
      const channel = channelRef.current
      if (!channel) return
      const payload = await encrypt(params.key, JSON.stringify(plain))
      await channel.send({
        type: "broadcast",
        event: "message",
        payload,
      })
    },
    [params.key],
  )

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (!active) return
      setStatus("connecting")
      setError(null)
    })

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: params.myId,
        },
      },
    })
    channelRef.current = channel

    channel
      .on("broadcast", { event: "message" }, async ({ payload }) => {
        try {
          const text = await decrypt(params.key, payload as EncryptedPayload)
          const parsed = JSON.parse(text) as ChatPlainMessage & { text?: string }
          if (!active) return
          if (!parsed?.id || !parsed?.senderId) return

          const type: "text" | "image" = parsed.type === "image" ? "image" : "text"

          if (type === "text") {
            const msgText = typeof parsed.text === "string" ? parsed.text : ""
            const normalized: ChatPlainMessage = {
              id: parsed.id,
              senderId: parsed.senderId,
              senderName: parsed.senderName ?? "Anônimo",
              sentAt: parsed.sentAt ?? Date.now(),
              type: "text",
              text: msgText,
            }
            appendMessage(normalized)
          } else {
            const img = (parsed as ChatPlainImageMessage).image
            if (!img || typeof img.storageKey !== "string" || typeof img.iv !== "string") return
            if (typeof img.mimeType !== "string" || typeof img.size !== "number") return
            const normalized: ChatPlainImageMessage = {
              id: parsed.id,
              senderId: parsed.senderId,
              senderName: parsed.senderName ?? "Anônimo",
              sentAt: parsed.sentAt ?? Date.now(),
              type: "image",
              image: {
                storageKey: img.storageKey,
                iv: img.iv,
                mimeType: img.mimeType,
                size: img.size,
                fileName: img.fileName,
              },
            }
            appendMessage(normalized)
          }
        } catch {
          if (!active) return
        }
      })
      .on("broadcast", { event: "typing" }, async ({ payload }) => {
        try {
          const text = await decrypt(params.key, payload as EncryptedPayload)
          const parsed = JSON.parse(text) as ChatTypingPayload
          if (!active) return
          if (!parsed?.senderId || typeof parsed.senderName !== "string") return
          if (typeof parsed.isTyping !== "boolean" || typeof parsed.sentAt !== "number") return
          if (parsed.senderId === params.myId) return

          if (parsed.isTyping) {
            typingRef.current.set(parsed.senderId, { senderName: parsed.senderName, lastTypedAt: parsed.sentAt })
          } else {
            typingRef.current.delete(parsed.senderId)
          }
          syncTypingState()
        } catch {
          if (!active) return
        }
      })
      .on("presence", { event: "sync" }, () => {
        if (!active) return
        const state = channel.presenceState<{ senderId: string; senderName: string }>()
        const next = new Map<string, { senderName: string }>()
        for (const presences of Object.values(state)) {
          for (const p of presences) {
            if (!p?.senderId || typeof p.senderName !== "string") continue
            next.set(p.senderId, { senderName: p.senderName })
          }
        }
        onlineRef.current = next
        syncOnlineState()
      })
      .subscribe(async status => {
        if (!active) return
        if (status === "SUBSCRIBED") {
          try {
            await channel.track({
              senderId: params.myId,
              senderName: params.myName,
            })
          } catch {
            // ignore track errors
          }
          setStatus("connected")
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setStatus("error")
          setError("Falha ao conectar no realtime")
        }
      })

    return () => {
      active = false
      setStatus("idle")
      stopTyping()
      if (typingPruneTimerRef.current) window.clearInterval(typingPruneTimerRef.current)
      if (typingIdleTimerRef.current) window.clearTimeout(typingIdleTimerRef.current)
      typingPruneTimerRef.current = null
      typingIdleTimerRef.current = null
      // Fire-and-forget: untrack + unsubscribe. Não esperamos para não
      // travar o cleanup sincrono do React (StrictMode re-utiliza a montagem)
      channel.untrack().catch(() => undefined)
      channel.unsubscribe().catch(() => undefined)
      channelRef.current = null
      seenRef.current = new Set()
      typingRef.current = new Map()
      onlineRef.current = new Map()
      setMessages([])
      setTypingUsers([])
      setOnlineUsers([])
    }
  }, [appendMessage, channelName, params.key, params.myId, params.myName, scheduleTypingPrune, stopTyping, syncOnlineState, syncTypingState])

  useEffect(() => {
    scheduleTypingPrune()
    return () => {
      if (typingPruneTimerRef.current) window.clearInterval(typingPruneTimerRef.current)
      typingPruneTimerRef.current = null
    }
  }, [scheduleTypingPrune])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const channel = channelRef.current
      if (!channel) return

      const plain: ChatPlainMessage = {
        id: randomId(),
        senderId: params.myId,
        senderName: params.myName,
        text: trimmed,
        sentAt: Date.now(),
        type: "text",
      }

      appendMessage(plain)
      stopTyping()
      try {
        await broadcastPayload(plain)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Falha ao enviar mensagem"
        setError(message)
        setTimeout(() => setError(prev => (prev === message ? null : prev)), 4000)
      }
    },
    [appendMessage, broadcastPayload, params.myId, params.myName, stopTyping],
  )

  const sendImage = useCallback(
    async (file: File): Promise<void> => {
      const channel = channelRef.current
      if (!channel) throw new Error("Canal desconectado")
      if (file.size > MAX_IMAGE_BYTES) {
        throw new Error(`Imagem muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Limite: 5MB.`)
      }

      const preparedBlob = await compressImage(file)
      if (preparedBlob.size > MAX_IMAGE_BYTES) {
        throw new Error(`Imagem continua muito grande após compressão (${(preparedBlob.size / 1024 / 1024).toFixed(2)}MB).`)
      }

      const { encrypted, iv } = await encryptBlob(params.key, preparedBlob)
      const storageId = randomId()
      const storageKey = `${params.roomCode}/${storageId}.enc`

      const optimisticId = randomId()
      const localObjectUrl = URL.createObjectURL(preparedBlob)
      const optimistic: ChatLocalMessage = {
        id: optimisticId,
        senderId: params.myId,
        senderName: params.myName,
        sentAt: Date.now(),
        type: "image",
        image: {
          storageKey,
          iv,
          mimeType: preparedBlob.type || file.type || "image/jpeg",
          size: preparedBlob.size,
          fileName: file.name,
        },
        localObjectUrl,
        uploadStatus: "pending",
      }

      appendMessage(optimistic)
      stopTyping()

      try {
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storageKey, new Blob([encrypted], { type: "application/octet-stream" }))
        if (uploadError) throw uploadError

        const finalMessage: ChatPlainImageMessage = {
          id: optimisticId,
          senderId: params.myId,
          senderName: params.myName,
          sentAt: Date.now(),
          type: "image",
          image: optimistic.image,
        }

        setMessages(prev =>
          prev.map(m =>
            m.id === optimisticId ? { ...m, uploadStatus: undefined } : m,
          ),
        )

        await broadcastPayload(finalMessage)
      } catch (err) {
        URL.revokeObjectURL(localObjectUrl)
        const message = err instanceof Error ? err.message : "Falha ao enviar imagem"
        setMessageUploadError(optimisticId)
        setError(message)
        setTimeout(() => {
          removeMessage(optimisticId)
          setError(prev => (prev === message ? null : prev))
        }, 4000)
      }
    },
    [appendMessage, broadcastPayload, params.key, params.myId, params.myName, params.roomCode, removeMessage, setMessageUploadError, stopTyping],
  )

  const leave = useCallback(async () => {
    const channel = channelRef.current
    if (!channel) return
    stopTyping()
    try {
      await channel.untrack()
    } catch {
      // ignore
    }
    await channel.unsubscribe()
    channelRef.current = null
    setStatus("idle")
    setTypingUsers([])
    setOnlineUsers([])
    typingRef.current = new Map()
    onlineRef.current = new Map()
  }, [stopTyping])

  return {
    status,
    messages,
    typingUsers,
    onlineUsers,
    error,
    sendMessage,
    sendImage,
    notifyTypingActivity,
    stopTyping,
    leave,
    decryptBlob,
    storageBucket: STORAGE_BUCKET,
    roomKey: params.key,
  }
}
