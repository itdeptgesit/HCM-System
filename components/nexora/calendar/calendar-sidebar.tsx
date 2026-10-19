import { useMemo } from "react"

import { Calendar } from "@workspace/ui/components/calendar"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  EVENT_TYPES,
  EVENT_TYPE_CONFIG,
  type CalendarEvent,
  type EventType,
} from "./calendar-data"
import { formatShortWhen, startOfDay } from "./calendar-utils"

interface CalendarSidebarProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  events: CalendarEvent[]
  upcomingEvents: CalendarEvent[]
  typeCounts: Record<EventType, number>
  activeTypes: EventType[]
  onToggleType: (type: EventType) => void
  onEventClick: (event: CalendarEvent) => void
}

export function CalendarSidebar({
  currentDate,
  onDateChange,
  events,
  upcomingEvents,
  typeCounts,
  activeTypes,
  onToggleType,
  onEventClick,
}: CalendarSidebarProps) {
  const eventDays = useMemo(
    () => events.map((event) => startOfDay(event.start)),
    [events],
  )

return (
  <aside className="hidden w-72 min-h-0 shrink-0 xl:flex">
    <ScrollArea className="h-full w-full">
      <div className="flex flex-col gap-4 pr-3">
        {/* Mini calendar */}
        <div className="rounded-xl border bg-card p-2">
          <Calendar
            key={`${currentDate.getFullYear()}-${currentDate.getMonth()}`}
            mode="single"
            selected={currentDate}
            defaultMonth={currentDate}
            onSelect={(date) => date && onDateChange(startOfDay(date))}
            modifiers={{ hasEvents: eventDays }}
            modifiersClassNames={{ hasEvents: "font-semibold" }}
            className="w-full"
          />
        </div>

        {/* Type filters */}
        <div className="rounded-xl border bg-card p-3">
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Event types
          </h3>
          <div className="space-y-0.5">
            {EVENT_TYPES.map((type) => {
              const config = EVENT_TYPE_CONFIG[type]
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onToggleType(type)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <Checkbox
                    checked={activeTypes.includes(type)}
                    tabIndex={-1}
                    className="pointer-events-none"
                  />
                  <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                  <span className="flex-1 text-left">{config.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {typeCounts[type]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Upcoming */}
        <div className="rounded-xl border bg-card p-3">
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming
          </h3>
          {upcomingEvents.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No upcoming events.
            </p>
          ) : (
            <div className="space-y-1">
              {upcomingEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEventClick(event)}
                  className="flex w-full items-stretch gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
                >
                  <span
                    className={`w-1 shrink-0 rounded-full ${EVENT_TYPE_CONFIG[event.type].dot}`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {event.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatShortWhen(event)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  </aside>
)
}
