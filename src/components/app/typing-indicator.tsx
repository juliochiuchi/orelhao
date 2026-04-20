import { buildTypingLabel } from "@/lib/typing"
import type { TypingUser } from "@/types/chat"

export function TypingIndicator(props: { users: TypingUser[] }) {
  const label = buildTypingLabel(props.users.map(u => u.senderName))

  return (
    <div className="h-5 px-1 text-xs leading-5 text-neutral-400">
      <span className={label ? "opacity-100" : "opacity-0"}>{label || "Alguém está digitando..."}</span>
    </div>
  )
}
