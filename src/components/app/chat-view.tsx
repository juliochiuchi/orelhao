import { useEffect, useMemo, useRef, useState } from "react"
import { ImagePlus, LogOut, SendHorizonal, Shield } from "lucide-react"

import { CopyField } from "@/components/app/copy-field"
import { MessageBubble } from "@/components/app/message-bubble"
import { TypingIndicator } from "@/components/app/typing-indicator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useE2EEChat } from "@/hooks/useE2EEChat"
import { cn } from "@/lib/utils"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

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

  const {
    status,
    messages,
    typingUsers,
    error: chatError,
    sendMessage,
    sendImage,
    notifyTypingActivity,
    stopTyping,
    leave,
    storageBucket,
  } = useE2EEChat({
    roomCode: props.roomCode,
    key: props.roomKey,
    myId: props.myId,
    myName: props.myName,
  })

  const [text, setText] = useState("")
  const [fileError, setFileError] = useState<string | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const fileErrorTimerRef = useRef<number | null>(null)

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

  useEffect(() => {
    return () => {
      if (fileErrorTimerRef.current) window.clearTimeout(fileErrorTimerRef.current)
    }
  }, [])

  function showFileError(msg: string) {
    setFileError(msg)
    if (fileErrorTimerRef.current) window.clearTimeout(fileErrorTimerRef.current)
    fileErrorTimerRef.current = window.setTimeout(() => setFileError(null), 4000)
  }

  async function onSend() {
    await sendMessage(text)
    setText("")
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (!file) return

    if (!file.type.startsWith("image/")) {
      showFileError("Arquivo inválido. Selecione uma imagem.")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showFileError(
        `Imagem muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Limite: 5MB.`,
      )
      return
    }
    try {
      await sendImage(file)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao enviar imagem"
      showFileError(message)
    }
  }

  async function onLeave() {
    await leave()
    props.onLeave()
  }

  const inputDisabled = status !== "connected"

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
            messages.map(m => (
              <MessageBubble
                key={m.id}
                message={m}
                roomKey={props.roomKey}
                storageBucket={storageBucket}
              />
            ))
          )}
        </div>

        <div className="space-y-2">
          <TypingIndicator users={typingUsers} />
          {chatError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {chatError}
            </div>
          ) : null}
          {fileError ? (
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-xs",
                "border-amber-500/30 bg-amber-500/10 text-amber-300",
              )}
            >
              {fileError}
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onFileChosen}
              disabled={inputDisabled}
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={inputDisabled}
              aria-label="Anexar imagem"
              className="h-12 w-12 shrink-0"
              title="Anexar imagem"
            >
              <ImagePlus />
            </Button>
            <div className="flex min-w-0 flex-1 items-end gap-2">
              <Input
                value={text}
                onChange={e => {
                  setText(e.target.value)
                  notifyTypingActivity()
                }}
                onBlur={() => stopTyping()}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    onSend().catch(() => undefined)
                  }
                }}
                placeholder="Escreva uma mensagem…"
                disabled={inputDisabled}
                className="h-12 bg-neutral-950/60 text-neutral-50 caret-neutral-50 placeholder:text-neutral-400"
              />
              <Button
                type="button"
                onClick={() => onSend().catch(() => undefined)}
                disabled={inputDisabled || !text.trim()}
                className="h-12 shrink-0"
              >
                <SendHorizonal />
                Enviar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
