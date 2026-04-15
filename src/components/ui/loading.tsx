import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const sizeMap = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const

export function Loading(props: { className?: string; size?: keyof typeof sizeMap; label?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2 text-sm", props.className)}>
      <Loader2 className={cn("animate-spin", sizeMap[props.size ?? "md"])} />
      {props.label ? <span>{props.label}</span> : null}
    </div>
  )
}

export function LoadingOverlay(props: { show: boolean; label?: string }) {
  if (!props.show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm">
      <div className="rounded-2xl border border-white/10 bg-neutral-950/70 px-6 py-5 shadow-2xl">
        <Loading label={props.label ?? "Carregando…"} size="lg" className="text-neutral-50" />
      </div>
    </div>
  )
}
