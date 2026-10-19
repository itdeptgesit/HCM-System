"use client"

import { ArrowDownRightIcon, ArrowUpRightIcon, MoreHorizontalIcon, EyeIcon,
  DownloadIcon,
  RefreshCwIcon, } from "lucide-react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

const sourced = [
  { name: "Outbound", value: 412000, color: "#7c3aed", change: "+6%", trend: "up" as const },
  { name: "Referral", value: 218000, color: "#22c55e", change: "+14%", trend: "up" as const },
  { name: "Inbound", value: 156000, color: "#3b82f6", change: "-3%", trend: "down" as const },
  { name: "Partner", value: 56000, color: "#94a3b8", change: "+2%", trend: "up" as const },
]

const total = sourced.reduce((sum, item) => sum + item.value, 0)
const topChannel = sourced.reduce((a, b) => (a.value > b.value ? a : b))

function formatK(value: number) {
  return `$${Math.round(value / 1000)}K`
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name: string; value: number }[]
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md">
      <p className="text-xs font-medium">{item.name}</p>
      <p className="text-xs text-muted-foreground">{formatK(item.value)}</p>
    </div>
  )
}

export function SourcedPipeline() {
  return (
  <Card>
    <CardContent>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Sourced Pipeline</p>

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
            <DropdownMenuItem className="gap-2" onClick={() => {}}>
              <EyeIcon className="size-4" />
              <span>View Details</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2" onClick={() => {}}>
              <DownloadIcon className="size-4" />
              <span>Export Data</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2" onClick={() => {}}>
              <RefreshCwIcon className="size-4" />
              <span>Refresh</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

        <div className="mt-4 grid items-center gap-5 sm:grid-cols-[auto_1fr] sm:gap-6 lg:grid-cols-[auto_auto_1fr]">
          {/* Donut */}
          <div className="relative size-36 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourced}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={60}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {sourced.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>

                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">
                Sourced
              </span>

              <span className="text-lg font-semibold">
                {formatK(total)}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="min-w-0 space-y-3">
            {sourced.map((item) => {
              const isUp = item.trend === "up"

              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />

                    <span className="text-sm">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="w-9 text-right text-sm font-medium text-muted-foreground">
                      {Math.round((item.value / total) * 100)}%
                    </span>

                    <span
                      className={cn(
                        "flex w-12 items-center justify-end gap-0.5 text-xs font-medium",
                        isUp
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {isUp ? (
                        <ArrowUpRightIcon className="size-3" />
                      ) : (
                        <ArrowDownRightIcon className="size-3" />
                      )}

                      {item.change}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Insight panel — desktop only */}
          <div className="hidden min-w-0 border-l pl-6 lg:flex lg:flex-col lg:justify-center">
            <p className="text-xs text-muted-foreground">
              Top channel
            </p>

            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {topChannel.name}
            </p>

            <p className="mt-1 max-w-[220px] text-xs leading-5 text-muted-foreground">
              {Math.round((topChannel.value / total) * 100)}% of sourced
              pipeline this period — up {topChannel.change} vs. last
              period.
            </p>
          </div>
        </div>
    </CardContent>
  </Card>
)
}