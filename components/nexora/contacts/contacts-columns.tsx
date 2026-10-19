
"use client"

import { Link } from "@tanstack/react-router"
import {
  ArrowUpDownIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react"

import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table"

import { cn } from "@workspace/ui/lib/utils"

import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import {
  contactStatusStyles,
  type Contact,
} from "./contacts-data"

export const features = tableFeatures({
  rowSelectionFeature,
  rowSortingFeature,
  rowPaginationFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filteredRowModel: createFilteredRowModel(),
})

const columnHelper = createColumnHelper<typeof features, Contact>()

export const createContactsColumns = (
  onDelete: (contact: Contact) => void,
) =>
  columnHelper.columns([
    // Selection
    columnHelper.display({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(!!value)
          }
          aria-label="Select all contacts"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select contact"
        />
      ),
    }),

    // Name
    columnHelper.accessor("name", {
      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="flex items-center gap-1.5"
        >
          Name
          <ArrowUpDownIcon className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => {
        const contact = row.original

        return (
          <div className="flex items-center gap-2.5">
            <Avatar className="size-9">
              <AvatarImage src={contact.avatarUrl} alt={contact.name} />
              <AvatarFallback className="text-xs">
                {initials(contact.name)}
              </AvatarFallback>
            </Avatar>

            <Link
              to="/contacts/$contactId"
              params={{ contactId: contact.id }}
              className="text-sm font-medium hover:underline"
            >
              {contact.name}
            </Link>
          </div>
        )
      },
    }),

    // Company
    columnHelper.accessor("company", {
      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="flex items-center gap-1.5"
        >
          Company
          <ArrowUpDownIcon className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.company}</span>
      ),
    }),

    // Email
    columnHelper.accessor("email", {
      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="flex items-center gap-1.5"
        >
          Email
          <ArrowUpDownIcon className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.email}
        </span>
      ),
    }),

    // Phone
    columnHelper.accessor("phone", {
      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="flex items-center gap-1.5"
        >
          Phone
          <ArrowUpDownIcon className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.phone}</span>
      ),
    }),

    // Status
    columnHelper.accessor("status", {
      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="flex items-center gap-1.5"
        >
          Status
          <ArrowUpDownIcon className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-medium",
            contactStatusStyles[row.original.status],
          )}
        >
          {row.original.status}
        </Badge>
      ),
    }),

    // Last Contacted
    columnHelper.accessor("lastContacted", {
      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="flex items-center gap-1.5"
        >
          Last Contacted
          <ArrowUpDownIcon className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.lastContacted}
        </span>
      ),
    }),

    // Actions
    columnHelper.display({
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
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

          <DropdownMenuContent align="end" className="w-40 rounded-xl p-2">
            <DropdownMenuItem
                className="gap-2"
                render={
                    <Link
                        to="/contacts/$contactId"
                        params={{ contactId: row.original.id }}
                    />
                }
            >
                <EyeIcon className="size-4" />
                <span>View</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2">
              <PencilIcon className="size-4" />
              <span>Edit</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="gap-2 text-red-600 focus:text-red-600"
              onClick={() => onDelete(row.original)}
            >
              <TrashIcon className="size-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ])

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
