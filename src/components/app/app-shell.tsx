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
    <div className="min-h-dvh bg-gradient-to-b from-black via-neutral-950 to-neutral-900 text-neutral-50">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04),transparent_25%,transparent_75%,rgba(255,255,255,0.03)),radial-gradient(55rem_40rem_at_10%_15%,rgba(255,255,255,0.05),transparent_60%),radial-gradient(50rem_35rem_at_100%_0%,rgba(255,255,255,0.035),transparent_60%)]" />
      <div className={cn("relative mx-auto flex w-full max-w-5xl flex-col px-4 py-10", props.className)}>
        {props.children}
      </div>
      <LoadingOverlay show={Boolean(props.loading)} label={props.loadingLabel} />
    </div>
  )
}
