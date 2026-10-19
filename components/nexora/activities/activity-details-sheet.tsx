
"use client"

import type { LucideIcon } from "lucide-react"
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock3,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  UserRound,
  Video,
  Hash,
  ArrowUpRight,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"

import {
  activityTypeStyles,
  activityStatusStyles,
  activityPriorityStyles,
  type Activity,
  type ActivityType,
} from "./activity-data"

type ActivityDetailsSheetProps = {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: (activity: Activity) => void
}

const activityIcons: Record<ActivityType, LucideIcon> = {
  Call: Phone,
  Meeting: Video,
  Email: Mail,
  Task: CheckSquare,
  Note: NotebookPen,
}

const activityIconColors: Record<ActivityType, string> = {
  Call: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  Meeting:
    "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  Email: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  Task:
    "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  Note: "bg-muted text-muted-foreground",
}

const priorityDotColors = {
  Low: "bg-muted-foreground",
  Medium: "bg-amber-500",
  High: "bg-red-500",
}

function formatDate(date: string) {
  if (!date) return "—"

  const parsedDate = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsedDate.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate)
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")
}

function DetailItem({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70">
        <Icon className="size-4 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="break-words text-sm font-medium">{children}</div>
      </div>
    </div>
  )
}

export function ActivityDetailsSheet({
  activity,
  open,
  onOpenChange,
  onComplete,
}: ActivityDetailsSheetProps) {
  if (!activity) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg" />
      </Sheet>
    )
  }

  const ActivityIcon = activityIcons[activity.type]
  const initials = getInitials(activity.owner || "Unassigned")
  const isCompleted = activity.status === "Completed"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex !w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        {/* Header */}
        <SheetHeader className="border-b px-4 py-4 sm:px-4">
          <div className="flex items-start gap-3 pr-7">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${activityIconColors[activity.type]}`}
            >
              <ActivityIcon className="size-5" />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${activityTypeStyles[activity.type]}`}
                >
                  {activity.type}
                </span>

                <span
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${activityStatusStyles[activity.status]}`}
                >
                  {activity.status}
                </span>
              </div>

              <SheetTitle className="text-xl leading-snug">
                {activity.title}
              </SheetTitle>

              <SheetDescription className="text-sm">
                Activity details and related information.
              </SheetDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <Hash className="size-3.5" />
            <span>
              Activity ID: {activity.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 space-y-4 px-4 py-4 sm:px-4">
          {/* Description */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Overview</h3>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${activityPriorityStyles[activity.priority]}`}
              >
                <span
                  className={`size-2 rounded-full ${priorityDotColors[activity.priority]}`}
                />
                {activity.priority} Priority
              </span>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {activity.description || "No description provided."}
              </p>
            </div>
          </section>

          {/* Schedule */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Schedule</h3>

            <div className="grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-2">
              <DetailItem icon={CalendarDays} label="Date">
                {formatDate(activity.date)}
              </DetailItem>

              <DetailItem icon={Clock3} label="Time & Duration">
                {activity.time || "Not scheduled"}
                {activity.durationMinutes
                  ? ` · ${activity.durationMinutes} min`
                  : ""}
              </DetailItem>
            </div>
          </section>

          {/* Owner */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Assigned To</h3>

            <div className="flex items-center gap-3 rounded-xl border p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials || <UserRound className="size-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {activity.owner || "Unassigned"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Activity owner
                </p>
              </div>

              <UserRound className="size-4 text-muted-foreground" />
            </div>
          </section>

          {/* Related Record */}
          {activity.relatedTo && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Related Record</h3>

              <div className="flex items-center gap-3 rounded-xl border p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="size-4 text-muted-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {activity.relatedTo.type}
                  </p>
                  <p className="truncate text-sm font-semibold">
                    {activity.relatedTo.name}
                  </p>
                </div>

                <ArrowUpRight className="size-4 text-muted-foreground" />
              </div>
            </section>
          )}

          {/* Location */}
          {activity.location && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Location</h3>

              <div className="flex items-center gap-3 rounded-xl border p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <MapPin className="size-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{activity.location}</p>
              </div>
            </section>
          )}

          {/* Outcome */}
          {activity.outcome && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Outcome</h3>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                <div className="mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  <span className="text-xs font-semibold">Activity Outcome</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {activity.outcome}
                </p>
              </div>
            </section>
          )}

          {/* Completion state */}
          {isCompleted && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              This activity has been completed.
            </div>
          )}
        </div>

        {/* Footer */}
        {!isCompleted && onComplete && (
          <div className="sticky bottom-0 mt-auto border-t bg-background px-4 py-4 sm:px-4">
            <Button
              className="w-full"
              onClick={() => {
                onComplete(activity)
                onOpenChange(false)
              }}
            >
              <CheckCircle2 className="mr-2 size-4" />
              Mark as Completed
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}