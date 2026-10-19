"use client"

import {
  DownloadIcon,
  EyeIcon,
  HandshakeIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

// ---------------------------------------------------------------------------
// Sample data — deals tied to this company
// ---------------------------------------------------------------------------

const deals = [
  { id: "1", name: "Enterprise Rollout", value: "$240,000", stage: "Won" },
  { id: "2", name: "Compliance Add-on", value: "$95,000", stage: "Proposal" },
  { id: "3", name: "Platform Renewal", value: "$62,000", stage: "Negotiation" },
]

const stageStyles: Record<string, string> = {
  Won: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  Proposal:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Negotiation:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-400",
  Lost: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType
  title: string
}) {
  return (
    <CardHeader className="flex flex-row items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <p className="text-sm font-semibold">{title}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
            />
          }
        >
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44 rounded-xl p-2">
          <DropdownMenuItem className="gap-2">
            <EyeIcon className="size-4" />
            <span>View Details</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="gap-2">
            <DownloadIcon className="size-4" />
            <span>Export Data</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="gap-2">
            <RefreshCwIcon className="size-4" />
            <span>Refresh</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </CardHeader>
  )
}

export function CompanyDealsCard() {
  return (
    <Card>
      <SectionHeader icon={HandshakeIcon} title="Deals" />

      <CardContent>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Open and closed deals
          </p>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {deals.length} deals
          </span>
        </div>

        <div className="divide-y">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-2 last:pb-1"
            >
              <p className="truncate text-sm font-medium">{deal.name}</p>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-semibold">{deal.value}</span>

                <Badge
                  variant="outline"
                  className={cn(
                    "w-24 justify-center rounded-md px-2 py-0.5 text-xs font-medium",
                    stageStyles[deal.stage],
                  )}
                >
                  {deal.stage}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}