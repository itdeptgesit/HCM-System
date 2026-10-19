"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

// ---------------------------------------------------------------------------
// Data per range
// ---------------------------------------------------------------------------

type ChartPoint = { month: string; revenue: number }

const dataByRange: Record<Range, ChartPoint[]> = {
  Weekly: [
    { month: "Mon", revenue: 3200 },
    { month: "Tue", revenue: 4100 },
    { month: "Wed", revenue: 3800 },
    { month: "Thu", revenue: 5200 },
    { month: "Fri", revenue: 4600 },
    { month: "Sat", revenue: 2100 },
    { month: "Sun", revenue: 1800 },
  ],
  Monthly: [
    { month: "Jan", revenue: 18400 },
    { month: "Feb", revenue: 22100 },
    { month: "Mar", revenue: 19800 },
    { month: "Apr", revenue: 27300 },
    { month: "May", revenue: 24600 },
    { month: "Jun", revenue: 31200 },
    { month: "Jul", revenue: 28500 },
    { month: "Aug", revenue: 33900 },
  ],
  Yearly: [
    { month: "2022", revenue: 214000 },
    { month: "2023", revenue: 268000 },
    { month: "2024", revenue: 312000 },
    { month: "2025", revenue: 358000 },
    { month: "2026", revenue: 421000 },
  ],
}

const rateByRange: Record<Range, { change: string; comparePeriod: string }> = {
  Weekly: { change: "+4.8%", comparePeriod: "last week" },
  Monthly: { change: "+9.6%", comparePeriod: "last month" },
  Yearly: { change: "+17.6%", comparePeriod: "last year" },
}

const ranges = ["Weekly", "Monthly", "Yearly"] as const
type Range = (typeof ranges)[number]

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg bg-foreground px-3 py-2 text-background shadow-lg">
      <p className="text-xs text-background/70">{label}</p>
      <p className="text-sm font-semibold">
        ${payload[0].value.toLocaleString()}
      </p>
    </div>
  )
}

function formatTotal(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value}`
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SalesOverviewCard() {
  const [range, setRange] = React.useState<Range>("Monthly")

  const data = dataByRange[range]
  const rate = rateByRange[range]
  const total = data[data.length - 1].revenue

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Sales Overview</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-2xl font-semibold tracking-tight">
              {formatTotal(total)}
            </p>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {rate.change} vs. {rate.comparePeriod}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="sm" className="gap-1.5" />}
          >
            {range}
            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ranges.map((r) => (
              <DropdownMenuItem key={r} onClick={() => setRange(r)}>
                {r}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={145}>
          <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />

            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              dy={8}
            />

            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
            />

            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#revenueFill)"
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}