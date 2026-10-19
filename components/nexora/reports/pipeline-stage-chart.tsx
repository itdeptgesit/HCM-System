import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"

// -----------------------------------------------------------------------------
// Data
// -----------------------------------------------------------------------------

interface StageData {
  stage: string
  deals: number
  value: number
  valueLabel: string
  fill: string
}

const stages: StageData[] = [
  {
    stage: "Qualification",
    deals: 18,
    value: 161000,
    valueLabel: "$161K",
    fill: "#3b82f6",
  },
  {
    stage: "Proposal",
    deals: 24,
    value: 232000,
    valueLabel: "$232K",
    fill: "#f59e0b",
  },
  {
    stage: "Negotiation",
    deals: 14,
    value: 140000,
    valueLabel: "$140K",
    fill: "#a855f7",
  },
  {
    stage: "Won",
    deals: 28,
    value: 350000,
    valueLabel: "$350K",
    fill: "#10b981",
  },
  {
    stage: "Lost",
    deals: 6,
    value: 54000,
    valueLabel: "$54K",
    fill: "#f43f5e",
  },
]

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }

  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}K`
  }

  return `$${value}`
}

// -----------------------------------------------------------------------------
// Chart Config
// -----------------------------------------------------------------------------

const chartConfig = {
  value: {
    label: "Pipeline Value",
  },
} satisfies ChartConfig

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function PipelineStageChart() {
  const open = stages.filter(
    (stage) =>
      stage.stage !== "Won" &&
      stage.stage !== "Lost",
  )

  const openDeals = open.reduce(
    (sum, stage) => sum + stage.deals,
    0,
  )

  const openValue = open.reduce(
    (sum, stage) => sum + stage.value,
    0,
  )

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Pipeline by Stage</CardTitle>

        <CardDescription>
          Current opportunity distribution
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-end justify-between border-b pb-4">
          <div>
            <p className="text-2xl font-semibold tracking-tight">
              {formatCompactCurrency(openValue)}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Active pipeline value
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold">
              {openDeals}
            </p>

            <p className="text-xs text-muted-foreground">
              Open deals
            </p>
          </div>
        </div>

        {/* Chart */}
        <ChartContainer
          config={chartConfig}
          className="h-[320px] w-full"
        >
          <BarChart
            data={stages}
            margin={{
              top: 24,
              right: 8,
              left: 8,
              bottom: 8,
            }}
            barCategoryGap="22%"
          >
            <defs>
              {/* Background dot pattern */}
              <pattern
                id="pipeline-dot-grid"
                x="0"
                y="0"
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <circle
                  cx="2"
                  cy="2"
                  r="1"
                  className="fill-muted-foreground/20"
                />
              </pattern>

              {/* Bar patterns */}
              {stages.map((stage) => {
                const patternId = `pipeline-stripe-${stage.stage
                  .replace(/\s+/g, "-")
                  .toLowerCase()}`

                return (
                  <pattern
                    key={patternId}
                    id={patternId}
                    width="8"
                    height="8"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <rect
                      width="8"
                      height="8"
                      fill={stage.fill}
                    />

                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="8"
                      stroke="rgba(255,255,255,0.35)"
                      strokeWidth="2.5"
                    />
                  </pattern>
                )
              })}
            </defs>

            {/* Background */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="url(#pipeline-dot-grid)"
              className="pointer-events-none"
            />

            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              className="stroke-border/50"
            />

            <XAxis
              dataKey="stage"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fontSize: 11 }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              width={45}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) =>
                formatCompactCurrency(value)
              }
            />

            <ChartTooltip
              cursor={{
                fill: "var(--muted)",
                opacity: 0.3,
              }}
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    formatCompactCurrency(Number(value))
                  }
                />
              }
            />

            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              barSize={42}
            >
              {stages.map((stage) => {
                const patternId = `pipeline-stripe-${stage.stage
                  .replace(/\s+/g, "-")
                  .toLowerCase()}`

                return (
                  <Cell
                    key={stage.stage}
                    fill={`url(#${patternId})`}
                  />
                )
              })}

              <LabelList
                dataKey="valueLabel"
                position="top"
                offset={8}
                className="fill-foreground text-[11px] font-semibold"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}