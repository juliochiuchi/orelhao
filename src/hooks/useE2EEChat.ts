import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { decrypt, encrypt, type EncryptedPayload } from "@/crypto"
import { randomId } from "@/lib/random"
import { supabase } from "@/supabase"
import type { ChatMessage, ChatPlainMessage } from "@/types/chat"

type Status = "idle" | "connecting" | "connected" | "error"

export function useE2EEChat(params: {
  roomCode: string
  key: CryptoKey
  myId: string
  myName: string
}) {
  const [status, setStatus] = useState<Status>("idle")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const seenRef = useRef<Set<string>>(new Set())

  const channelName = useMemo(() => `room:${params.roomCode}`, [params.roomCode])

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
      channel.unsubscribe().catch(() => undefined)
      channelRef.current = null
      seenRef.current = new Set()
      setMessages([])
    }
  }, [appendMessage, channelName, params.key])

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

      const payload = await encrypt(params.key, JSON.stringify(plain))
      await channel.send({
        type: "broadcast",
        event: "message",
        payload,
      })
    },
    [appendMessage, params.key, params.myId, params.myName],
  )

  const leave = useCallback(async () => {
    const channel = channelRef.current
    if (!channel) return
    await channel.unsubscribe()
    channelRef.current = null
    setStatus("idle")
  }, [])

  return { status, messages, error, sendMessage, leave }
}
