import type { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Label } from "@workspace/ui/components/label"

type LeadFormFieldProps = {
  label: string
  htmlFor: string
  required?: boolean
  hint?: string
  className?: string
  children: ReactNode
}

export function LeadFormField({
  label,
  htmlFor,
  required,
  hint,
  className,
  children,
}: LeadFormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>

      {children}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}