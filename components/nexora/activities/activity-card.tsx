"use client"

import { Phone, Mail, Calendar, CheckSquare, FileText, MoreHorizontal, CheckCircle, Trash2, Eye } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import type { Activity } from "./activity-data"

interface ActivityCardProps {
  activity: Activity
  onView: (activity: Activity) => void
  onComplete: (activity: Activity) => void
  onDelete: (activity: Activity) => void
}

const activityIcons = {
  Call: Phone,
  Email: Mail,
  Meeting: Calendar,
  Task: CheckSquare,
  Note: FileText,
}

const activityStyles = {
  Call: "bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-500/20",
  Email: "bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20",
  Meeting: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20",
  Task: "bg-purple-500/10 text-purple-600 dark:text-purple-400 dark:bg-purple-500/20",
  Note: "bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-500/20",
}

export function ActivityCard({ activity, onView, onComplete, onDelete }: ActivityCardProps) {
  const Icon = activityIcons[activity.type] || FileText
  const iconStyle = activityStyles[activity.type] || "bg-muted text-muted-foreground"

  return (
    <div className="group relative flex items-start justify-between gap-4 rounded-lg border p-4 bg-card hover:bg-accent/40 transition-colors">
      <div className="flex items-start gap-3.5 min-w-0">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconStyle}`}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onView(activity)}
              className="text-sm font-semibold hover:underline text-left truncate"
            >
              {activity.title}
            </button>
            <Badge
              variant={
                activity.status === "Completed"
                  ? "secondary"
                  : activity.status === "Overdue"
                  ? "destructive"
                  : "outline"
              }
              className="text-[11px] px-2 py-0 h-5 font-normal"
            >
              {activity.status}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-1">
            {activity.description}
          </p>

          {activity.relatedTo && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <span className="font-medium text-foreground">{activity.relatedTo.type}:</span>
              <span className="hover:underline cursor-pointer">{activity.relatedTo.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex flex-col items-end text-xs text-muted-foreground gap-1">
          <span>{activity.date}</span>
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src="" />
              <AvatarFallback className="text-[10px]">
                {activity.owner?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{activity.owner}</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(activity)}>
              <Eye className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            {activity.status !== "Completed" && (
              <DropdownMenuItem onClick={() => onComplete(activity)}>
                <CheckCircle className="mr-2 h-4 w-4" /> Mark Completed
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(activity)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}