
"use client"

import { useState, type FormEvent } from "react"
import { Plus } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"

import type {
  Activity,
  ActivityType,
  ActivityPriority,
  RelatedEntityType,
} from "./activity-data"

type CreateActivitySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (activity: Omit<Activity, "id">) => void
}

type ActivityFormValues = {
  title: string
  description: string
  outcome: string
  type: ActivityType
  priority: ActivityPriority
  date: string
  time: string
  duration: string
  owner: string
  relatedType: RelatedEntityType | ""
  relatedName: string
  location: string
}

const initialValues: ActivityFormValues = {
  title: "",
  description: "",
  outcome: "",
  type: "Task",
  priority: "Medium",
  date: new Date().toLocaleDateString("en-CA"),
  time: "",
  duration: "",
  owner: "",
  relatedType: "",
  relatedName: "",
  location: "",
}

export function CreateActivitySheet({
  open,
  onOpenChange,
  onCreate,
}: CreateActivitySheetProps) {
  const [form, setForm] = useState<ActivityFormValues>(initialValues)

  const updateField = <K extends keyof ActivityFormValues>(
    field: K,
    value: ActivityFormValues[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const activity: Omit<Activity, "id"> = {
      title: form.title.trim(),
      description: form.description.trim(),
      outcome: form.outcome.trim() || undefined,
      type: form.type,
      status: "Upcoming",
      priority: form.priority,
      date: form.date,
      time: form.time || undefined,
      durationMinutes: form.duration
        ? Number(form.duration)
        : undefined,
      owner: form.owner.trim(),
      relatedTo:
        form.relatedType && form.relatedName.trim()
          ? {
              type: form.relatedType,
              name: form.relatedName.trim(),
            }
          : undefined,
      location: form.location.trim() || undefined,
    }

    onCreate(activity)
    setForm(initialValues)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex !w-full flex-col gap-0 overflow-y-auto !sm:max-w-2xl">
        <SheetHeader className="border-b px-6 pb-5 pt-5">
          <SheetTitle>Create Activity</SheetTitle>
          <SheetDescription>
            Add a call, meeting, email, task, or note to your activity timeline.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-6 px-6 py-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="activity-title">Title</Label>
              <Input
                id="activity-title"
                placeholder="e.g. Follow up with client"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                required
              />
            </div>

            {/* Activity Type and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="activity-type">Activity Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    updateField("type", value as ActivityType)
                  }
                >
                  <SelectTrigger id="activity-type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Call">Call</SelectItem>
                    <SelectItem value="Meeting">Meeting</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Task">Task</SelectItem>
                    <SelectItem value="Note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity-priority">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) =>
                    updateField("priority", value as ActivityPriority)
                  }
                >
                  <SelectTrigger id="activity-priority" className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="activity-description">Description</Label>
              <Textarea
                id="activity-description"
                placeholder="Add activity details..."
                value={form.description}
                onChange={(e) =>
                  updateField("description", e.target.value)
                }
                rows={3}
              />
            </div>

            {/* Outcome */}
            <div className="space-y-2">
              <Label htmlFor="activity-outcome">Outcome</Label>
              <Textarea
                id="activity-outcome"
                placeholder="Record the expected or actual outcome..."
                value={form.outcome}
                onChange={(e) =>
                  updateField("outcome", e.target.value)
                }
                rows={3}
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="activity-date">Date</Label>
                <Input
                  id="activity-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity-time">Time</Label>
                <Input
                  id="activity-time"
                  type="time"
                  value={form.time}
                  onChange={(e) => updateField("time", e.target.value)}
                />
              </div>
            </div>

            {/* Duration and Owner */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="activity-duration">
                  Duration (minutes)
                </Label>
                <Input
                  id="activity-duration"
                  type="number"
                  min="1"
                  placeholder="e.g. 30"
                  value={form.duration}
                  onChange={(e) =>
                    updateField("duration", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity-owner">Owner</Label>
                <Input
                  id="activity-owner"
                  placeholder="e.g. Virendra"
                  value={form.owner}
                  onChange={(e) => updateField("owner", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Related To */}
            <div className="space-y-2">
              <Label>Related To</Label>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={form.relatedType || "none"}
                  onValueChange={(value) => {
                    const relatedType =
                      value === "none"
                        ? ""
                        : (value as RelatedEntityType)

                    updateField("relatedType", relatedType)
                    if (!relatedType) {
                      updateField("relatedName", "")
                    }
                  }}
                >
                  <SelectTrigger
                    aria-label="Related entity type"
                    className="w-full"
                  >
                    <SelectValue placeholder="No relation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No relation</SelectItem>
                    <SelectItem value="Lead">Lead</SelectItem>
                    <SelectItem value="Contact">Contact</SelectItem>
                    <SelectItem value="Company">Company</SelectItem>
                    <SelectItem value="Deal">Deal</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Name"
                  value={form.relatedName}
                  onChange={(e) =>
                    updateField("relatedName", e.target.value)
                  }
                  disabled={!form.relatedType}
                />
              </div>
            </div>

            {/* Meeting Location */}
            {form.type === "Meeting" && (
              <div className="space-y-2">
                <Label htmlFor="activity-location">Location</Label>
                <Input
                  id="activity-location"
                  placeholder="Meeting location or link"
                  value={form.location}
                  onChange={(e) =>
                    updateField("location", e.target.value)
                  }
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <SheetFooter className="sticky bottom-0 mt-auto border-t bg-background px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button type="submit">
              <Plus className="mr-2 size-4" />
              Create Activity
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}