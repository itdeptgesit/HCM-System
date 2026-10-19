
"use client"

import { CalendarDays, ClipboardList } from "lucide-react"

import { ActivityCard } from "./activity-card"
import type { Activity } from "./activity-data"

type ActivitiesListProps = {
  activities: Activity[]
  onView?: (activity: Activity) => void
  onComplete?: (activity: Activity) => void
  onDelete?: (activity: Activity) => void
}

function formatGroupDate(date: string) {
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

export function ActivitiesList({
  activities,
  onView,
  onComplete,
  onDelete,
}: ActivitiesListProps) {
  if (activities.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 px-6 py-12 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <ClipboardList className="size-6 text-muted-foreground" />
        </div>

        <h3 className="text-sm font-semibold">No activities found</h3>

        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          There are no activities matching your current filters.
          Try changing your search or filters.
        </p>
      </div>
    )
  }

  const groupedActivities = Object.entries(
    activities.reduce<Record<string, Activity[]>>((groups, activity) => {
      const date = activity.date

      if (!groups[date]) {
        groups[date] = []
      }

      groups[date].push(activity)

      return groups
    }, {})
  ).sort(([dateA], [dateB]) => dateB.localeCompare(dateA))

  return (
    <div className="flex flex-col gap-7">
      {groupedActivities.map(([date, dateActivities]) => (
        <section key={date} className="space-y-4">
          {/* Date heading */}
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg border bg-card">
              <CalendarDays className="size-4 text-muted-foreground" />
            </div>

            <h2 className="text-sm font-semibold">
              {formatGroupDate(date)}
            </h2>

            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {dateActivities.length}
            </span>
          </div>

          {/* Vertical timeline */}
          <div className="space-y-0">
            {dateActivities.map((activity, index) => {
              const isLast = index === dateActivities.length - 1

              return (
                <div
                  key={activity.id}
                  className="relative flex gap-3 sm:gap-4"
                >
                  {/* Timeline dot and connector */}
                  <div className="relative flex w-10 shrink-0 justify-center">
                    {!isLast && (
                      <div className="absolute bottom-0 top-7 w-px bg-border" />
                    )}

                    <span className="relative z-10 mt-3 size-2.5 rounded-full border-2 border-muted-foreground/40 bg-background" />
                  </div>

                  {/* Activity card */}
                  <div className="min-w-0 flex-1 pb-4">
                    <ActivityCard
                      activity={activity}
                      onView={(item) => onView?.(item)}
                      onComplete={(item) => onComplete?.(item)}
                      onDelete={(item) => onDelete?.(item)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}