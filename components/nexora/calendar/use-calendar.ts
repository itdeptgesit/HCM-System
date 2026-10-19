import { useEffect, useMemo, useState } from "react"

import {
  EVENT_TYPES,
  createSeedEvents,
  type CalendarEvent,
  type CalendarView,
  type EventType,
} from "./calendar-data"
import {
  createDraft,
  draftFromEvent,
  type EventDraft,
} from "./calendar-draft"
import {
  addDays,
  addMonths,
  getRangeLabel,
  startOfDay,
} from "./calendar-utils"

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>(createSeedEvents)
  const [currentDate, setCurrentDate] = useState(() => startOfDay(new Date()))
  const [view, setView] = useState<CalendarView>("month")
  const [search, setSearch] = useState("")
  const [activeTypes, setActiveTypes] = useState<EventType[]>(EVENT_TYPES)
  const [now, setNow] = useState(() => new Date())

  // Create / edit sheet. `key` forces a fresh form every time it opens.
  const [form, setForm] = useState<{ open: boolean; key: number; draft: EventDraft }>(
    () => ({ open: false, key: 0, draft: createDraft(new Date()) }),
  )
  const [details, setDetails] = useState<{ open: boolean; event: CalendarEvent | null }>({
    open: false,
    event: null,
  })
  const [removal, setRemoval] = useState<{ open: boolean; event: CalendarEvent | null }>({
    open: false,
    event: null,
  })

  // Keep "now" fresh for the current-time line and upcoming list
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  // ----- filtering -----
  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase()
    return events.filter((event) => {
      if (!activeTypes.includes(event.type)) return false
      if (!query) return true
      return [event.title, event.location ?? "", event.description ?? "", ...event.attendees]
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [events, activeTypes, search])

  const upcomingEvents = useMemo(
    () =>
      visibleEvents
        .filter((event) => event.end.getTime() > now.getTime())
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .slice(0, 5),
    [visibleEvents, now],
  )

  const typeCounts = useMemo(() => {
    const counts = Object.fromEntries(EVENT_TYPES.map((t) => [t, 0])) as Record<EventType, number>
    events.forEach((event) => (counts[event.type] += 1))
    return counts
  }, [events])

  const rangeLabel = useMemo(() => getRangeLabel(view, currentDate), [view, currentDate])

  // ----- navigation -----
  const shift = (direction: 1 | -1) =>
    setCurrentDate((date) => {
      if (view === "week") return addDays(date, 7 * direction)
      if (view === "day") return addDays(date, direction)
      return addMonths(date, direction)
    })

  const goPrev = () => shift(-1)
  const goNext = () => shift(1)
  const goToday = () => setCurrentDate(startOfDay(new Date()))

  const showDay = (date: Date) => {
    setCurrentDate(startOfDay(date))
    setView("day")
  }

  const toggleType = (type: EventType) =>
    setActiveTypes((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type],
    )

  // ----- create / edit -----
  const openCreate = (date: Date = currentDate, hour = 9, minute = 0) =>
    setForm((f) => ({ open: true, key: f.key + 1, draft: createDraft(date, hour, minute) }))

  const openEdit = (event: CalendarEvent) =>
    setForm((f) => ({ open: true, key: f.key + 1, draft: draftFromEvent(event) }))

  const setFormOpen = (open: boolean) => setForm((f) => ({ ...f, open }))

  const saveEvent = (event: CalendarEvent) => {
    const isEdit = events.some((e) => e.id === event.id)
    setEvents((current) =>
      isEdit ? current.map((e) => (e.id === event.id ? event : e)) : [...current, event],
    )
    if (!isEdit) setCurrentDate(startOfDay(event.start))
  }

  // ----- details / delete -----
  const openDetails = (event: CalendarEvent) => setDetails({ open: true, event })
  const setDetailsOpen = (open: boolean) => setDetails((d) => ({ ...d, open }))

  const editFromDetails = (event: CalendarEvent) => {
    setDetails((d) => ({ ...d, open: false }))
    openEdit(event)
  }

  const requestDelete = (event: CalendarEvent) => {
    setDetails((d) => ({ ...d, open: false }))
    setRemoval({ open: true, event })
  }

  const setRemovalOpen = (open: boolean) => setRemoval((r) => ({ ...r, open }))

  const confirmDelete = () => {
    if (removal.event) {
      const id = removal.event.id
      setEvents((current) => current.filter((e) => e.id !== id))
    }
    setRemoval((r) => ({ ...r, open: false }))
  }

  return {
    // state
    events,
    visibleEvents,
    upcomingEvents,
    typeCounts,
    currentDate,
    setCurrentDate,
    view,
    setView,
    search,
    setSearch,
    activeTypes,
    toggleType,
    now,
    rangeLabel,

    // navigation
    goPrev,
    goNext,
    goToday,
    showDay,

    // dialogs
    form,
    setFormOpen,
    openCreate,
    openEdit,
    saveEvent,
    details,
    openDetails,
    setDetailsOpen,
    editFromDetails,
    removal,
    requestDelete,
    setRemovalOpen,
    confirmDelete,
  }
}
