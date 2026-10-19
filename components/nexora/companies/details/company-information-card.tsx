"use client"

import {
  Building2Icon,
  DownloadIcon,
  EyeIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  RefreshCwIcon,
  UsersIcon,
} from "lucide-react"

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

import type { Company } from "../companies-data"

// ---------------------------------------------------------------------------
// Shared header + menu — same pattern used across every card in this project
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
// Row primitive — same shape as ContactInformationCard's InfoRow
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

function EmptyValue() {
  return <span className="text-sm text-muted-foreground">Not provided</span>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type CompanyInformationCardProps = {
  company: Company
}

export function CompanyInformationCard({
  company,
}: CompanyInformationCardProps) {
  return (
    <Card>
      <SectionHeader icon={Building2Icon} title="Company Information" />

      <CardContent className="divide-y">
        <InfoRow icon={GlobeIcon} label="Website">
          {company.website ? (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm font-medium hover:underline"
            >
              {company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          ) : (
            <EmptyValue />
          )}
        </InfoRow>

        <InfoRow icon={Building2Icon} label="Industry">
          <span className="text-sm font-medium">
            {company.industry || <EmptyValue />}
          </span>
        </InfoRow>

        <InfoRow icon={UsersIcon} label="Employees">
          <span className="text-sm font-medium">
            {company.employees || <EmptyValue />}
          </span>
        </InfoRow>

        <InfoRow icon={MailIcon} label="Email">
          {company.email ? (
            <a
              href={`mailto:${company.email}`}
              className="break-all text-sm font-medium hover:underline"
            >
              {company.email}
            </a>
          ) : (
            <EmptyValue />
          )}
        </InfoRow>

        <InfoRow icon={PhoneIcon} label="Phone">
          {company.phone ? (
            <a
              href={`tel:${company.phone}`}
              className="text-sm font-medium hover:underline"
            >
              {company.phone}
            </a>
          ) : (
            <EmptyValue />
          )}
        </InfoRow>

        <InfoRow icon={MapPinIcon} label="Location">
          <span className="text-sm font-medium">
            {company.location || <EmptyValue />}
          </span>
        </InfoRow>
      </CardContent>
    </Card>
  )
}