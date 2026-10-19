export type EventType = "meeting" | "call" | "demo" | "task" | "deadline"

export type CalendarView = "month" | "week" | "day" | "agenda"

export interface CalendarEvent {
  id: string
  title: string
  type: EventType
  start: Date
  /** Exclusive end. All-day events end at 00:00 of the day after their last day. */
  end: Date
  allDay: boolean
  location?: string
  description?: string
  attendees: string[]
}

export const EVENT_TYPES: EventType[] = [
  "meeting",
  "call",
  "demo",
  "task",
  "deadline",
]

export const CALENDAR_VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
  { value: "agenda", label: "Agenda" },
]

/**
 * Tailwind needs full class names, so every colour is written out per type.
 * dot    – small colour marker
 * chip   – translucent pill (month view, agenda)
 * block  – solid-ish card (week / day time grid)
 * solid  – filled pill for all-day events
 * accent – left border colour for time-grid cards
 */
export const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; dot: string; chip: string; block: string; solid: string; accent: string }
> = {
  meeting: {
    label: "Meeting",
    dot: "bg-blue-500",
    chip: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-300",
    block:
      "bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:hover:bg-blue-900",
    solid: "bg-blue-500 text-white",
    accent: "border-l-blue-500",
  },
  call: {
    label: "Call",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
    block:
      "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900",
    solid: "bg-emerald-500 text-white",
    accent: "border-l-emerald-500",
  },
  demo: {
    label: "Demo",
    dot: "bg-purple-500",
    chip: "bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 dark:text-purple-300",
    block:
      "bg-purple-100 text-purple-900 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-100 dark:hover:bg-purple-900",
    solid: "bg-purple-500 text-white",
    accent: "border-l-purple-500",
  },
  task: {
    label: "Task",
    dot: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300",
    block:
      "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900",
    solid: "bg-amber-500 text-white",
    accent: "border-l-amber-500",
  },
  deadline: {
    label: "Deadline",
    dot: "bg-rose-500",
    chip: "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300",
    block:
      "bg-rose-100 text-rose-900 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-100 dark:hover:bg-rose-900",
    solid: "bg-rose-500 text-white",
    accent: "border-l-rose-500",
  },
}

// ---------------------------------------------------------------------------
// Demo data – generated relative to today so the calendar is never empty.
// ---------------------------------------------------------------------------

function at(dayOffset: number, hour: number, minute = 0) {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  date.setDate(date.getDate() + dayOffset)
  return date
}

function allDayRange(dayOffset: number, days = 1) {
  return { start: at(dayOffset, 0), end: at(dayOffset + days, 0) }
}

export function createSeedEvents(): CalendarEvent[] {
  return [
    {
      id: "evt-1",
      title: "Demo: Enterprise Rollout",
      type: "demo",
      start: at(0, 10),
      end: at(0, 11),
      allDay: false,
      location: "Google Meet",
      description: "Walk Google's team through the rollout plan and admin controls.",
      attendees: ["Caleb Reed", "Alex Morgan"],
    },
    {
      id: "evt-2",
      title: "Call with Olivia Martin",
      type: "call",
      start: at(0, 14),
      end: at(0, 14, 30),
      allDay: false,
      location: "Phone",
      description: "Discuss the Compliance Add-on proposal and open questions.",
      attendees: ["Olivia Martin"],
    },
    {
      id: "evt-3",
      title: "Pipeline review",
      type: "meeting",
      start: at(0, 14, 15),
      end: at(0, 15, 15),
      allDay: false,
      location: "Conference Room A",
      description: "Weekly review of deals by stage and forecast.",
      attendees: ["Alex Morgan", "Jamie Wilson", "Sophia Chen"],
    },
    {
      id: "evt-4",
      title: "Contract review: Platform Renewal",
      type: "task",
      start: at(1, 11),
      end: at(1, 12),
      allDay: false,
      description: "Check renewal terms with legal before sending to Google.",
      attendees: ["Alex Morgan"],
    },
    {
      id: "evt-5",
      title: "Discovery call: Sophia Chen",
      type: "call",
      start: at(1, 15, 30),
      end: at(1, 16),
      allDay: false,
      location: "Zoom",
      attendees: ["Sophia Chen"],
    },
    {
      id: "evt-6",
      title: "Proposal deadline: Compliance Add-on",
      type: "deadline",
      start: at(2, 17),
      end: at(2, 17, 30),
      allDay: false,
      description: "Send the final proposal to Stripe.",
      attendees: ["Alex Morgan"],
    },
    {
      id: "evt-7",
      title: "Quarterly business review",
      type: "meeting",
      start: at(3, 13),
      end: at(3, 14, 30),
      allDay: false,
      location: "Main Boardroom",
      attendees: ["Alex Morgan", "Jamie Wilson", "Caleb Reed"],
    },
    {
      id: "evt-8",
      title: "Demo: Design System Upgrade",
      type: "demo",
      start: at(4, 10, 30),
      end: at(4, 11, 30),
      allDay: false,
      location: "Zoom",
      attendees: ["Jamie Wilson"],
    },
    {
      id: "evt-9",
      title: "Team offsite",
      type: "meeting",
      ...allDayRange(5, 2),
      allDay: true,
      location: "Noida",
      description: "Planning for the next quarter.",
      attendees: ["Alex Morgan", "Jamie Wilson", "Sophia Chen", "Caleb Reed"],
    },
    {
      id: "evt-10",
      title: "Follow up: Annual SaaS Contract",
      type: "task",
      start: at(-1, 9, 30),
      end: at(-1, 10),
      allDay: false,
      attendees: ["Alex Morgan"],
    },
    {
      id: "evt-11",
      title: "Negotiation call: Security Integration",
      type: "call",
      start: at(-2, 16),
      end: at(-2, 17),
      allDay: false,
      location: "Phone",
      attendees: ["Jamie Wilson"],
    },
    {
      id: "evt-12",
      title: "Sales kickoff",
      type: "meeting",
      start: at(-3, 9),
      end: at(-3, 10, 30),
      allDay: false,
      location: "Conference Room B",
      attendees: ["Alex Morgan", "Jamie Wilson", "Sophia Chen"],
    },
    {
      id: "evt-13",
      title: "Renewal deadline: Platform Renewal",
      type: "deadline",
      ...allDayRange(8),
      allDay: true,
      attendees: ["Alex Morgan"],
    },
    {
      id: "evt-14",
      title: "Demo: Analytics Expansion",
      type: "demo",
      start: at(9, 11),
      end: at(9, 12),
      allDay: false,
      location: "Google Meet",
      attendees: ["Sophia Chen"],
    },
    {
      id: "evt-15",
      title: "Weekly standup",
      type: "meeting",
      start: at(7, 9),
      end: at(7, 9, 30),
      allDay: false,
      location: "Google Meet",
      attendees: ["Alex Morgan", "Jamie Wilson"],
    },
    {
      id: "evt-16",
      title: "Forecast prep",
      type: "task",
      start: at(-6, 15),
      end: at(-6, 16),
      allDay: false,
      attendees: ["Alex Morgan"],
    },
  ]
}
