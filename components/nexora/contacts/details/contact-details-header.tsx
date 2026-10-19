"use client"

import {
  CalendarPlusIcon,
  CheckSquareIcon,
  DownloadIcon,
  MailIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  TrashIcon,
  VideoIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { contactStatusStyles, type Contact } from "../contacts-data"
import { getInitials } from "./contact-details-ui"

export function ContactDetailsHeader({
  contact,
}: {
  contact: Contact & { avatarUrl?: string; role?: string; location?: string }
}) {
  const avatarSrc =
    contact.avatarUrl ||
    "https://untitledui.com/images/avatars/katherine-moss"
  const roleText = contact.role || "Contact"
  const companyText = contact.company ? `at ${contact.company}` : ""
  const locationText = contact.location ? `, ${contact.location}` : ""
  const subtitle = `${roleText} ${companyText}${locationText}`.trim()

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: avatar, name, status */}
        <div className="flex items-center gap-4">
          <Avatar className="size-14" shape="square">
            <AvatarImage src={avatarSrc} alt={contact.name} />
            <AvatarFallback>
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold leading-none">
                {contact.name}
              </h1>

              <Badge
                variant="outline"
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium",
                  contactStatusStyles[contact.status],
                )}
              >
                {contact.status}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-wrap items-center gap-2">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              aria-label="Email contact"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "text-muted-foreground",
              )}
            >
              <MailIcon className="size-4" />
            </a>
          )}

          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              aria-label="Call contact"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "text-muted-foreground",
              )}
            >
              <PhoneIcon className="size-4" />
            </a>
          )}

          <Button
            variant="outline"
            size="icon"
            className="text-muted-foreground"
            aria-label="Start video call"
          >
            <VideoIcon className="size-4" />
          </Button>

          <Button variant="outline" className="gap-1.5">
            <CheckSquareIcon className="size-4" />
            Create task
          </Button>

          <Button className="gap-1.5">
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
                <CalendarPlusIcon className="size-4" />
                <span>Add to list</span>
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2">
                <DownloadIcon className="size-4" />
                <span>Export</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600">
                <TrashIcon className="size-4" />
                <span>Delete contact</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}