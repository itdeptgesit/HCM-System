import { useState } from "react"
import { ArrowDownRight, ArrowUpDown, ArrowUpRight, Search } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Card } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Progress } from "@workspace/ui/components/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

type Stage = "Qualification" | "Proposal" | "Negotiation" | "Won" | "Lost"

export interface TopDealRow {
  id: string
  name: string
  company: string
  owner: string
  industry: string
  logo?: string
  activities: number
  value: number
  probability: number
  growth: number
  stage: Stage
}

const favicon = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`

const DEFAULT_DEALS: TopDealRow[] = [
  { id: "1", name: "Enterprise Rollout", company: "Google", logo: favicon("google.com"), owner: "Alex Morgan", industry: "Technology", activities: 58, value: 240000, probability: 100, growth: 28.5, stage: "Won" },
  { id: "2", name: "Cloud Migration", company: "Dzen.ru", logo: favicon("dzen.ru"), owner: "Priya Sharma", industry: "Media", activities: 41, value: 125000, probability: 30, growth: -3.1, stage: "Qualification" },
  { id: "3", name: "Security Integration", company: "Okta", logo: favicon("okta.com"), owner: "Jamie Wilson", industry: "Security", activities: 36, value: 110000, probability: 100, growth: 14.2, stage: "Won" },
  { id: "4", name: "Compliance Add-on", company: "Stripe", logo: favicon("stripe.com"), owner: "Alex Morgan", industry: "Fintech", activities: 29, value: 95000, probability: 70, growth: 9.6, stage: "Proposal" },
  { id: "5", name: "Annual SaaS Contract", company: "Notion", logo: favicon("notion.so"), owner: "Daniel Kim", industry: "Productivity", activities: 24, value: 78000, probability: 80, growth: -1.8, stage: "Negotiation" },
  { id: "6", name: "Marketing Automation", company: "HubSpot", logo: favicon("hubspot.com"), owner: "Priya Sharma", industry: "Marketing", activities: 19, value: 62000, probability: 50, growth: 5.3, stage: "Proposal" },
]

const STAGE_DOT: Record<Stage, string> = {
  Qualification: "bg-blue-500",
  Proposal: "bg-amber-500",
  Negotiation: "bg-purple-500",
  Won: "bg-emerald-500",
  Lost: "bg-rose-500",
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
]

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

const avatarColor = (name: string) => {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

const forecast = (deal: TopDealRow) => Math.round((deal.value * deal.probability) / 100)

type SortKey = "activities" | "value" | "forecast" | "growth" | "probability"

const sortValue = (deal: TopDealRow, key: SortKey) => (key === "forecast" ? forecast(deal) : deal[key])

function SortHead({
  label,
  sortKey,
  active,
  onSort,
  className = "",
}: {
  label: string
  sortKey: SortKey
  active: boolean
  onSort: (key: SortKey) => void
  className?: string
}) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-foreground"
      >
        {label}
        <ArrowUpDown className={`size-3 ${active ? "text-foreground" : "opacity-50"}`} />
      </button>
    </TableHead>
  )
}

export function TopPerformingDealsTable({ deals = DEFAULT_DEALS }: { deals?: TopDealRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "value", dir: "desc" })
  const [query, setQuery] = useState("")

  const handleSort = (key: SortKey) =>
    setSort((current) => ({
      key,
      dir: current.key === key && current.dir === "desc" ? "asc" : "desc",
    }))

  const search = query.trim().toLowerCase()
  const rows = deals
    .filter(
      (deal) =>
        !search ||
        [deal.name, deal.company, deal.owner, deal.industry, deal.stage].join(" ").toLowerCase().includes(search),
    )
    .sort((a, b) => {
      const diff = sortValue(a, sort.key) - sortValue(b, sort.key)
      return sort.dir === "desc" ? -diff : diff
    })

  return (
    <Card className="w-full">
      {/* Card Header */}
      <div className="flex flex-col gap-2 px-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-0.5">
          <h3 className="text-base font-semibold leading-tight">Top performing deals</h3>
          <p className="text-sm text-muted-foreground">Highest-value opportunities this quarter</p>
        </div>
        <div className="relative w-full lg:w-64">
          <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search deals..."
            aria-label="Search deals"
            className="h-8 pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Responsive Horizontal Scroll Container */}
      <div className="border-t w-full overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4 min-w-[200px]">Deal</TableHead>
              <TableHead>Industry</TableHead>
              <SortHead label="Activities" sortKey="activities" active={sort.key === "activities"} onSort={handleSort} className="text-right" />
              <SortHead label="Value" sortKey="value" active={sort.key === "value"} onSort={handleSort} className="text-right" />
              <SortHead label="Forecast" sortKey="forecast" active={sort.key === "forecast"} onSort={handleSort} className="text-right" />
              <SortHead label="Growth" sortKey="growth" active={sort.key === "growth"} onSort={handleSort} />
              <TableHead>Stage</TableHead>
              <SortHead label="Win" sortKey="probability" active={sort.key === "probability"} onSort={handleSort} className="pr-4" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No deals match "{query}".
                </TableCell>
              </TableRow>
            )}

            {rows.map((deal) => {
              const up = deal.growth >= 0
              const Arrow = up ? ArrowUpRight : ArrowDownRight

              return (
                <TableRow key={deal.id}>
                  <TableCell className="pl-4 min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 shrink-0 rounded-lg">
                        <AvatarImage src={deal.logo} alt={deal.company} className="rounded-lg object-contain p-1.5" />
                        <AvatarFallback className={`rounded-lg text-xs font-semibold ${avatarColor(deal.company)}`}>
                          {deal.company.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{deal.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {deal.company} · {deal.owner}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground whitespace-nowrap">{deal.industry}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{deal.activities}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">{money.format(deal.value)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">{money.format(forecast(deal))}</TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`gap-1 font-medium tabular-nums whitespace-nowrap ${
                        up
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                      }`}
                    >
                      <Arrow className="size-3" />
                      {Math.abs(deal.growth)}%
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="gap-1.5 font-medium whitespace-nowrap">
                      <span className={`size-1.5 rounded-full ${STAGE_DOT[deal.stage]}`} />
                      {deal.stage}
                    </Badge>
                  </TableCell>

                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-2.5">
                      <div className="w-14">
                        <Progress value={deal.probability} className="h-1.5" />
                      </div>
                      <span className="min-w-9 text-right text-sm tabular-nums text-muted-foreground">{deal.probability}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <p className="border-t px-4 pt-3 pb-0 text-xs text-muted-foreground">
        Forecast = deal value × win probability. Click a column title to sort.
      </p>
    </Card>
  )
}