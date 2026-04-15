import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function AppShell(props: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60rem_60rem_at_20%_10%,rgba(59,130,246,0.35),transparent_60%),radial-gradient(50rem_50rem_at_80%_30%,rgba(168,85,247,0.25),transparent_55%),radial-gradient(45rem_45rem_at_50%_90%,rgba(34,197,94,0.18),transparent_60%)]" />
      <div className={cn("relative mx-auto flex w-full max-w-5xl flex-col px-4 py-10", props.className)}>
        {props.children}
      </div>
    </div>
  )
}

