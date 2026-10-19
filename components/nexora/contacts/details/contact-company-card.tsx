"use client"

import {
  Building2Icon,
  DownloadIcon,
  EyeIcon,
  GlobeIcon,
  Link2Icon,
  MoreHorizontalIcon,
  RefreshCwIcon,
} from "lucide-react"
import { FaFacebookF, FaLinkedinIn, FaXTwitter } from "react-icons/fa6"

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

import { type Contact } from "../contacts-data"

// ---------------------------------------------------------------------------
// Shared header + menu — same pattern as every other card
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Stat row — label above value, divided, same rhythm as InfoRow but no icon
// ---------------------------------------------------------------------------

function StatRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Company Information
// ---------------------------------------------------------------------------

export function ContactCompanyCard({ contact }: { contact: Contact }) {
  return (
    <Card>
      <SectionHeader icon={Building2Icon} title="Company Information" />

      <CardContent className="divide-y">
        {/* Logo + name */}
        <div className="flex items-center gap-3 py-3 first:pt-0">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-violet-50">
            <Building2Icon className="size-5" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {contact.company || "No company"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Financial infrastructure platform
            </p>
          </div>
        </div>

        {/* Description */}
        <StatRow label="Description">
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {contact.company
              ? `${contact.company} is a financial infrastructure platform founded in 2010, headquartered in San Francisco. Additional company details have not been added yet.`
              : "No company information has been added yet."}
          </p>
        </StatRow>

        {/* Key stats */}
        <div className="grid grid-cols-2 gap-x-4">
          <StatRow label="Founded year">
            <span className="text-sm font-medium">2010</span>
          </StatRow>

          <StatRow label="Number of employees">
            <span className="text-sm font-medium">8,500 Employees</span>
          </StatRow>

          <StatRow label="Subsidiaries">
            <span className="text-sm font-medium">22 Subsidiaries</span>
          </StatRow>

          <StatRow label="SIC code">
            <span className="text-sm font-medium">7375</span>
          </StatRow>

          <StatRow label="NAICS code">
            <span className="text-sm font-medium">54151</span>
          </StatRow>
        </div>

        {/* Industry */}
        <StatRow label="Industry">
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className="rounded-md border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-400"
            >
              Financial infrastructure
            </Badge>
            <Badge
              variant="outline"
              className="rounded-md border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
            >
              Payments
            </Badge>
            <Badge
              variant="outline"
              className="rounded-md border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400"
            >
              Internet
            </Badge>
            <Badge
              variant="outline"
              className="rounded-md border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
            >
              Fintech
            </Badge>
          </div>
        </StatRow>

        {/* Keywords */}
        <StatRow label="Keywords">
          <div className="flex flex-wrap gap-1.5">
            {[
              "Payments",
              "Infrastructure",
              "Credit cards",
              "Internet",
              "Cloud",
              "Enterprise",
              "56+",
            ].map((keyword) => (
              <Badge
                key={keyword}
                variant="outline"
                className="rounded-md px-2 py-0.5 text-xs font-normal text-muted-foreground"
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </StatRow>

        {/* Links */}
        <StatRow label="Links">
            <div className="flex items-center gap-1.5">
                <Button
                    variant="outline"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    aria-label="Facebook"
                >
                    <FaFacebookF className="size-3.5" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    aria-label="X (Twitter)"
                >
                    <FaXTwitter className="size-3.5" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    aria-label="LinkedIn"
                >
                    <FaLinkedinIn className="size-3.5" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    aria-label="Website"
                >
                    <GlobeIcon className="size-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    aria-label="Copy link"
                >
                    <Link2Icon className="size-4" />
                </Button>
            </div>
        </StatRow>
      </CardContent>
    </Card>
  )
}