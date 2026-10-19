import { useState } from "react"
import {
  Activity,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Mail,
  RotateCcw,
  Smartphone,
  Sparkles,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Switch } from "@workspace/ui/components/switch"

const notificationEvents = [
  {
    id: "newLead",
    title: "New lead",
    description: "When a new lead is added to the CRM.",
    icon: Activity,
  },
  {
    id: "dealWon",
    title: "Deal won",
    description: "When a deal is marked as won.",
    icon: Check,
  },
  {
    id: "taskDue",
    title: "Task due",
    description: "When a task is due or overdue.",
    icon: Bell,
  },
  {
    id: "mentions",
    title: "Mentions",
    description: "When a teammate mentions you in an activity or comment.",
    icon: BellRing,
  },
  {
    id: "dailyDigest",
    title: "Daily digest",
    description: "A daily summary of your CRM activity.",
    icon: Activity,
  },
] as const

const channels = [
  {
    id: "email",
    label: "Email",
    description: "Direct notifications sent straight to your inbox.",
    icon: Mail,
  },
  {
    id: "push",
    label: "Push",
    description: "Instant browser or mobile device alerts.",
    icon: Smartphone,
  },
  {
    id: "inApp",
    label: "In-app",
    description: "Unobtrusive badge updates inside Nexora.",
    icon: Bell,
  },
] as const

type EventId = (typeof notificationEvents)[number]["id"]
type Channel = (typeof channels)[number]["id"]
type EventPreferences = Record<Channel, boolean>

const initialPreferences: Record<EventId, EventPreferences> = {
  newLead: { email: true, push: false, inApp: true },
  dealWon: { email: true, push: true, inApp: true },
  taskDue: { email: false, push: true, inApp: true },
  mentions: { email: true, push: true, inApp: true },
  dailyDigest: { email: true, push: false, inApp: false },
}

export function NotificationsSettings() {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [message, setMessage] = useState("")
  const [isSaved, setIsSaved] = useState(false)

  function updatePreference(eventId: EventId, channel: Channel, checked: boolean) {
    setPreferences((current) => ({
      ...current,
      [eventId]: {
        ...current[eventId],
        [channel]: checked,
      },
    }))
    setMessage("")
    setIsSaved(false)
  }

  function handleReset() {
    setPreferences(initialPreferences)
    setMessage("Reset preferences to default settings.")
    setIsSaved(false)
  }

  function handleSave() {
    setIsSaved(true)
    setMessage("Demo mode: connect your backend to save notification preferences.")
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Notification Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Configure how and when Nexora alerts you about key CRM events.
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2 md:pt-0">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="size-3.5" />
            Reset to default
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6">
        {/* Event List */}
        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <div className="divide-y">
              {notificationEvents.map((event) => {
                const Icon = event.icon
                const eventPrefs = preferences[event.id]

                return (
                  <div
                    key={event.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    {/* Event Info */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background shadow-2xs">
                        <Icon className="size-4 text-foreground/70" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-none">{event.title}</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                          {event.description}
                        </p>
                      </div>
                    </div>

                    {/* Custom Pill Switches matching screenshot */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {channels.map((channel) => {
                        const ChannelIcon = channel.icon
                        const enabled = eventPrefs[channel.id]
                        const switchId = `${event.id}-${channel.id}`

                        return (
                          <div
                            key={channel.id}
                            className={`flex items-center gap-2.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              enabled
                                ? "border-border bg-muted/60 text-foreground"
                                : "border-border/60 bg-background text-muted-foreground"
                            }`}
                          >
                            <ChannelIcon className="size-3.5 shrink-0 text-muted-foreground" />
                            <label htmlFor={switchId} className="cursor-pointer select-none">
                              {channel.label}
                            </label>
                            <Switch
                              id={switchId}
                              size="sm"
                              checked={enabled}
                              onCheckedChange={(checked) =>
                                updatePreference(event.id, channel.id, checked)
                              }
                              aria-label={`${event.title} via ${channel.label}`}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* Sidebar Info */}
        <aside className="space-y-6">
          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <h3 className="text-sm font-semibold">Delivery Channels</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Overview of how notifications are delivered across platforms.
            </p>

            <div className="mt-4 space-y-4">
              {channels.map((channel) => {
                const Icon = channel.icon
                return (
                  <div key={channel.id} className="flex gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="text-xs font-medium">{channel.label}</h4>
                      <p className="mt-0.5 text-xs leading-normal text-muted-foreground">
                        {channel.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </aside>
      </div>

      {/* Bottom Save Bar */}
      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-xl border bg-card/95 px-5 py-3.5 shadow backdrop-blur-xs">
        <div className="text-xs text-muted-foreground">
          {message ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="size-3.5 text-amber-500" />
              {message}
            </span>
          ) : (
            <span>Unsaved changes are stored locally.</span>
          )}
        </div>

        <Button type="button" size="sm" onClick={handleSave} className="ml-auto gap-1.5">
          {isSaved && <CheckCheck className="size-4" />}
          {isSaved ? "Saved" : "Save preferences"}
        </Button>
      </div>
    </div>
  )
}