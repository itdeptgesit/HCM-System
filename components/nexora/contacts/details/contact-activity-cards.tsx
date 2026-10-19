"use client"

import {
  CalendarClockIcon,
  CheckSquareIcon,
  Clock3Icon,
  FileTextIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  VideoIcon,
  ListTodoIcon,
  EyeIcon,
  DownloadIcon,
  RefreshCwIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/badge"
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

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const activities = [
  {
    id: "1",
    type: "Call",
    date: "Jul 4, 2025 at 12:00",
    description:
      "Discussed pricing and timeline for custom integration project",
    icon: PhoneIcon,
    iconStyle: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
  },
  {
    id: "2",
    type: "Meeting",
    date: "Jun 30, 2025 at 17:50",
    description: "Met with Annual Software License",
    icon: VideoIcon,
    iconStyle: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    id: "3",
    type: "Note",
    date: "May 25, 2025 at 13:00",
    description: "Note about Enterprise Platform Migration",
    icon: FileTextIcon,
    iconStyle: "text-violet-600 bg-violet-50 dark:bg-violet-500/10",
  },
  {
    id: "4",
    type: "Follow-up",
    date: "Apr 10, 2025 at 08:15",
    description: "Follow-up with Consulting Services Package",
    icon: CalendarClockIcon,
    iconStyle: "text-amber-600 bg-amber-50 dark:bg-amber-500/10",
  },
]

const tasks = [
  {
    id: "1",
    title: "Follow up with Sarah Johnson",
    dueDate: "May 5, 2025 at 16:30",
    description:
      "Send a follow-up email to discuss the next steps for the Enterprise Platform Migration deal.",
    status: "In Progress",
    priority: "High",
    icon: CalendarClockIcon,
    iconStyle: "text-amber-600 bg-amber-50 dark:bg-amber-500/10",
  },
  {
    id: "2",
    title: "Prepare compliance documentation",
    dueDate: "Feb 20, 2025 at 11:45",
    description:
      "Compile SOC 2 and ISO 27001 compliance documents for the upcoming review.",
    status: "Todo",
    priority: "Medium",
    icon: FileTextIcon,
    iconStyle: "text-violet-600 bg-violet-50 dark:bg-violet-500/10",
  },
  {
    id: "3",
    title: "Schedule Q1 business review",
    dueDate: "Jan 15, 2025 at 09:00",
    description:
      "Arrange a quarterly business review to discuss progress, goals, and upcoming opportunities.",
    status: "Completed",
    priority: "Low",
    icon: VideoIcon,
    iconStyle: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    id: "4",
    title: "Send updated pricing proposal",
    dueDate: "Jan 10, 2025 at 14:00",
    description:
      "Share the revised pricing proposal and confirm the client's requirements.",
    status: "Todo",
    priority: "High",
    icon: ListTodoIcon,
    iconStyle: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
  },
]

const statusStyles: Record<string, string> = {
  "In Progress":
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  Todo: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
  Completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
}

const priorityStyles: Record<string, string> = {
  High: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  Medium:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Low: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
}

// ---------------------------------------------------------------------------
// Shared card header + menu
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export function ContactActivityCard() {
  return (
    <Card>
      <SectionHeader icon={Clock3Icon} title="Activity" />

      <CardContent>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Recent interactions and updates
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
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
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

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export function ContactTasksCard() {
  return (
    <Card>
      <SectionHeader icon={CheckSquareIcon} title="Tasks" />

      <CardContent>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Tasks related to this contact
          </p>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {tasks.length} tasks
          </span>
        </div>

        <div className="divide-y">
          {tasks.map((task) => {
            const Icon = task.icon

            return (
              <div
                key={task.id}
                className="flex gap-3 py-4 first:pt-2 last:pb-1"
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    task.iconStyle,
                  )}
                >
                  <Icon className="size-4" />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium leading-5",
                        task.status === "Completed" &&
                          "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </p>

                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium",
                        statusStyles[task.status],
                      )}
                    >
                      {task.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3Icon className="size-3.5 shrink-0" />
                    <span>{task.dueDate}</span>
                  </div>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {task.description}
                  </p>

                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-medium",
                      priorityStyles[task.priority],
                    )}
                  >
                    {task.priority} Priority
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}