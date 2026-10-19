import { CalendarX2, MapPin } from "lucide-react"

import { EVENT_TYPE_CONFIG, type CalendarEvent } from "./calendar-data"
import {
  addDays,
  eventsOnDay,
  formatTime,
  isAllDayLike,
  isSameDay,
  sortEvents,
  toDateInput,
} from "./calendar-utils"

interface CalendarAgendaViewProps {
  currentDate: Date
  now: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

/** Every event of the current month, grouped by day. */
export function CalendarAgendaView({
  currentDate,
  now,
  events,
  onEventClick,
}: CalendarAgendaViewProps) {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).getDate()

  const groups = Array.from({ length: daysInMonth }, (_, i) => {
    const day = addDays(firstDay, i)
    return { day, events: sortEvents(eventsOnDay(events, day)) }
  }).filter((group) => group.events.length > 0)

  if (groups.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <CalendarX2 className="h-8 w-8" />
        <p className="text-sm">No events this month.</p>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 divide-y overflow-y-auto">
      {groups.map(({ day, events: dayEvents }) => {
        const isToday = isSameDay(day, now)

        return (
          <div key={toDateInput(day)} className="flex gap-4 p-4">
            <div className="w-14 shrink-0 text-center">
              <div className="text-[11px] font-medium uppercase text-muted-foreground">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={`mx-auto mt-1 flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold ${
                  isToday ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                {day.getDate()}
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              {dayEvents.map((event) => {
                const config = EVENT_TYPE_CONFIG[event.type]
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onEventClick(event)}
                    className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <span
                      className={`h-9 w-1 shrink-0 rounded-full ${config.dot}`}
                    />
                    <div className="w-28 shrink-0 text-xs text-muted-foreground">
                      {isAllDayLike(event)
                        ? "All day"
                        : `${formatTime(event.start)} – ${formatTime(event.end)}`}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {event.title}
                      </div>
                      {event.location && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>
                    <span
                      className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline ${config.chip}`}
                    >
                      {config.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
