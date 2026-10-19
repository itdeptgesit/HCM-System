"use client"

import {
  BriefcaseIcon,
  CalendarDaysIcon,
  ClipboardIcon,
  DownloadIcon,
  EyeIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  RefreshCwIcon,
  TagIcon,
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

import { contactStatusStyles, type Contact } from "../contacts-data"

// ---------------------------------------------------------------------------
// Shared header + menu — same pattern as every other dashboard card
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
// Row primitive — icon + label + value, used by both cards below
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
// Contact Information
// ---------------------------------------------------------------------------

export function ContactInformationCard({ contact }: { contact: Contact }) {
  return (
    <Card>
      <SectionHeader icon={UserRoundIcon} title="Contact Information" />

      <CardContent className="divide-y">
        <InfoRow icon={MailIcon} label="Email">
          {contact.email ? (
            <a
              href={`mailto:${contact.email}`}
              className="break-all text-sm font-medium hover:underline"
            >
              {contact.email}
            </a>
          ) : (
            <EmptyValue />
          )}
        </InfoRow>

        <InfoRow icon={PhoneIcon} label="Phone">
          {contact.phone ? (
            <a
              href={`tel:${contact.phone}`}
              className="text-sm font-medium hover:underline"
            >
              {contact.phone}
            </a>
          ) : (
            <EmptyValue />
          )}
        </InfoRow>

        <InfoRow icon={BriefcaseIcon} label="Company">
          <span className="text-sm font-medium">
            {contact.company || <EmptyValue />}
          </span>
        </InfoRow>

        <InfoRow icon={MapPinIcon} label="Location">
          <span className="text-sm font-medium">
            {contact.location || <EmptyValue />}
          </span>
        </InfoRow>

        <InfoRow icon={GlobeIcon} label="Time Zone">
          <span className="text-sm font-medium">
            {contact.timezone || <EmptyValue />}
          </span>
        </InfoRow>

        <InfoRow icon={CalendarDaysIcon} label="Last Contacted">
          <span className="text-sm font-medium">
            {contact.lastContacted || "Not contacted yet"}
          </span>
        </InfoRow>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

export function ContactAboutCard({ contact }: { contact: Contact }) {
  return (
    <Card>
      <SectionHeader icon={UserRoundIcon} title="About" />

      <CardContent className="divide-y">
        <InfoRow icon={TagIcon} label="Lifecycle Stage">
          <span className="text-sm font-medium">{contact.status}</span>
        </InfoRow>

        <InfoRow icon={UserRoundIcon} label="Status">
          <Badge
            variant="outline"
            className={cn(
              "rounded-md px-2 py-0.5 text-xs font-medium",
              contactStatusStyles[contact.status],
            )}
          >
            {contact.status}
          </Badge>
        </InfoRow>

        <InfoRow icon={ClipboardIcon} label="Description">
          <p className="text-sm leading-relaxed text-muted-foreground">
            No additional description has been added for this contact yet.
          </p>
        </InfoRow>
      </CardContent>
    </Card>
  )
}