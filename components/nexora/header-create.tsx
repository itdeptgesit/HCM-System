"use client"

import {
  CalendarPlusIcon,
  CheckSquareIcon,
  FilePlusIcon,
  MailPlusIcon,
  MessageSquarePlusIcon,
  PlusIcon,
  UserPlusIcon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { Button } from "@workspace/ui/components/button"

export function HeaderCreate() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="sm"
            className="gap-1.5 rounded-full px-4"
          >
            <PlusIcon className="size-4" />
            <span>Create</span>
          </Button>
        }
      />

      <DropdownMenuContent
        align="end"
        className="w-52 p-2"
        sideOffset={6}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-2">
            <UserPlusIcon className="size-4" />
            <span>New Lead</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="gap-2">
            <CheckSquareIcon className="size-4" />
            <span>New Task</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="gap-2">
            <CalendarPlusIcon className="size-4" />
            <span>Schedule Meeting</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="gap-2">
            <MailPlusIcon className="size-4" />
            <span>Send Email</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-2">
            <MessageSquarePlusIcon className="size-4" />
            <span>Add Note</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="gap-2">
            <FilePlusIcon className="size-4" />
            <span>Attach File</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}