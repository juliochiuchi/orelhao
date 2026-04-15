import * as React from "react"

import { cn } from "@/lib/utils"

export const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={cn("h-px w-full bg-neutral-200 dark:bg-neutral-800", className)}
    {...props}
  />
))
Separator.displayName = "Separator"

