import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { decrypt, encrypt, type EncryptedPayload } from "@/crypto"
import { randomId } from "@/lib/random"
import { supabase } from "@/supabase"
import type { ChatMessage, ChatPlainMessage, ChatTypingPayload, TypingUser } from "@/types/chat"

type Status = "idle" | "connecting" | "connected" | "error"

export function useE2EEChat(params: {
  roomCode: string
  key: CryptoKey
  myId: string
  myName: string
}) {
  const [status, setStatus] = useState<Status>("idle")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [error, setError] = useState<string | null>(null)

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const seenRef = useRef<Set<string>>(new Set())
  const typingRef = useRef<Map<string, { senderName: string; lastTypedAt: number }>>(new Map())
  const typingPruneTimerRef = useRef<number | null>(null)
  const typingIdleTimerRef = useRef<number | null>(null)
  const amITypingRef = useRef(false)
  const lastTypingPingAtRef = useRef(0)

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

  const scheduleTypingPrune = useCallback(() => {
    if (typingPruneTimerRef.current) window.clearInterval(typingPruneTimerRef.current)
    typingPruneTimerRef.current = window.setInterval(() => {
      syncTypingState()
    }, 1_000)
  }, [syncTypingState])

  const appendMessage = useCallback(
    (plain: ChatPlainMessage) => {
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

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (!active) return
      setStatus("connecting")
      setError(null)
    })

    const channel = supabase.channel(channelName)
    channelRef.current = channel

    channel.on("broadcast", { event: "message" }, async ({ payload }) => {
      try {
        const text = await decrypt(params.key, payload as EncryptedPayload)
        const parsed = JSON.parse(text) as ChatPlainMessage
        if (!active) return
        if (!parsed?.id || !parsed?.senderId || typeof parsed.text !== "string") return
        appendMessage(parsed)
      } catch {
        if (!active) return
      }
    })

    channel.on("broadcast", { event: "typing" }, async ({ payload }) => {
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

    channel.subscribe(status => {
      if (!active) return
      if (status === "SUBSCRIBED") setStatus("connected")
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
      channel.unsubscribe().catch(() => undefined)
      channelRef.current = null
      seenRef.current = new Set()
      typingRef.current = new Map()
      setMessages([])
      setTypingUsers([])
    }
  }, [appendMessage, channelName, params.key, params.myId, scheduleTypingPrune, stopTyping, syncTypingState])

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
      }

      appendMessage(plain)
      stopTyping()

      const payload = await encrypt(params.key, JSON.stringify(plain))
      await channel.send({
        type: "broadcast",
        event: "message",
        payload,
      })
    },
    [appendMessage, params.key, params.myId, params.myName, stopTyping],
  )

  const leave = useCallback(async () => {
    const channel = channelRef.current
    if (!channel) return
    stopTyping()
    await channel.unsubscribe()
    channelRef.current = null
    setStatus("idle")
    setTypingUsers([])
    typingRef.current = new Map()
  }, [stopTyping])

  return { status, messages, typingUsers, error, sendMessage, notifyTypingActivity, stopTyping, leave }
}
