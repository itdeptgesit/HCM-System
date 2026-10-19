import type { ReactNode } from "react"
import { Handshake, Target, Trophy, Users, type LucideIcon } from "lucide-react"

import { formatDealValue } from "@/components/nexora/deals/deals-data"
import { Card, CardContent } from "@workspace/ui/components/card"
import { getAttainmentStyle } from "./team-utils"

interface TeamStatsProps {
  stats: {
    total: number
    active: number
    pending: number
    openDeals: number
    dealsWon: number
    revenue: number
    quota: number
    attainment: number
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  iconClassName,
  children,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint: string
  iconClassName: string
  children?: ReactNode
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              {label}
            </p>

            <p className="mt-0.5 text-2xl font-bold leading-tight tracking-tight">
              {value}
            </p>

            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {hint}
            </p>

            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TeamStats({ stats }: TeamStatsProps) {
  const style = getAttainmentStyle(stats.attainment)

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={Users}
        label="Team members"
        value={String(stats.total)}
        hint={`${stats.active} active${stats.pending ? ` · ${stats.pending} invited` : ""}`}
        iconClassName="bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
      />

      <StatCard
        icon={Handshake}
        label="Open deals"
        value={String(stats.openDeals)}
        hint="Across the whole team"
        iconClassName="bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
      />

      <StatCard
        icon={Trophy}
        label="Deals won"
        value={String(stats.dealsWon)}
        hint={`${formatDealValue(stats.revenue)} closed this quarter`}
        iconClassName="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
      />

      <StatCard
        icon={Target}
        label="Quota attainment"
        value={`${stats.attainment}%`}
        hint={`of ${formatDealValue(stats.quota)} target`}
        iconClassName="bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
      >
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${style.bar}`}
            style={{ width: `${Math.min(stats.attainment, 100)}%` }}
          />
        </div>
      </StatCard>
    </div>
  )
}
