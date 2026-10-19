"use client"

import {
  DownloadIcon,
  EyeIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  UsersIcon,
  UserRoundIcon,
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

import { companyStatusStyles, type Company } from "../companies-data"

// ---------------------------------------------------------------------------
// Shared header + menu
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
// Row primitive — same shape used across Contact and Company info cards
// ---------------------------------------------------------------------------

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type CompanyAboutCardProps = {
  company: Company
}

export function CompanyAboutCard({ company }: CompanyAboutCardProps) {
  return (
    <Card>
      <SectionHeader icon={UserRoundIcon} title="About" />

      <CardContent className="divide-y">
        <div className="pb-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {company.description || "No company description available."}
          </p>
        </div>

        <InfoRow icon={UserRoundIcon} label="Status">
          <Badge
            variant="outline"
            className={cn(
              "rounded-md px-2 py-0.5 text-xs font-medium",
              companyStatusStyles[company.status],
            )}
          >
            {company.status}
          </Badge>
        </InfoRow>

        <InfoRow icon={UsersIcon} label="Contacts">
          <span className="text-sm font-medium">
            {company.contactCount}{" "}
            {company.contactCount === 1 ? "contact" : "contacts"}
          </span>
        </InfoRow>
      </CardContent>
    </Card>
  )
}