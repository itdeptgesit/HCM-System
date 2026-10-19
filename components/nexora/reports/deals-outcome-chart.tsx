import { useId } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { Card } from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"

// -----------------------------------------------------------------------------
// Data
// -----------------------------------------------------------------------------

interface OutcomePoint {
  label: string
  won: number
  lost: number
}

const dealOutcomeData: OutcomePoint[] = [
  { label: "Jan", won: 18, lost: 7 },
  { label: "Feb", won: 24, lost: 9 },
  { label: "Mar", won: 21, lost: 11 },
  { label: "Apr", won: 29, lost: 8 },
  { label: "May", won: 34, lost: 12 },
  { label: "Jun", won: 31, lost: 10 },
  { label: "Jul", won: 38, lost: 14 },
  { label: "Aug", won: 35, lost: 11 },
  { label: "Sep", won: 42, lost: 13 },
]

// Same colors as the Won / Lost stages on the Deals pipeline
const WON_COLOR = "#10b981"
const LOST_COLOR = "#f43f5e"

const chartConfig = {
  won: { label: "Won deals", color: WON_COLOR },
  lost: { label: "Lost deals", color: LOST_COLOR },
} satisfies ChartConfig

// Small swatches that mimic the bar patterns, for the legend
const SWATCH = {
  won: {
    backgroundColor: WON_COLOR,
    backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.4) 0 1.5px, transparent 1.5px 4px)",
  },
  lost: {
    backgroundColor: LOST_COLOR,
    backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1.3px)",
    backgroundSize: "4px 4px",
  },
}

const winRateOf = (points: OutcomePoint[]) => {
  const won = points.reduce((sum, p) => sum + p.won, 0)
  const lost = points.reduce((sum, p) => sum + p.lost, 0)
  return won + lost > 0 ? (won / (won + lost)) * 100 : 0
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function DealsOutcomeChart({ data = dealOutcomeData }: { data?: OutcomePoint[] }) {
  // useId() returns ":r1:", which is not valid inside url(#...), so strip the colons
  const uid = useId().replace(/:/g, "")
  const wonPattern = `won-pattern-${uid}`
  const lostPattern = `lost-pattern-${uid}`

  const totalWon = data.reduce((sum, p) => sum + p.won, 0)
  const totalLost = data.reduce((sum, p) => sum + p.lost, 0)
  const winRate = Math.round(winRateOf(data))

  // Win rate of the second half of the period compared with the first half
  const half = Math.floor(data.length / 2)
  const trend = Math.round((winRateOf(data.slice(half)) - winRateOf(data.slice(0, half))) * 10) / 10
  const trendUp = trend >= 0
  const TrendIcon = trendUp ? ArrowUpRight : ArrowDownRight

  const best = data.reduce((top, p) => (p.won > top.won ? p : top), data[0])

  return (
    <Card className="w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-4 pb-1">
        <div className="space-y-0.5">
          <h3 className="text-base font-semibold leading-tight">Won vs Lost</h3>
          <p className="text-sm text-muted-foreground">Deal outcomes over time</p>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold leading-none tracking-tight tabular-nums">{winRate}%</p>
          <p className="mt-1 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            Win rate
            <span
              title="Second half of the period vs the first half"
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-semibold ${
                trendUp
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
              }`}
            >
              <TrendIcon className="mr-0.5 size-3" />
              {Math.abs(trend)} pts
            </span>
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="mx-4 grid grid-cols-3 divide-x rounded-lg border bg-muted/30">
        <div className="px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: WON_COLOR }} />
            Won
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">{totalWon}</p>
        </div>
        <div className="px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: LOST_COLOR }} />
            Lost
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">{totalLost}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Best month</p>
          <p className="mt-0.5 text-lg font-semibold">
            {best.label} <span className="text-sm font-normal text-muted-foreground">· {best.won} won</span>
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 p-4 pt-4">
        <ChartContainer config={chartConfig} className="h-[230px] w-full">
          <BarChart data={data} margin={{ left: -12, right: 0, top: 8, bottom: 0 }}>
            <defs>
              {/* Won: diagonal hatch */}
              <pattern id={wonPattern} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="8" fill={WON_COLOR} />
                <rect width="2.5" height="8" fill="rgba(255,255,255,0.32)" />
              </pattern>
              {/* Lost: dots */}
              <pattern id={lostPattern} width="7" height="7" patternUnits="userSpaceOnUse">
                <rect width="7" height="7" fill={LOST_COLOR} />
                <circle cx="2" cy="2" r="1.1" fill="rgba(255,255,255,0.45)" />
                <circle cx="5.5" cy="5.5" r="1.1" fill="rgba(255,255,255,0.45)" />
              </pattern>
            </defs>

            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={16}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              width={32}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />

            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              content={
                <ChartTooltipContent
                  formatter={(value: unknown, name: unknown) => {
                    const key = String(name) as "won" | "lost"
                    return (
                      <div className="flex w-full items-center justify-between gap-6">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="size-2.5 rounded-[2px]" style={SWATCH[key]} />
                          {chartConfig[key]?.label ?? key}
                        </span>
                        <span className="font-mono font-medium tabular-nums text-foreground">{String(value)}</span>
                      </div>
                    )
                  }}
                />
              }
            />

            {/* The card-colored stroke leaves a thin gap between the two stacked segments */}
            <Bar
              dataKey="won"
              stackId="outcome"
              fill={`url(#${wonPattern})`}
              stroke="var(--card)"
              strokeWidth={2}
              radius={[0, 0, 4, 4]}
              maxBarSize={20}
            />
            <Bar
              dataKey="lost"
              stackId="outcome"
              fill={`url(#${lostPattern})`}
              stroke="var(--card)"
              strokeWidth={2}
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ChartContainer>

        <div className="mt-3 flex items-center justify-center gap-5 text-xs text-muted-foreground">
          {(["won", "lost"] as const).map((key) => (
            <span key={key} className="flex items-center gap-2">
              <span className="size-3 rounded-[3px]" style={SWATCH[key]} />
              {chartConfig[key].label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  )
}