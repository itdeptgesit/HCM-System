"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

// ---------------------------------------------------------------------------
// Colors — single source of truth, legend dots pull from the same values as bars
// ---------------------------------------------------------------------------

// const stageColors = {
//   qualified: "#7dd3fc",
//   proposal: "#38bdf8",
//   negotiation: "#0284c7",
// } as const

const stageColors = {
  qualified: "color-mix(in srgb, var(--primary) 35%, transparent)",
  proposal: "color-mix(in srgb, var(--primary) 65%, transparent)",
  negotiation: "var(--primary)",
} as const

const legend = [
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
] as const

// ---------------------------------------------------------------------------
// Data per range
// ---------------------------------------------------------------------------

type ChartPoint = {
  label: string
  qualified: number
  proposal: number
  negotiation: number
}

const dataByRange: Record<Range, ChartPoint[]> = {
  week: [
  { label: "Mon", qualified: 6, proposal: 3, negotiation: 2 },
  { label: "Tue", qualified: 2, proposal: 5, negotiation: 1 },
  { label: "Wed", qualified: 7, proposal: 2, negotiation: 4 },
  { label: "Thu", qualified: 4, proposal: 6, negotiation: 2 },
  { label: "Fri", qualified: 8, proposal: 3, negotiation: 5 },
  { label: "Sat", qualified: 3, proposal: 1, negotiation: 2 },
  { label: "Sun", qualified: 5, proposal: 2, negotiation: 1 },
],
  month: [
    { label: "Jan", qualified: 8, proposal: 5, negotiation: 3 },
    { label: "Feb", qualified: 10, proposal: 6, negotiation: 4 },
    { label: "Mar", qualified: 9, proposal: 7, negotiation: 4 },
    { label: "Apr", qualified: 13, proposal: 8, negotiation: 5 },
    { label: "May", qualified: 11, proposal: 9, negotiation: 6 },
    { label: "Jun", qualified: 12, proposal: 8, negotiation: 5 },
    { label: "Jul", qualified: 15, proposal: 10, negotiation: 6 },
    { label: "Aug", qualified: 18, proposal: 12, negotiation: 9 },
    { label: "Sep", qualified: 14, proposal: 16, negotiation: 11 },
    { label: "Oct", qualified: 16, proposal: 14, negotiation: 10 },
    { label: "Nov", qualified: 19, proposal: 15, negotiation: 12 },
    { label: "Dec", qualified: 21, proposal: 17, negotiation: 13 },
  ],
  year: [
    { label: "2021", qualified: 62, proposal: 40, negotiation: 22 },
    { label: "2022", qualified: 78, proposal: 52, negotiation: 31 },
    { label: "2023", qualified: 95, proposal: 68, negotiation: 40 },
    { label: "2024", qualified: 121, proposal: 84, negotiation: 55 },
    { label: "2025", qualified: 148, proposal: 101, negotiation: 67 },
    { label: "2026", qualified: 172, proposal: 118, negotiation: 79 },
  ],
}

const rateByRange: Record<Range, { value: number; change: string }> = {
  week: { value: 68, change: "+4%" },
  month: { value: 76, change: "+12%" },
  year: { value: 81, change: "+9%" },
}

const ranges = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
] as const
type Range = (typeof ranges)[number]["value"]

function StageTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; dataKey: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs">
          {entry.dataKey}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

export function DealVelocityCard() {
  const [range, setRange] = React.useState<Range>("month")

  const data = dataByRange[range]
  const rate = rateByRange[range]

  const compareLabel =
    range === "week" ? "last week" : range === "month" ? "last month" : "last year"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <p className="text-sm font-semibold">Deal Velocity</p>

        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList className="h-8">
              {ranges.map((r) => (
                <TabsTrigger
                  key={r.value}
                  value={r.value}
                  className="px-2.5 text-xs"
                >
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent>
        {/* Value + legend row (horizontal) */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold tracking-tight">
              {rate.value}%
            </p>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {rate.change} vs {compareLabel}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {legend.map((item) => (
              <div key={item.key} className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: stageColors[item.key] }}
                />
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stacked bar chart */}
        <div className="mt-3 h-44 sm:h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barSize={20} barGap={2} barCategoryGap="30%">
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                content={<StageTooltip />}
                cursor={{ fill: "var(--muted)", opacity: 0.3 }}
              />
              <Bar
                dataKey="qualified"
                stackId="stage"
                fill={stageColors.qualified}
                radius={[0, 0, 4, 4]}
              />
              <Bar
                dataKey="proposal"
                stackId="stage"
                fill={stageColors.proposal}
              />
              <Bar
                dataKey="negotiation"
                stackId="stage"
                fill={stageColors.negotiation}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}