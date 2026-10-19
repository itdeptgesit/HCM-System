"use client"

import { EyeIcon, MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { initials, scoreColor, type Lead } from "../leads-data"

export function PipelineCard({ lead }: { lead: Lead }) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">
              {initials(lead.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{lead.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {lead.company}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-muted-foreground"
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-40 rounded-xl p-2">
            <DropdownMenuItem className="gap-2">
              <EyeIcon className="size-4" />
              <span>View</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2">
              <PencilIcon className="size-4" />
              <span>Edit</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600">
              <TrashIcon className="size-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", scoreColor(lead.score))}
            style={{ width: `${lead.score}%` }}
          />
        </div>

        <span className="text-xs font-medium text-muted-foreground">
          {lead.score}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className="rounded-md px-1.5 py-0 text-[11px] font-normal"
        >
          {lead.source}
        </Badge>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{lead.lastActivity}</span>

          <Avatar className="size-5">
            <AvatarFallback className="text-[9px]">
              {initials(lead.owner.name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  )
}