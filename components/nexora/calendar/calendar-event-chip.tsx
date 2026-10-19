import { EVENT_TYPE_CONFIG, type CalendarEvent } from "./calendar-data"
import { formatTime, isAllDayLike } from "./calendar-utils"

interface CalendarEventChipProps {
  event: CalendarEvent
  onClick: (event: CalendarEvent) => void
}

/** Compact one-line event used in the month view and the all-day row. */
export function CalendarEventChip({ event, onClick }: CalendarEventChipProps) {
  const config = EVENT_TYPE_CONFIG[event.type]
  const isBlock = isAllDayLike(event)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick(event)
      }}
      className={`flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight transition-colors ${
        isBlock ? `${config.solid} hover:opacity-90` : config.chip
      }`}
    >
      {!isBlock && (
        <>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} />
          <span className="shrink-0 opacity-70">{formatTime(event.start)}</span>
        </>
      )}
      <span className="truncate">{event.title}</span>
    </button>
  )
}
