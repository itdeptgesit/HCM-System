import {
  CircleDollarSignIcon,
  HandshakeIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"

const kpis = [
  {
    title: "Total Leads",
    value: "1,284",
    change: "+12.8%",
    description: "vs. previous period",
    icon: TargetIcon,
    iconBg:
      "bg-gradient-to-br from-cyan-500 to-blue-600 dark:from-cyan-400 dark:to-blue-500",
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  },
  {
    title: "Open Deals",
    value: "86",
    change: "+8.4%",
    description: "vs. previous period",
    icon: HandshakeIcon,
    iconBg:
      "bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-400 dark:to-purple-500",
    badgeClass:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-400",
  },
  {
    title: "Pipeline Value",
    value: "$284.5K",
    change: "+16.2%",
    description: "vs. previous period",
    icon: TrendingUpIcon,
    iconBg:
      "bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-teal-500",
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  },
  {
    title: "Won Revenue",
    value: "$128.6K",
    change: "+11.7%",
    description: "vs. previous period",
    icon: CircleDollarSignIcon,
    iconBg:
      "bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500",
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  },
]

export function DashboardKpi() {
  return (
    <div className="grid grid-cols-12 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon

        return (
          <Card
            key={kpi.title}
            className="relative col-span-12 overflow-hidden bg-card/80 backdrop-blur-sm bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] sm:col-span-6 xl:col-span-3"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>

              {/* Gradient Icon Box */}
              <div className="flex size-10 items-center justify-center rounded-lg border border-border p-0.5 shadow">
                <div
                  className={`flex size-full items-center justify-center rounded-md text-white ${kpi.iconBg}`}
                >
                  <Icon className="size-5" />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="text-xl font-semibold tracking-tight">
                {kpi.value}
              </div>

              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <Badge
                  variant="outline"
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${kpi.badgeClass}`}
                >
                  {kpi.change}
                </Badge>

                <span className="text-muted-foreground">
                  {kpi.description}
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}