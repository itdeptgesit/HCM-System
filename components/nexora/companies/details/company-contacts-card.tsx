"use client"

import { Link } from "@tanstack/react-router"
import {
  DownloadIcon,
  EyeIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
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

import { contacts, initials } from "../../contacts/contacts-data"
import type { Company } from "../companies-data"

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

export function CompanyContactsCard({ company }: { company: Company }) {
  const companyContacts = contacts.filter((c) => c.company === company.name)

  return (
    <Card>
      <SectionHeader icon={UsersIcon} title="Contacts" />

      <CardContent>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            People at this company
          </p>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {companyContacts.length} contacts
          </span>
        </div>

        {companyContacts.length > 0 ? (
          <div className="divide-y">
            {companyContacts.map((contact) => (
              <Link
                key={contact.id}
                to="/contacts/$contactId"
                params={{ contactId: contact.id }}
                className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 first:pt-2 last:pb-1 hover:bg-muted/50"
              >
                <Avatar className="size-9">
                  <AvatarFallback className="text-xs">
                    {initials(contact.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {contact.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {contact.email}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            No contacts linked to this company yet
          </div>
        )}
      </CardContent>
    </Card>
  )
}