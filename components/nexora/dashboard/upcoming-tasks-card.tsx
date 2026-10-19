"use client"

import * as React from "react"
import {
  CalendarIcon,
  CheckCircle2Icon,
  MoreHorizontalIcon,
  PhoneIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

// ---------------------------------------------------------------------------
// Data — today's tasks & meetings
// ---------------------------------------------------------------------------

type TaskKind = "call" | "meeting" | "task"

const initialItems: {
  id: string
  kind: TaskKind
  title: string
  subtitle: string
  time: string
  done?: boolean
}[] = [
  {
    id: "1",
    kind: "meeting",
    title: "QBR — Globex",
    subtitle: "Quarterly business review",
    time: "9:00 AM",
  },
  {
    id: "2",
    kind: "call",
    title: "Follow-up call",
    subtitle: "Meridian Bank — compliance add-on",
    time: "11:30 AM",
  },
  {
    id: "3",
    kind: "task",
    title: "Send proposal",
    subtitle: "Orion Logistics renewal",
    time: "1:00 PM",
    done: true,
  },
  {
    id: "4",
    kind: "meeting",
    title: "Demo — Northwind Traders",
    subtitle: "Discovery call with Emily Watson",
    time: "2:30 PM",
  },
  {
    id: "5",
    kind: "task",
    title: "Update CRM notes",
    subtitle: "Cobalt Health — pilot expansion",
    time: "4:00 PM",
  },
  {
    id: "6",
    kind: "call",
    title: "Check-in call",
    subtitle: "Vantage Retail — onboarding",
    time: "5:00 PM",
  },
]

const kindIconMap: Record<TaskKind, { icon: React.ElementType; className: string }> = {
  call: { icon: PhoneIcon, className: "text-blue-600 bg-blue-50 dark:bg-blue-500/10" },
  meeting: { icon: UsersIcon, className: "text-violet-600 bg-violet-50 dark:bg-violet-500/10" },
  task: { icon: CheckCircle2Icon, className: "text-amber-600 bg-amber-50 dark:bg-amber-500/10" },
}

export function UpcomingTasksCard() {
  const [tasks, setTasks] = React.useState(initialItems)
  const [checked, setChecked] = React.useState<Record<string, boolean>>(
    Object.fromEntries(initialItems.map((i) => [i.id, !!i.done]))
  )

  const pendingCount = tasks.filter((i) => !checked[i.id]).length

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Today's Schedule</p>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {pendingCount} left
          </span>
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
              <PlusIcon className="size-4" />
              <span>Add Task</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2">
              <CalendarIcon className="size-4" />
              <span>View Calendar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        <div className="divide-y">
          {tasks.map((item) => {
            const { icon: Icon, className } = kindIconMap[item.kind]
            const isChecked = checked[item.id]

            return (
              <div key={item.id} className="group flex items-center gap-3 py-3">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    className
                  )}
                >
                  <Icon className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      isChecked && "text-muted-foreground line-through"
                    )}
                  >
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {item.time}
                  </span>

                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(value) =>
                      setChecked((prev) => ({ ...prev, [item.id]: !!value }))
                    }
                  />

                  {isChecked && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-red-600"
                      onClick={() => removeTask(item.id)}
                      aria-label="Delete task"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}

          {tasks.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tasks scheduled for today.
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="border-t bg-background">
        <Button variant="outline" className="w-full gap-1.5">
          <CalendarIcon className="size-3.5" />
          View full calendar
        </Button>
      </CardFooter>
    </Card>
  )
}