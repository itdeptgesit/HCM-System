"use client"

import { DownloadIcon, EyeIcon, MoreHorizontalIcon, RefreshCwIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

// ---------------------------------------------------------------------------
// Data — CRM contacts by lifecycle stage
// ---------------------------------------------------------------------------

const stages = [
  { name: "Lead", value: 86, color: "#94a3b8" },
  { name: "Contacted", value: 64, color: "#60a5fa" },
  { name: "Qualified", value: 48, color: "#a78bfa" },
  { name: "Proposal", value: 32, color: "#fbbf24" },
  { name: "Customer", value: 24, color: "#34d399" },
]

const max = Math.max(...stages.map((s) => s.value))

export function LifecycleCard() {
  return (
    <Card>
      <CardContent>
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Sales Lifecycle</p>

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
        </div>

        {/* Rows */}
        <div className="mt-4 space-y-2.5">
          {stages.map((stage) => (
            <div key={stage.name} className="flex items-center gap-3">
              <div className="flex w-28 shrink-0 items-center gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />

                <span className="truncate text-xs font-medium">
                  {stage.name}
                </span>
              </div>

              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(stage.value / max) * 100}%`,
                    backgroundColor: stage.color,
                  }}
                />
              </div>

              <span className="w-6 shrink-0 text-right text-sm font-medium text-muted-foreground">
                {stage.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}