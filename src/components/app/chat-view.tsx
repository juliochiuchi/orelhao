import { useEffect, useMemo, useRef, useState } from "react"
import { LogOut, SendHorizonal, Shield } from "lucide-react"

import { CopyField } from "@/components/app/copy-field"
import { MessageBubble } from "@/components/app/message-bubble"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useE2EEChat } from "@/hooks/useE2EEChat"

export function ChatView(props: {
  roomCode: string
  myName: string
  myId: string
  roomKey: CryptoKey
  invite?: string
  onStatusChange?: (status: "idle" | "connecting" | "connected" | "error") => void
  onLeave: () => void
}) {
  const onStatusChange = props.onStatusChange

  const { status, messages, sendMessage, leave } = useE2EEChat({
    roomCode: props.roomCode,
    key: props.roomKey,
    myId: props.myId,
    myName: props.myName,
  })

  const [text, setText] = useState("")
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  const statusLabel = useMemo(() => {
    if (status === "connecting") return "Conectando…"
    if (status === "connected") return "Online"
    if (status === "error") return "Erro"
    return "Offline"
  }, [status])

  useEffect(() => {
    onStatusChange?.(status)
  }, [onStatusChange, status])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  async function onSend() {
    await sendMessage(text)
    setText("")
  }

  async function onLeave() {
    await leave()
    props.onLeave()
  }

  return (
    <Card className="flex h-full flex-col border-white/10 bg-neutral-950/50 backdrop-blur">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-4 text-emerald-300" />
              <span className="truncate">Sala {props.roomCode}</span>
            </CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-white/10 bg-white/5 text-neutral-200">
                {statusLabel}
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-white/5 text-neutral-200">
                E2EE AES-GCM
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-white/5 text-neutral-200">
                {props.myName}
              </Badge>
            </div>
            {props.invite ? (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-neutral-400">Compartilhar acesso</div>
                <CopyField value={props.invite} />
              </div>
            ) : null}
          </div>
          <Button type="button" variant="secondary" onClick={onLeave}>
            <LogOut />
            Sair
          </Button>
        </div>
      </CardHeader>
      <Separator className="bg-white/10" />
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-6">
        <div
          ref={scrollerRef}
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(115,115,115,0.85) rgba(58, 58, 58, 0.6)",
          }}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-neutral-950/60 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-500/80 [&::-webkit-scrollbar-thumb]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)] [&::-webkit-scrollbar-thumb:hover]:bg-neutral-400/85"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              Sem mensagens ainda. Diga oi.
            </div>
          ) : (
            messages.map(m => <MessageBubble key={m.id} message={m} />)
          )}
        </div>

        <div className="flex items-end gap-2">
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                onSend().catch(() => undefined)
              }
            }}
            placeholder="Escreva uma mensagem…"
            className="h-12 bg-neutral-950/60"
          />
          <Button type="button" onClick={() => onSend().catch(() => undefined)} className="h-12">
            <SendHorizonal />
            Enviar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
