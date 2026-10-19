import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Card } from "@workspace/ui/components/card"

type LeadFormSectionProps = {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
}

export function LeadFormSection({
  icon: Icon,
  title,
  description,
  children,
}: LeadFormSectionProps) {
  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
          <Icon className="size-4" />
        </div>

        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="space-y-5 p-5">{children}</div>
    </Card>
  )
}