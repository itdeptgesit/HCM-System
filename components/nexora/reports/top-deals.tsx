import {
  Building2,
  Cloud,
  ShieldCheck,
  CreditCard,
  FileText,
  MoreHorizontal,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { Button } from "@workspace/ui/components/button"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

// -----------------------------------------------------------------------------
// Top Deals Data
// -----------------------------------------------------------------------------

const topDeals = [
  {
    id: "deal-1",
    name: "Enterprise Rollout",
    company: "Google",
    stage: "Proposal",
    value: 240000,
    probability: 80,
    icon: Building2,
  },
  {
    id: "deal-2",
    name: "Cloud Migration",
    company: "Dzen.ru",
    stage: "Qualification",
    value: 125000,
    probability: 30,
    icon: Cloud,
  },
  {
    id: "deal-3",
    name: "Security Integration",
    company: "Okta",
    stage: "Negotiation",
    value: 110000,
    probability: 70,
    icon: ShieldCheck,
  },
  {
    id: "deal-4",
    name: "Compliance Add-on",
    company: "Stripe",
    stage: "Proposal",
    value: 95000,
    probability: 65,
    icon: CreditCard,
  },
  {
    id: "deal-5",
    name: "Annual SaaS Contract",
    company: "Notion",
    stage: "Negotiation",
    value: 78000,
    probability: 55,
    icon: FileText,
  },
]

// -----------------------------------------------------------------------------
// Stage Colors
// -----------------------------------------------------------------------------

const stageColors: Record<string, string> = {
  Prospecting: "#818cf8",
  Qualification: "#38bdf8",
  Proposal: "#fbbf24",
  Negotiation: "#2dd4bf",
  Closing: "#f43f5e",
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function TopDeals() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Top Open Deals</CardTitle>

            <CardDescription className="mt-1">
              Largest opportunities still in play
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
              {topDeals.length} deals
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Deal actions"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />

              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  View all deals
                </DropdownMenuItem>

                <DropdownMenuItem>
                  Export deals
                </DropdownMenuItem>

                <DropdownMenuItem>
                  Refresh data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ul className="grid grid-cols-1 gap-2.5">
          {topDeals.map((deal) => {
            const DealIcon = deal.icon
            const stageColor =
              stageColors[deal.stage] ?? "#818cf8"

            return (
              <li
                key={deal.id}
                className="group relative flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-card p-3 transition-all hover:border-border hover:bg-accent/40 hover:shadow-sm"
              >
                {/* Left Side */}
                <div className="flex min-w-0 items-center gap-3">
                  {/* Neutral Icon Box */}
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                    <DealIcon className="size-4" />
                  </div>

                  {/* Deal Meta */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                      {deal.name}
                    </div>

                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate font-medium">
                        {deal.company}
                      </span>

                      <span>•</span>

                      <span
                        className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${stageColor}15`,
                          color: stageColor,
                        }}
                      >
                        {deal.stage}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side */}
                <div className="flex shrink-0 flex-col items-end">
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {formatCurrency(deal.value)}
                  </span>

                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, deal.probability),
                          )}%`,
                          backgroundColor: stageColor,
                        }}
                      />
                    </div>

                    <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {deal.probability}%
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}