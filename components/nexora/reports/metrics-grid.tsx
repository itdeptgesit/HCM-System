
import {
  DollarSign,
  Handshake,
  Activity,
  ArrowUpRight,
  Users,
  Target,
  TrendingUp,
  UserCheck,
} from "lucide-react"

import {
  Card,
  CardContent,
} from "@workspace/ui/components/card"

import { Progress } from "@workspace/ui/components/progress"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts"

// -----------------------------------------------------------------------------
// Chart Data
// -----------------------------------------------------------------------------

const revenueData = [
  { month: "Jan", value: 32 },
  { month: "Feb", value: 42 },
  { month: "Mar", value: 36 },
  { month: "Apr", value: 55 },
  { month: "May", value: 48 },
  { month: "Jun", value: 62 },
  { month: "Jul", value: 58 },
  { month: "Aug", value: 76 },
  { month: "Sep", value: 68 },
  { month: "Oct", value: 88 },
]

const dealsData = [
  { day: "Mon", deals: 18 },
  { day: "Tue", deals: 25 },
  { day: "Wed", deals: 20 },
  { day: "Thu", deals: 32 },
  { day: "Fri", deals: 28 },
  { day: "Sat", deals: 38 },
  { day: "Sun", deals: 45 },
]

// -----------------------------------------------------------------------------
// Inner Metric Card
// -----------------------------------------------------------------------------

function PipelineMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ElementType
}) {
  return (
    <Card className="border-0 bg-muted/0 shadow-none">
      <CardContent>
        <div className="flex items-center justify-between gap-1">
          <p className="text-[11px] font-medium text-muted-foreground">
            {label}
          </p>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p className="mt-1 text-lg font-bold text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

// -----------------------------------------------------------------------------
// Metrics Grid
// -----------------------------------------------------------------------------

export function MetricsGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {/* Card 1: Revenue */}
      <Card className="flex flex-col justify-between">
        <CardContent className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg p-0.5 shadow border border-border">
                <div className="flex size-full items-center justify-center rounded-md text-white bg-emerald-600 dark:bg-emerald-500">
                  <DollarSign className="size-5" />
                </div>
              </div>

              <div className="flex items-center gap-0.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <ArrowUpRight className="size-3.5" />
                18.6%
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-foreground">
                $284.6K
              </p>
            </div>

            {/* Revenue Area Chart */}
            <div className="my-3 h-14 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueData}
                  margin={{ top: 3, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" hide />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--popover-foreground)",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [`$${value}K`, "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#059669"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 border-t pt-3 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Monthly target</span>
              <span className="font-medium text-foreground">
                82% of $350K
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Revenue forecast</span>
              <span className="font-medium text-foreground">$318K</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Deals Won */}
      <Card className="flex flex-col justify-between">
        <CardContent className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">

              <div className="flex size-10 items-center justify-center rounded-lg p-0.5 shadow border border-border">
                <div className="flex size-full items-center justify-center rounded-md text-white bg-sky-700 dark:bg-sky-500">
                  <Handshake className="size-5" />
                </div>
              </div>

              <div className="flex items-center gap-0.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <ArrowUpRight className="size-3.5" />
                9.4%
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">
                Deals Won
              </p>
              <p className="text-2xl font-bold text-foreground">312</p>
            </div>

            {/* Deals Bar Chart */}
            <div className="my-3 h-14 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dealsData}
                  barCategoryGap="20%"
                  margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis dataKey="day" hide />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--popover-foreground)",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [value, "Deals"]}
                  />
                  <Bar
                    dataKey="deals"
                    fill="#0284c7"
                    barSize={24}
                    radius={[4, 4, 4, 4]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 border-t pt-3 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Weekly average</span>
              <span className="font-medium text-foreground">32 deals</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Win rate</span>
              <span className="font-medium text-foreground">32.8%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Sales Pipeline Health */}
      <Card className="flex flex-col justify-between md:col-span-2">
        <CardContent className="flex h-full flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">

              <div className="flex size-10 items-center justify-center rounded-lg p-0.5 shadow border border-border">
                <div className="flex size-full items-center justify-center rounded-md text-white bg-slate-700 dark:bg-slate-500">
                  <Activity className="size-5" />
                </div>
              </div>

              <h3 className="font-semibold text-foreground">
                Sales Pipeline Health
              </h3>
            </div>

            {/* Pipeline Distribution */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Pipeline Distribution
                </span>
                <span className="text-xs text-muted-foreground">
                  100% of active deals
                </span>
              </div>

              <div className="flex w-full gap-1">
                <Progress
                  value={100}
                  className="h-3 flex-[40] rounded-full bg-transparent [&_[data-slot=progress-indicator]]:!h-full [&_[data-slot=progress-indicator]]:!rounded-full [&_[data-slot=progress-indicator]]:!bg-emerald-500"
                />
                <Progress
                  value={100}
                  className="h-3 flex-[25] rounded-full bg-transparent [&_[data-slot=progress-indicator]]:!h-full [&_[data-slot=progress-indicator]]:!rounded-full [&_[data-slot=progress-indicator]]:!bg-blue-500"
                />
                <Progress
                  value={100}
                  className="h-3 flex-[20] rounded-full bg-transparent [&_[data-slot=progress-indicator]]:!h-full [&_[data-slot=progress-indicator]]:!rounded-full [&_[data-slot=progress-indicator]]:!bg-amber-500"
                />
                <Progress
                  value={100}
                  className="h-3 flex-[15] rounded-full bg-transparent [&_[data-slot=progress-indicator]]:!h-full [&_[data-slot=progress-indicator]]:!rounded-full [&_[data-slot=progress-indicator]]:!bg-violet-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Qualified 40%
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-blue-500" />
                  Proposal 25%
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Negotiation 20%
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-violet-500" />
                  Closing 15%
                </span>
              </div>
            </div>

          </div>

          {/* Inner Metric Cards */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <PipelineMetric
              label="Qualified Leads"
              value="1,840"
              icon={Users}
            />
            <PipelineMetric
              label="Win Rate"
              value="32.8%"
              icon={Target}
            />
            <PipelineMetric
              label="Forecast"
              value="92%"
              icon={TrendingUp}
            />
            <PipelineMetric
              label="Retention"
              value="68.4%"
              icon={UserCheck}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
