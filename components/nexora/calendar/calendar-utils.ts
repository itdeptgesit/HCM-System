import type { CalendarEvent, CalendarView } from "./calendar-data"

const MS_PER_DAY = 86_400_000

/** 0 = Sunday, 1 = Monday */
export const WEEK_STARTS_ON = 0

const BASE_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
export const WEEKDAY_LABELS = [
  ...BASE_WEEKDAYS.slice(WEEK_STARTS_ON),
  ...BASE_WEEKDAYS.slice(0, WEEK_STARTS_ON),
]

// ---------------------------------------------------------------------------
// Date math
// ---------------------------------------------------------------------------

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function addMonths(date: Date, amount: number) {
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), lastDay))
  return target
}

export function startOfWeek(date: Date) {
  const start = startOfDay(date)
  start.setDate(start.getDate() - ((start.getDay() - WEEK_STARTS_ON + 7) % 7))
  return start
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function minutesOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes()
}

/** 42 days (6 weeks) covering the month of `date`. */
export function getMonthGrid(date: Date) {
  const start = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1))
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function getWeekDays(date: Date) {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** All-day events and events spanning more than one calendar day. */
export function isAllDayLike(event: CalendarEvent) {
  if (event.allDay) return true
  return !isSameDay(event.start, new Date(event.end.getTime() - 1))
}

export function eventsOnDay(events: CalendarEvent[], day: Date) {
  const dayStart = startOfDay(day).getTime()
  const dayEnd = addDays(startOfDay(day), 1).getTime()
  return events.filter(
    (event) =>
      event.start.getTime() < dayEnd &&
      Math.max(event.end.getTime(), event.start.getTime() + 1) > dayStart,
  )
}

export function sortEvents(events: CalendarEvent[]) {
  return [...events].sort((a, b) => {
    const aBlock = isAllDayLike(a)
    const bBlock = isAllDayLike(b)
    if (aBlock !== bBlock) return aBlock ? -1 : 1
    return a.start.getTime() - b.start.getTime()
  })
}

export interface PositionedEvent {
  event: CalendarEvent
  /** minutes from midnight */
  top: number
  /** minutes */
  height: number
  column: number
  columns: number
}

/** Side-by-side layout for overlapping timed events on a single day. */
export function layoutTimedEvents(events: CalendarEvent[], day: Date) {
  const dayStart = startOfDay(day).getTime()
  const dayEnd = addDays(startOfDay(day), 1).getTime()

  const items = events
    .map((event) => ({
      event,
      start: Math.max(event.start.getTime(), dayStart),
      end: Math.min(event.end.getTime(), dayEnd),
    }))
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const result: PositionedEvent[] = []
  let cluster: typeof items = []
  let clusterEnd = 0

  const flush = () => {
    const columnEnds: number[] = []
    const placed = cluster.map((item) => {
      let column = columnEnds.findIndex((end) => end <= item.start)
      if (column === -1) {
        column = columnEnds.length
        columnEnds.push(item.end)
      } else {
        columnEnds[column] = item.end
      }
      return { item, column }
    })

    placed.forEach(({ item, column }) =>
      result.push({
        event: item.event,
        top: (item.start - dayStart) / 60_000,
        height: Math.max((item.end - item.start) / 60_000, 20),
        column,
        columns: columnEnds.length,
      }),
    )
    cluster = []
  }

  for (const item of items) {
    if (cluster.length > 0 && item.start >= clusterEnd) flush()
    cluster.push(item)
    clusterEnd = cluster.length === 1 ? item.end : Math.max(clusterEnd, item.end)
  }
  if (cluster.length > 0) flush()

  return result
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const pad = (value: number) => String(value).padStart(2, "0")

export function toDateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function toTimeInput(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromInputs(date: string, time = "00:00") {
  const [year, month, day] = date.split("-").map(Number)
  const [hours, minutes] = time.split(":").map(Number)
  return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0)
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

export function formatHour(hour: number) {
  return `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`
}

function lastVisibleDay(event: CalendarEvent) {
  return event.allDay
    ? addDays(event.end, -1)
    : new Date(event.end.getTime() - 1)
}

const longDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

export function formatEventWhen(event: CalendarEvent) {
  if (isAllDayLike(event)) {
    const last = lastVisibleDay(event)
    return isSameDay(event.start, last)
      ? `${longDate(event.start)} · All day`
      : `${longDate(event.start)} – ${longDate(last)}`
  }
  return `${longDate(event.start)} · ${formatTime(event.start)} – ${formatTime(event.end)}`
}

export function formatShortWhen(event: CalendarEvent) {
  const day = event.start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
  return isAllDayLike(event) ? `${day} · All day` : `${day} · ${formatTime(event.start)}`
}

export function getRangeLabel(view: CalendarView, date: Date) {
  if (view === "day") return longDate(date)

  if (view === "week") {
    const start = startOfWeek(date)
    const end = addDays(start, 6)
    const startMonth = start.toLocaleDateString("en-US", { month: "short" })
    const endMonth = end.toLocaleDateString("en-US", { month: "short" })

    if (start.getFullYear() !== end.getFullYear()) {
      return `${startMonth} ${start.getDate()}, ${start.getFullYear()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`
    }
    if (start.getMonth() === end.getMonth()) {
      return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
    }
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`
  }

  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export { MS_PER_DAY }
