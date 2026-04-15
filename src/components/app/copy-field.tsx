import { useState } from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function CopyField(props: {
  value: string
  placeholder?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(props.value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={cn("flex items-center gap-2", props.className)}>
      <Input readOnly value={props.value} placeholder={props.placeholder} />
      <Button type="button" variant="secondary" className="shrink-0" onClick={copy}>
        {copied ? <Check /> : <Copy />}
        <span className="hidden sm:inline">{copied ? "Copiado" : "Copiar"}</span>
      </Button>
    </div>
  )
}

