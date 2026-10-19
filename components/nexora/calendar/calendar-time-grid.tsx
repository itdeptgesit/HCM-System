import { useEffect, useRef } from "react"

import { EVENT_TYPE_CONFIG, type CalendarEvent } from "./calendar-data"
import { CalendarEventChip } from "./calendar-event-chip"
import {
  eventsOnDay,
  formatHour,
  formatTime,
  isAllDayLike,
  isSameDay,
  layoutTimedEvents,
  minutesOfDay,
  sortEvents,
  toDateInput,
} from "./calendar-utils"

const HOUR_HEIGHT = 56
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const GUTTER = 56

interface CalendarTimeGridProps {
  /** 7 days for the week view, 1 day for the day view */
  days: Date[]
  now: Date
  events: CalendarEvent[]
  onCreate: (date: Date, hour: number, minute: number) => void
  onEventClick: (event: CalendarEvent) => void
  onShowDay?: (date: Date) => void
}

export function CalendarTimeGrid({
  days,
  now,
  events,
  onCreate,
  onEventClick,
  onShowDay,
}: CalendarTimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Start the view around 7 AM
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT
  }, [])

  const template = {
    gridTemplateColumns: `${GUTTER}px repeat(${days.length}, minmax(0, 1fr))`,
  }

  const allDayByDay = days.map((day) =>
    sortEvents(eventsOnDay(events, day).filter(isAllDayLike)),
  )
  const timedByDay = days.map((day) =>
    layoutTimedEvents(
      eventsOnDay(events, day).filter((event) => !isAllDayLike(event)),
      day,
    ),
  )

  const handleColumnClick = (
    e: React.MouseEvent<HTMLDivElement>,
    day: Date,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const minutes = Math.floor((e.clientY - rect.top) / HOUR_HEIGHT * 2) * 30
    onCreate(day, Math.min(Math.floor(minutes / 60), 23), minutes % 60)
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      {/* Sticky header: day names + all-day row */}
      <div className="sticky top-0 z-20 border-b bg-card">
        <div className="grid" style={template}>
          <div />
          {days.map((day) => {
            const isToday = isSameDay(day, now)
            return (
              <button
                key={toDateInput(day)}
                type="button"
                disabled={!onShowDay}
                onClick={() => onShowDay?.(day)}
                className="flex flex-col items-center gap-0.5 border-l py-2 transition-colors enabled:hover:bg-muted/50"
              >
                <span className="text-[11px] font-medium uppercase text-muted-foreground">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold ${
                    isToday ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  {day.getDate()}
                </span>
              </button>
            )
          })}
        </div>

        <div className="grid border-t" style={template}>
          <div className="flex items-start justify-end p-1.5 text-[10px] text-muted-foreground">
            all-day
          </div>
          {days.map((day, index) => (
            <div
              key={toDateInput(day)}
              className="min-h-9 space-y-1 border-l p-1"
            >
              {allDayByDay[index].map((event) => (
                <CalendarEventChip
                  key={event.id}
                  event={event}
                  onClick={onEventClick}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Hour grid */}
      <div className="grid" style={template}>
        <div className="relative" style={{ height: 24 * HOUR_HEIGHT }}>
          {HOURS.slice(1).map((hour) => (
            <span
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground"
              style={{ top: hour * HOUR_HEIGHT }}
            >
              {formatHour(hour)}
            </span>
          ))}
        </div>

        {days.map((day, index) => (
          <div
            key={toDateInput(day)}
            className="relative cursor-pointer border-l"
            style={{ height: 24 * HOUR_HEIGHT }}
            onClick={(e) => handleColumnClick(e, day)}
          >
            {HOURS.slice(1).map((hour) => (
              <div
                key={hour}
                className="pointer-events-none absolute inset-x-0 border-t"
                style={{ top: hour * HOUR_HEIGHT }}
              />
            ))}

            {timedByDay[index].map((item) => {
              const config = EVENT_TYPE_CONFIG[item.event.type]
              const height = Math.max(
                (item.height / 60) * HOUR_HEIGHT - 2,
                22,
              )

              return (
                <button
                  key={item.event.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEventClick(item.event)
                  }}
                  className={`absolute overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left text-[11px] leading-tight transition-colors ${config.accent} ${config.block}`}
                  style={{
                    top: (item.top / 60) * HOUR_HEIGHT,
                    height,
                    left: `calc(${(item.column / item.columns) * 100}% + 2px)`,
                    width: `calc(${100 / item.columns}% - 4px)`,
                  }}
                >
                  <div className="truncate font-semibold">
                    {item.event.title}
                  </div>
                  {height >= 40 && (
                    <div className="truncate opacity-70">
                      {formatTime(item.event.start)} –{" "}
                      {formatTime(item.event.end)}
                    </div>
                  )}
                </button>
              )
            })}

            {isSameDay(day, now) && (
              <div
                className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                style={{ top: (minutesOfDay(now) / 60) * HOUR_HEIGHT }}
              >
                <span className="-ml-1 h-2 w-2 rounded-full bg-red-500" />
                <span className="h-px flex-1 bg-red-500" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
