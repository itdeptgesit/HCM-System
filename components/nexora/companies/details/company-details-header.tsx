"use client"

import {
  Building2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  MailIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  TrashIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import {
  companyStatusStyles,
  getCompanyInitials,
  type Company,
} from "../companies-data"

type CompanyDetailsHeaderProps = {
  company: Company
  onEdit: () => void
}

export function CompanyDetailsHeader({
  company,
  onEdit,
}: CompanyDetailsHeaderProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar shape="square" className="size-14 shrink-0 rounded-xl">
            {company.logoUrl && (
              <AvatarImage
                src={company.logoUrl}
                alt={`${company.name} logo`}
                className="rounded-xl object-contain p-1"
              />
            )}
            <AvatarFallback className="rounded-xl text-base font-semibold">
              {getCompanyInitials(company.name) || (
                <Building2Icon className="size-6" />
              )}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold leading-none">
                {company.name}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium",
                  companyStatusStyles[company.status],
                )}
              >
                {company.status}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              {company.industry}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {company.location && (
                <span className="flex items-center gap-1.5">
                  <MapPinIcon className="size-3.5" />
                  {company.location}
                </span>
              )}

              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground"
                >
                  <ExternalLinkIcon className="size-3.5" />
                  {company.website
                    .replace(/^https?:\/\//, "")
                    .replace(/\/$/, "")}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {company.email && (
            <a
              href={`mailto:${company.email}`}
              aria-label="Email company"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "text-muted-foreground",
              )}
            >
              <MailIcon className="size-4" />
            </a>
          )}

          {company.phone && (
            <a
              href={`tel:${company.phone}`}
              aria-label="Call company"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "text-muted-foreground",
              )}
            >
              <PhoneIcon className="size-4" />
            </a>
          )}

          <Button className="gap-1.5" onClick={onEdit}>
            <PencilIcon className="size-4" />
            Edit
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="text-muted-foreground"
                />
              }
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-44 rounded-xl p-2">
              <DropdownMenuItem className="gap-2">
                <DownloadIcon className="size-4" />
                <span>Export</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600">
                <TrashIcon className="size-4" />
                <span>Delete company</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}