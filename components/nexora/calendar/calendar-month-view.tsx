import type { CalendarEvent } from "./calendar-data"
import { CalendarEventChip } from "./calendar-event-chip"
import {
  WEEKDAY_LABELS,
  eventsOnDay,
  getMonthGrid,
  isSameDay,
  isSameMonth,
  sortEvents,
  toDateInput,
} from "./calendar-utils"

const MAX_VISIBLE = 3

interface CalendarMonthViewProps {
  currentDate: Date
  now: Date
  events: CalendarEvent[]
  onCreate: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onShowDay: (date: Date) => void
}

export function CalendarMonthView({
  currentDate,
  now,
  events,
  onCreate,
  onEventClick,
  onShowDay,
}: CalendarMonthViewProps) {
  const days = getMonthGrid(currentDate)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {days.map((day) => {
          const dayEvents = sortEvents(eventsOnDay(events, day))
          const visible = dayEvents.slice(0, MAX_VISIBLE)
          const hidden = dayEvents.length - visible.length
          const isToday = isSameDay(day, now)
          const inMonth = isSameMonth(day, currentDate)

          return (
            <div
              key={toDateInput(day)}
              onClick={() => onCreate(day)}
              className={`flex min-h-0 cursor-pointer flex-col gap-1 overflow-hidden border-b border-r p-1.5 transition-colors hover:bg-muted/40 [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0 ${
                inMonth ? "" : "bg-muted/20 text-muted-foreground"
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onShowDay(day)
                }}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {day.getDate()}
              </button>

              <div className="flex flex-col gap-0.5">
                {visible.map((event) => (
                  <CalendarEventChip
                    key={event.id}
                    event={event}
                    onClick={onEventClick}
                  />
                ))}
              </div>

              {hidden > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onShowDay(day)
                  }}
                  className="px-1.5 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  +{hidden} more
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
