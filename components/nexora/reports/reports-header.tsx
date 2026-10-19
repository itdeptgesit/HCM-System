"use client"

import {
  DownloadIcon,
  RefreshCw,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { DashboardDateRange } from "@/components/nexora/dashboard/dashboard-date-range"

export function ReportsHeader() {
  return (
    <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Title */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Reports
          </h1>

          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          Monitor sales performance, pipeline health and team results.
        </p>

        <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <RefreshCw className="size-3.5" />
            Updated 6 minutes ago
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <DashboardDateRange />

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <DownloadIcon className="size-4" />
          <span>Export</span>
        </Button>
      </div>
    </div>
  )
}