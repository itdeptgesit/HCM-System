import { Plus } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

interface CalendarHeaderProps {
  onCreate: () => void
}

export function CalendarHeader({ onCreate }: CalendarHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Schedule meetings, calls and demos, and keep track of deal deadlines.
        </p>
      </div>

      <Button onClick={onCreate} className="gap-2">
        <Plus className="h-4 w-4" />
        New Event
      </Button>
    </div>
  )
}
