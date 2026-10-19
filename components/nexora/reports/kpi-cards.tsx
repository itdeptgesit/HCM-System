
import {
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  CalendarCheck,
  Timer,
  UserPlus,
  type LucideIcon,
} from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"

import { Card, CardContent } from "@workspace/ui/components/card"

// -----------------------------------------------------------------------------
// KPI Data
// -----------------------------------------------------------------------------

const KPI_DATA = [
  {
    id: "new-leads",
    label: "New Leads",
    value: "428",
    change: 12.4,
    icon: UserPlus,
    colorHex: "#3b82f6",
    iconBg: "bg-blue-600 dark:bg-blue-500",    // Blue
    invert: false,
    spark: [42, 38, 45, 51, 48, 56, 53, 61, 58, 67, 72, 78],
  },
  {
    id: "at-risk",
    label: "At-risk Deals",
    value: "18",
    change: -6.1,
    icon: AlertTriangle,
    colorHex: "#f59e0b",
    iconBg: "bg-amber-600 dark:bg-amber-500",   // Orange
    invert: true,
    spark: [38, 35, 42, 32, 36, 30, 34, 28, 26, 24, 20, 18],
  },
  {
    id: "sales-cycle",
    label: "Average Sales Cycle",
    value: "24 days",
    change: -3.5,
    icon: Timer,
    colorHex: "#8b5cf6",
    iconBg: "bg-purple-600 dark:bg-purple-500", // Purple
    invert: true,
    spark: [68, 74, 71, 82, 79, 88, 94, 91, 103, 108, 116, 124],
  },
   {
    id: "activities",
    label: "Activities Completed",
    value: "1,284",
    change: 8.2,
    icon: CalendarCheck,
    colorHex: "#e60076",
    iconBg: "bg-pink-600 dark:bg-pink-500", // Green
    invert: false,
    spark: [30, 25, 35, 32, 40, 36, 48, 42, 53, 49, 58, 65],
  },
]

// -----------------------------------------------------------------------------
// Recharts Sparkline
// -----------------------------------------------------------------------------

function RechartsSparkline({
  id,
  values,
  colorHex,
}: {
  id: string
  values: number[]
  colorHex: string
}) {
  if (values.length < 2) return null

  const chartData = values.map((val, idx) => ({
    index: idx,
    value: val,
  }))

  const gradientId = `kpi-gradient-${id}`

  return (
    <div className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={colorHex}
                stopOpacity={0.2}
              />
              <stop
                offset="100%"
                stopColor={colorHex}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <Area
            type="monotone"
            dataKey="value"
            stroke={colorHex}
            strokeWidth={1.8}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Trend Badge
// -----------------------------------------------------------------------------

function TrendBadge({
  change,
}: {
  change: number
}) {
  const isUp = change > 0
  const isFlat = change === 0

  const color = isFlat
    ? "bg-muted text-muted-foreground"
    : isUp
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
      : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"

  const Arrow = isUp ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-medium ${color}`}
    >
      {!isFlat && <Arrow className="size-3.5" />}
      {Math.abs(change)}%
    </span>
  )
}

// -----------------------------------------------------------------------------
// KPI Cards
// -----------------------------------------------------------------------------

export function KpiCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {KPI_DATA.map((kpi) => {
        const Icon: LucideIcon = kpi.icon

        return (
          <Card
            key={kpi.id}
          >
            <CardContent>
              {/* Icon and Trend */}
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg border border-border p-0.5 shadow">
                  <div
                    className={`flex size-full items-center justify-center rounded-md text-white ${kpi.iconBg}`}
                  >
                    <Icon className="size-5" />
                  </div>
                </div>

                <TrendBadge
                  change={kpi.change}
                />
              </div>

              {/* KPI Value */}
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {kpi.label}
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                  {kpi.value}
                </p>
              </div>

              {/* Recharts Sparkline */}
              <div className="mt-auto pt-1">
                <RechartsSparkline
                  id={kpi.id}
                  values={kpi.spark}
                  colorHex={kpi.colorHex}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
