"use client"

import { Link } from "@tanstack/react-router"
import { LayoutGridIcon, ListIcon, PlusIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"

export function PipelineHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>

        <p className="text-sm text-muted-foreground">
          Track every lead as it moves through your sales stages.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5">
          <Link
            to="/leads"
            className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ListIcon className="size-3.5" />
            List
          </Link>

          <span className="flex items-center gap-1.5 rounded bg-background px-2.5 py-1 text-xs font-medium shadow-sm">
            <LayoutGridIcon className="size-3.5" />
            Board
          </span>
        </div>

        <Link to="/leads/new" className={buttonVariants()}>
          <PlusIcon className="size-4" />
          Add Lead
        </Link>
      </div>
    </div>
  )
}