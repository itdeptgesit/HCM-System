import type { CalendarEvent, EventType } from "./calendar-data"
import {
  addDays,
  fromInputs,
  isAllDayLike,
  isSameDay,
  toDateInput,
  toTimeInput,
} from "./calendar-utils"

/** Form-friendly (all strings) version of an event. */
export interface EventDraft {
  id?: string
  title: string
  type: EventType
  allDay: boolean
  /** yyyy-mm-dd */
  date: string
  /** yyyy-mm-dd, only used for all-day events (inclusive) */
  endDate: string
  /** HH:mm */
  startTime: string
  endTime: string
  location: string
  description: string
  /** comma separated */
  attendees: string
}

export function createDraft(date: Date, hour = 9, minute = 0): EventDraft {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute)
  let end = new Date(start.getTime() + 60 * 60_000)
  if (!isSameDay(start, end)) {
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59)
  }

  return {
    title: "",
    type: "meeting",
    allDay: false,
    date: toDateInput(start),
    endDate: toDateInput(start),
    startTime: toTimeInput(start),
    endTime: toTimeInput(end),
    location: "",
    description: "",
    attendees: "",
  }
}

export function draftFromEvent(event: CalendarEvent): EventDraft {
  const allDayLike = isAllDayLike(event)
  const lastDay = event.allDay
    ? addDays(event.end, -1)
    : new Date(event.end.getTime() - 1)

  return {
    id: event.id,
    title: event.title,
    type: event.type,
    allDay: event.allDay,
    date: toDateInput(event.start),
    endDate: toDateInput(allDayLike ? lastDay : event.start),
    startTime: toTimeInput(event.start),
    endTime: toTimeInput(event.end),
    location: event.location ?? "",
    description: event.description ?? "",
    attendees: event.attendees.join(", "),
  }
}

export function draftToEvent(
  draft: EventDraft,
): { event: CalendarEvent } | { error: string } {
  const title = draft.title.trim()
  if (!title) return { error: "Please add a title." }
  if (!draft.date) return { error: "Please pick a date." }

  let start: Date
  let end: Date

  if (draft.allDay) {
    start = fromInputs(draft.date)
    const last = fromInputs(draft.endDate || draft.date)
    if (last < start) return { error: "End date can't be before the start date." }
    end = addDays(last, 1)
  } else {
    start = fromInputs(draft.date, draft.startTime)
    end = fromInputs(draft.date, draft.endTime)
    if (end <= start) return { error: "End time must be after the start time." }
  }

  return {
    event: {
      id: draft.id ?? `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      type: draft.type,
      start,
      end,
      allDay: draft.allDay,
      location: draft.location.trim() || undefined,
      description: draft.description.trim() || undefined,
      attendees: draft.attendees
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    },
  }
}
