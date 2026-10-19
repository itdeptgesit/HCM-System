"use client"

import { DownloadIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { DashboardDateRange } from "@/components/nexora/dashboard/dashboard-date-range"

export function DashboardHeader() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Dashboard
        </h2>

        <p className="text-sm text-muted-foreground">
          Track your sales performance and pipeline activity.
        </p>
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