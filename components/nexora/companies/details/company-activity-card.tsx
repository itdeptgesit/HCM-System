"use client"

import {
  CalendarClockIcon,
  Clock3Icon,
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  RefreshCwIcon,
  VideoIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

const activities = [
  {
    id: "1",
    type: "Call",
    date: "Dec 28, 2025 at 10:15",
    description: "Quarterly check-in with the account team",
    icon: PhoneIcon,
    iconStyle: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
  },
  {
    id: "2",
    type: "Meeting",
    date: "Dec 20, 2025 at 14:00",
    description: "Renewal discussion with procurement",
    icon: VideoIcon,
    iconStyle: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    id: "3",
    type: "Note",
    date: "Dec 10, 2025 at 09:30",
    description: "Logged expansion interest for Q1",
    icon: FileTextIcon,
    iconStyle: "text-violet-600 bg-violet-50 dark:bg-violet-500/10",
  },
]

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType
  title: string
}) {
  return (
    <CardHeader className="flex flex-row items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <p className="text-sm font-semibold">{title}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
            />
          }
        >
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44 rounded-xl p-2">
          <DropdownMenuItem className="gap-2">
            <EyeIcon className="size-4" />
            <span>View Details</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="gap-2">
            <DownloadIcon className="size-4" />
            <span>Export Data</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="gap-2">
            <RefreshCwIcon className="size-4" />
            <span>Refresh</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </CardHeader>
  )
}

export function CompanyActivityCard() {
  return (
    <Card>
      <SectionHeader icon={Clock3Icon} title="Activity" />

      <CardContent>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Recent interactions with this company
          </p>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {activities.length} total
          </span>
        </div>

        <div className="divide-y">
          {activities.map((activity) => {
            const Icon = activity.icon

            return (
              <div
                key={activity.id}
                className="flex gap-3 py-4 first:pt-2 last:pb-1"
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    activity.iconStyle,
                  )}
                >
                  <Icon className="size-4" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-medium">
                      {activity.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {activity.date}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {activity.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}