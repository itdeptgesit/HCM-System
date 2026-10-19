import { Cell, Pie, PieChart } from "recharts"

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

import {
  BarChart3,
  Download,
  MoreHorizontal,
  RefreshCw,
  Settings,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"


// -----------------------------------------------------------------------------
// Lead Source Data
// -----------------------------------------------------------------------------

const leadSources = [
  {
    key: "website",
    label: "Website",
    leads: 148,
    color: "#3b82f6",
  },
  {
    key: "referral",
    label: "Referral",
    leads: 96,
    color: "#10b981",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    leads: 82,
    color: "#8b5cf6",
  },
  {
    key: "cold",
    label: "Cold outreach",
    leads: 61,
    color: "#f59e0b",
  },
  {
    key: "events",
    label: "Events",
    leads: 44,
    color: "#f43f5e",
  },
]

const total = leadSources.reduce(
  (sum, source) => sum + source.leads,
  0,
)

// -----------------------------------------------------------------------------
// Chart Config
// -----------------------------------------------------------------------------

const chartConfig = {
  leads: {
    label: "Leads",
  },
  website: {
    label: "Website",
    color: "#3b82f6",
  },
  referral: {
    label: "Referral",
    color: "#10b981",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#8b5cf6",
  },
  cold: {
    label: "Cold outreach",
    color: "#f59e0b",
  },
  events: {
    label: "Events",
    color: "#f43f5e",
  },
} satisfies ChartConfig

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function LeadSourcesChart() {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Lead Sources</CardTitle>

          <CardDescription>
            Where new leads come from
          </CardDescription>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-foreground shadow-none transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Lead source actions"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-44 p-2">
            <DropdownMenuItem>
              <BarChart3 className="mr-2 size-4" />
              View details
            </DropdownMenuItem>

            <DropdownMenuItem>
              <RefreshCw className="mr-2 size-4" />
              Refresh data
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Download className="mr-2 size-4" />
              Export data
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <Settings className="mr-2 size-4" />
              Chart settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Donut Chart */}
        <div className="relative mx-auto h-[200px] w-full">
          <ChartContainer
            config={chartConfig}
            className="relative z-10 h-full w-full"
          >
            <PieChart>
              <defs>
                {/* Center dotted pattern */}
                <pattern
                  id="pie-dot-grid"
                  x="0"
                  y="0"
                  width="12"
                  height="12"
                  patternUnits="userSpaceOnUse"
                >
                  <circle
                    cx="2"
                    cy="2"
                    r="1"
                    className="fill-muted-foreground/20"
                  />
                </pattern>

                {/* Slice patterns */}
                {leadSources.map((source) => (
                  <pattern
                    key={source.key}
                    id={`source-pattern-${source.key}`}
                    width="8"
                    height="8"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect
                      width="8"
                      height="8"
                      fill={source.color}
                    />

                    <line
                      x1="0"
                      y1="4"
                      x2="8"
                      y2="4"
                      stroke="rgba(255,255,255,0.35)"
                      strokeWidth="2"
                    />
                  </pattern>
                ))}
              </defs>

              <ChartTooltip
                cursor={false}
                wrapperStyle={{ zIndex: 50 }}
                content={
                  <ChartTooltipContent
                    hideLabel
                    nameKey="key"
                  />
                }
              />

              <Pie
                data={leadSources}
                dataKey="leads"
                nameKey="key"
                innerRadius={68}
                outerRadius={96}
                paddingAngle={3}
                strokeWidth={0}
                cornerRadius={6}
              >
                {leadSources.map((source) => (
                  <Cell
                    key={source.key}
                    fill={`url(#source-pattern-${source.key})`}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Center */}
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
            <div className="flex size-20 flex-col items-center justify-center rounded-full border border-border/50 bg-background/90 shadow-xs backdrop-blur-sm">
              <span className="text-2xl font-bold leading-none tracking-tight">
                {total}
              </span>

              <span className="mt-1 text-[11px] font-medium text-muted-foreground">
                new leads
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <ul className="grid grid-cols-1 gap-2 border-t pt-4">
          {leadSources.map((source) => {
            const percentage =
              total > 0
                ? Math.round((source.leads / total) * 100)
                : 0

            return (
              <li
                key={source.key}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-3.5 shrink-0 rounded-sm border border-white/20 shadow-xs"
                    style={{
                      backgroundImage: `
                        repeating-linear-gradient(
                          0deg,
                          ${source.color},
                          ${source.color} 3px,
                          rgba(255,255,255,0.4) 3px,
                          rgba(255,255,255,0.4) 5px
                        )
                      `,
                    }}
                  />

                  <span className="truncate font-medium">
                    {source.label}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    {source.leads}
                  </span>

                  <span className="w-11 rounded-full bg-muted/60 px-2 py-0.5 text-center text-[10px] font-bold tabular-nums text-muted-foreground">
                    {percentage}%
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}