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
  onLeave: () => void
}) {
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
    <Card className="border-white/10 bg-neutral-950/50 backdrop-blur">
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
      <CardContent className="flex h-[70dvh] flex-col gap-4 pt-6">
        <div
          ref={scrollerRef}
          className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-4"
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
