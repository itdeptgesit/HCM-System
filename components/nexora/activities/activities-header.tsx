
import { Plus } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

type ActivitiesHeaderProps = {
  onCreate: () => void
}

export function ActivitiesHeader({ onCreate }: ActivitiesHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Activities
        </h1>
        <p className="text-sm text-muted-foreground">
          Track calls, meetings, emails, and tasks across your CRM.
        </p>
      </div>

      <Button onClick={onCreate}>
        <Plus className="mr-2 size-4" />
        Create Activity
      </Button>
    </div>
  )
}