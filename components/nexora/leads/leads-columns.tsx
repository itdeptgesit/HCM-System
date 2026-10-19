"use client"

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
} from "@workspace/ui/components/avatar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import {
  initials,
  scoreColor,
  statusStyles,
  type Lead,
} from "./leads-data"

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

const columnHelper = createColumnHelper<typeof features, Lead>()

export const createLeadsColumns = (onDelete: (lead: Lead) => void) =>
  columnHelper.columns([
    // -------------------------------------------------------------------------
    // Selection
    // -------------------------------------------------------------------------

    columnHelper.display({
      id: "select",

      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(!!value)
          }
          aria-label="Select all rows"
        />
      ),

      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
    }),

    // -------------------------------------------------------------------------
    // Lead
    // -------------------------------------------------------------------------

    columnHelper.accessor("name", {
      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="flex items-center gap-1.5"
        >
          Lead
          <ArrowUpDownIcon className="size-3.5" />
        </button>
      ),

      cell: ({ row }) => {
        const lead = row.original

        return (
          <div className="flex items-center gap-2.5">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">
                {initials(lead.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{lead.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {lead.email}
              </p>
            </div>
          </div>
        )
      },
    }),

    // -------------------------------------------------------------------------
    // Company
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // Status
    // -------------------------------------------------------------------------

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
            statusStyles[row.original.status],
          )}
        >
          {row.original.status}
        </Badge>
      ),
      // exact match, so the status tabs don't depend on the built-in registry
      filterFn: (row, columnId, filterValue) =>
        row.getValue(columnId) === filterValue,
    }),

    // -------------------------------------------------------------------------
    // Score
    // -------------------------------------------------------------------------

    columnHelper.accessor("score", {
      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="flex items-center gap-1.5"
        >
          Score
          <ArrowUpDownIcon className="size-3.5" />
        </button>
      ),

      cell: ({ row }) => {
        const score = row.original.score

        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", scoreColor(score))}
                style={{ width: `${score}%` }}
              />
            </div>

            <span className="text-xs font-medium text-muted-foreground">
              {score}
            </span>
          </div>
        )
      },
    }),

    // -------------------------------------------------------------------------
    // Owner
    // -------------------------------------------------------------------------

    columnHelper.accessor((row) => row.owner.name, {
      id: "owner",

      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="flex items-center gap-1.5"
        >
          Owner
          <ArrowUpDownIcon className="size-3.5" />
        </button>
      ),

      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-6">
            <AvatarFallback className="text-[10px]">
              {initials(row.original.owner.name)}
            </AvatarFallback>
          </Avatar>

          <span className="text-sm">{row.original.owner.name}</span>
        </div>
      ),
    }),

    // -------------------------------------------------------------------------
    // Last Activity
    // -------------------------------------------------------------------------

    columnHelper.accessor("lastActivity", {
      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="flex items-center gap-1.5"
        >
          Last Activity
          <ArrowUpDownIcon className="size-3.5" />
        </button>
      ),

      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.lastActivity}
        </span>
      ),
    }),

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------

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
            <DropdownMenuItem className="gap-2">
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