import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { LoadingOverlay } from "@/components/ui/loading"

export function AppShell(props: {
  children: ReactNode
  className?: string
  loading?: boolean
  loadingLabel?: string
}) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-950 to-neutral-950 text-neutral-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(70rem_50rem_at_50%_-10%,rgba(37,99,235,0.22),transparent_60%),radial-gradient(60rem_45rem_at_0%_100%,rgba(14,165,233,0.14),transparent_55%)]" />
      <div className={cn("relative mx-auto flex w-full max-w-5xl flex-col px-4 py-10", props.className)}>
        {props.children}
      </div>
      <LoadingOverlay show={Boolean(props.loading)} label={props.loadingLabel} />
    </div>
  )
}
