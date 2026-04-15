import type { ChatMessage } from "@/types/chat"
import { cn } from "@/lib/utils"

export function MessageBubble(props: { message: ChatMessage }) {
  const m = props.message
  const time = new Date(m.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  return (
    <div className={cn("flex w-full", m.mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ring-1",
          m.mine
            ? "bg-neutral-50 text-neutral-950 ring-neutral-200"
            : "bg-neutral-900/70 text-neutral-50 ring-white/10",
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <div className={cn("truncate text-xs font-medium", m.mine ? "text-neutral-700" : "text-neutral-300")}>
            {m.mine ? "Você" : m.senderName}
          </div>
          <div className={cn("shrink-0 text-[11px]", m.mine ? "text-neutral-500" : "text-neutral-400")}>
            {time}
          </div>
        </div>
        <div className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{m.text}</div>
      </div>
    </div>
  )
}

