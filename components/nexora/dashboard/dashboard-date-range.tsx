"use client"

import * as React from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { CalendarDaysIcon, ChevronDownIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"

export function DashboardDateRange() {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2026, 5, 1),
    to: new Date(2026, 5, 30),
  })

  const label = date?.from
    ? date.to
      ? `${format(date.from, "MMM d")} – ${format(date.to, "MMM d, yyyy")}`
      : format(date.from, "MMM d, yyyy")
    : "Select date range"

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 font-medium"
          />
        }
      >
        <CalendarDaysIcon className="size-4" />

        <span>{label}</span>

        <ChevronDownIcon className="size-3.5 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-auto p-0"
      >
        <Calendar
          mode="range"
          selected={date}
          onSelect={setDate}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}