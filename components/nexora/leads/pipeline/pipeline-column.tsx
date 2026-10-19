"use client"

import { Link } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { buttonVariants } from "@workspace/ui/components/button"

import { statusDots, type Lead, type LeadStatus } from "../leads-data"
import { PipelineCard } from "./pipeline-card"

type PipelineColumnProps = {
  status: LeadStatus
  leads: Lead[]
  isFiltered?: boolean
}

export function PipelineColumn({ status, leads }: PipelineColumnProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/40">
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", statusDots[status])} />

          <h2 className="text-sm font-semibold">{status}</h2>

          <span className="rounded-full border bg-background px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {leads.length}
          </span>
        </div>

        <Link
          to="/leads/new"
          aria-label={`Add lead to ${status}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "size-7 text-muted-foreground",
          )}
        >
          <PlusIcon className="size-4" />
        </Link>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2">
        {leads.length > 0 ? (
          leads.map((lead) => <PipelineCard key={lead.id} lead={lead} />)
        ) : (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
            No leads in this stage
          </div>
        )}
      </div>
    </div>
  )
}