import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  EVENT_TYPES,
  EVENT_TYPE_CONFIG,
  type CalendarEvent,
} from "./calendar-data"
import { draftToEvent, type EventDraft } from "./calendar-draft"

interface EventFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass a new `key` from the parent each time the sheet opens to reset the form. */
  initial: EventDraft
  onSave: (event: CalendarEvent) => void
}

export function EventFormSheet({
  open,
  onOpenChange,
  initial,
  onSave,
}: EventFormSheetProps) {
  const [draft, setDraft] = useState<EventDraft>(initial)
  const [error, setError] = useState("")

  const isEdit = Boolean(initial.id)

  const update = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setError("")
  }

  const handleSubmit = () => {
    const result = draftToEvent(draft)
    if ("error" in result) {
      setError(result.error)
      return
    }
    onSave(result.event)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex !w-full flex-col sm:!w-[400px] sm:!max-w-[400px]">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit event" : "New event"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the details of this event."
              : "Add a meeting, call, demo, task or deadline to your calendar."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              placeholder="e.g. Demo: Enterprise Rollout"
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((type) => {
                const config = EVENT_TYPE_CONFIG[type]
                const active = draft.type === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => update("type", type)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary/5 text-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* All day */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="event-all-day" className="cursor-pointer">
              All-day event
            </Label>
            <Switch
              id="event-all-day"
              checked={draft.allDay}
              onCheckedChange={(checked) => update("allDay", Boolean(checked))}
            />
          </div>

          {/* Date / time */}
          {draft.allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="event-start-date">Start date</Label>
                <Input
                  id="event-start-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => update("date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end-date">End date</Label>
                <Input
                  id="event-end-date"
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="event-date">Date</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => update("date", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="event-start-time">Start time</Label>
                  <Input
                    id="event-start-time"
                    type="time"
                    value={draft.startTime}
                    onChange={(e) => update("startTime", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-end-time">End time</Label>
                  <Input
                    id="event-end-time"
                    type="time"
                    value={draft.endTime}
                    onChange={(e) => update("endTime", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              placeholder="Office, Zoom link, phone..."
              value={draft.location}
              onChange={(e) => update("location", e.target.value)}
            />
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label htmlFor="event-attendees">Attendees</Label>
            <Input
              id="event-attendees"
              placeholder="Comma separated, e.g. Caleb Reed, Alex Morgan"
              value={draft.attendees}
              onChange={(e) => update("attendees", e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              rows={4}
              placeholder="Add notes or an agenda..."
              value={draft.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {isEdit ? "Save changes" : "Create event"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
