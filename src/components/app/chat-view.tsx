import { useEffect, useMemo, useRef, useState } from "react"
import { ImagePlus, LogOut, SendHorizonal, Shield } from "lucide-react"

import { CopyField } from "@/components/app/copy-field"
import { MessageBubble } from "@/components/app/message-bubble"
import { TypingIndicator } from "@/components/app/typing-indicator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
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
    onlineUsers,
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

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
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    const maxHeight = typeof window !== "undefined" && window.innerWidth < 768 ? 160 : 200
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px"
  }, [text])

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
    const ta = textareaRef.current
    if (ta) ta.style.height = "auto"
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
      <CardHeader className="pb-3 md:pb-4 pt-4 md:pt-6">
        <div className="flex items-start justify-between gap-2 md:gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <Shield className="size-3.5 md:size-4 text-emerald-300 shrink-0" />
              <span className="truncate">Sala {props.roomCode}</span>
            </CardTitle>
            <div className="mt-1.5 md:mt-2 flex flex-wrap items-center gap-1.5 md:gap-2">
              <Badge variant="outline" className="border-white/10 bg-white/5 text-neutral-200 text-[11px] md:text-xs px-2 md:px-2.5 py-0.5">
                {statusLabel}
              </Badge>
              <Badge
                variant="outline"
                title={onlineUsers.length ? onlineUsers.map(u => u.senderName).join(", ") : undefined}
                className="border-white/10 bg-white/5 text-neutral-200 text-[11px] md:text-xs px-2 md:px-2.5 py-0.5"
              >
                {onlineUsers.length} online
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-white/5 text-neutral-200 text-[11px] md:text-xs px-2 md:px-2.5 py-0.5">
                E2EE AES-GCM
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-white/5 text-neutral-200 text-[11px] md:text-xs px-2 md:px-2.5 py-0.5 max-w-[40vw] md:max-w-none truncate">
                {props.myName}
              </Badge>
            </div>
            {props.invite ? (
              <div className="mt-3 md:mt-4 space-y-1.5 md:space-y-2">
                <div className="text-[11px] md:text-xs text-neutral-400">Compartilhar acesso</div>
                <CopyField value={props.invite} />
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={onLeave}
            aria-label="Sair da sala"
            className="h-9 w-9 shrink-0 md:h-10 md:w-auto md:px-4 md:py-2 [&_svg]:size-4"
          >
            <LogOut />
            <span className="hidden md:inline">Sair</span>
          </Button>
        </div>
      </CardHeader>
      <Separator className="bg-white/10" />
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 md:gap-4 pt-4 md:pt-6 pb-3 md:pb-6">
        <div
          ref={scrollerRef}
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(115,115,115,0.85) rgba(58, 58, 58, 0.6)",
          }}
          className="flex min-h-0 flex-1 flex-col gap-2.5 md:gap-3 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 md:p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-neutral-950/60 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-500/80 [&::-webkit-scrollbar-thumb]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)] [&::-webkit-scrollbar-thumb:hover]:bg-neutral-400/85"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400 px-2 text-center">
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

        <div className="space-y-2 pb-[env(safe-area-inset-bottom)]">
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
          <div className="flex items-end gap-2 min-w-0">
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
              onClick={() => fileInputRef.current?.click()}
              disabled={inputDisabled}
              aria-label="Anexar imagem"
              title="Anexar imagem"
              className="h-10 md:h-12 w-10 md:w-12 shrink-0 [&_svg]:size-4 md:[&_svg]:size-4"
            >
              <ImagePlus />
            </Button>
            <div className="min-w-0 flex-1">
              <Textarea
                ref={textareaRef}
                value={text}
                rows={1}
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
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(115,115,115,0.85) rgba(58, 58, 58, 0.6)",
                }}
                className="min-h-[40px] md:min-h-[48px] h-auto max-h-40 md:max-h-[200px] resize-none overflow-y-auto py-2.5 md:py-3 px-3 md:px-4 rounded-md md:rounded-md text-[15px] md:text-sm leading-relaxed bg-neutral-950/60 text-neutral-50 caret-neutral-50 placeholder:text-neutral-400 border-white/10 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-neutral-950/60 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-500/80 [&::-webkit-scrollbar-thumb]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)] [&::-webkit-scrollbar-thumb:hover]:bg-neutral-400/85"
              />
            </div>
            <Button
              type="button"
              onClick={() => onSend().catch(() => undefined)}
              disabled={inputDisabled || !text.trim()}
              aria-label="Enviar mensagem"
              className="h-10 md:h-12 w-10 shrink-0 md:w-auto md:px-4 md:py-2 [&_svg]:size-4 md:[&_svg]:size-4 md:[&_svg]:mr-2"
            >
              <SendHorizonal />
              <span className="hidden md:inline">Enviar</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
