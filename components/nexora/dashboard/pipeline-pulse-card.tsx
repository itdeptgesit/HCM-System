"use client"

import * as React from "react"
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  ChevronDownIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardFooter } from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const periods = ["This Week", "This Month", "This Quarter"] as const
type Period = (typeof periods)[number]

const stats = [
  { label: "Pipeline Value", value: "$4.82M", change: "+11.8%", trend: "up" as const },
  { label: "Conversion Rate", value: "31.6%", change: "+2.4 pts", trend: "up" as const },
  { label: "Avg. Deal Cycle", value: "34 days", change: "-6.1%", trend: "up" as const },
]

const deals: {
  name: string
  company: string
  value: string
  stage: string
  stageClass: string
}[] = [
  {
    name: "Enterprise Rollout",
    company: "Globex",
    value: "$240K",
    stage: "Won",
    stageClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  },
  {
    name: "Compliance Add-on",
    company: "Meridian Bank",
    value: "$95K",
    stage: "Review",
    stageClass:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-400",
  },
  {
    name: "Platform Renewal",
    company: "Orion Logistics",
    value: "$62K",
    stage: "Stalled",
    stageClass:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  },
]

const QUOTA_PERCENT = 82

// ---------------------------------------------------------------------------
// Radial progress ring (pure SVG, no chart lib needed)
// ---------------------------------------------------------------------------

function QuotaRing({ percent }: { percent: number }) {
  const size = 96
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative flex size-24 shrink-0 items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-semibold">{percent}%</span>
        <span className="text-[10px] text-muted-foreground">quota</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component — renamed, restructured as a two-column split
// ---------------------------------------------------------------------------

export function PipelinePulseCard() {
  const [period, setPeriod] = React.useState<Period>("This Quarter")

  return (
    <Card>
      <CardContent>
        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold">Pipeline Pulse</p>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-medium"
                />
              }
            >
              {period}
              <ChevronDownIcon className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {periods.map((p) => (
                <DropdownMenuItem key={p} onClick={() => setPeriod(p)}>
                  {p}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Split layout: quota ring (left) + stat list (right) */}
        <div className="mt-5 flex items-center gap-6">
          <QuotaRing percent={QUOTA_PERCENT} />

          <div className="flex flex-1 flex-col gap-3 border-l pl-6">
            {stats.map((stat) => {
              const isUp = stat.trend === "up"
              return (
                <div
                  key={stat.label}
                  className="flex items-center justify-between"
                >
                  <p className="text-xs text-muted-foreground">
                    {stat.label}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{stat.value}</p>
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-xs font-medium",
                        isUp
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {isUp ? (
                        <ArrowUpRightIcon className="size-3" />
                      ) : (
                        <ArrowDownRightIcon className="size-3" />
                      )}
                      {stat.change}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-5 border-t" />

        {/* Deals table-style list instead of a status timeline */}
        <div className="mt-4 bg-muted/50 p-3 rounded-lg">
          <p className="text-base font-semibold">Deals in Motion</p>

          <div className="mt-3 space-y-1 mb-2">
            {deals.map((deal) => (
              <div
                key={deal.name}
                className="flex items-center justify-between rounded-md px-2 py-1 -mx-2 hover:bg-background"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{deal.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {deal.company}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold">{deal.value}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-16 justify-center rounded-md px-2 py-0.5 text-xs font-medium",
                      deal.stageClass
                    )}
                  >
                    {deal.stage}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      {/* Footer actions */}
      <CardFooter className="gap-2 border-t">
        <Button variant="outline" className="flex-1">
          Export CSV
        </Button>
        <Button className="flex-1">Open Pipeline</Button>
      </CardFooter>
    </Card>
  )
}