
"use client"
import { Link } from "@tanstack/react-router"
import {
  ArrowUpDownIcon,
  Building2Icon,
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
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import {
  companyStatusStyles,
  getCompanyInitials,
  type Company,
} from "./companies-data"

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

const columnHelper = createColumnHelper<typeof features, Company>()

type CompanyColumnActions = {
  onView: (company: Company) => void
  onEdit: (company: Company) => void
  onDelete: (company: Company) => void
}

export const createCompaniesColumns = ({
  onView,
  onEdit,
  onDelete,
}: CompanyColumnActions) =>
  columnHelper.columns([
    // Selection
    columnHelper.display({
    id: "select",
    header: ({ table }) => (
        <Checkbox
        checked={table.getIsAllPageRowsSelected() === true}
        onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(value === true)
        }
        aria-label="Select all companies"
        />
    ),
    cell: ({ row }) => (
        <Checkbox
        checked={row.getIsSelected() === true}
        onCheckedChange={(value) =>
            row.toggleSelected(value === true)
        }
        aria-label="Select company"
        />
    ),
    }),

    // Company
    columnHelper.accessor("name", {
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
      cell: ({ row }) => {
        const company = row.original

        return (
          <div className="flex items-center gap-3">
            <Avatar shape="square" className="bg-muted/0">
              <AvatarImage
                src={company.logoUrl}
                alt={`${company.name} logo`}
                className="object-contain p-1"
              />
              <AvatarFallback>
                {getCompanyInitials(company.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 space-y-0.5">
              <Link
                to="/companies/$companyId"
                params={{ companyId: company.id }}
                className="block truncate text-sm font-medium hover:underline"
              >
                {company.name}
              </Link>
              <span className="block truncate text-xs text-muted-foreground">
                {company.website}
              </span>
            </div>
          </div>
        )
      },
    }),

    // Industry
    columnHelper.accessor("industry", {
      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="flex items-center gap-1.5"
        >
          Industry
          <ArrowUpDownIcon className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.industry}</span>
      ),
    }),

    // Employees
    columnHelper.accessor("employees", {
      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="flex items-center gap-1.5"
        >
          Employees
          <ArrowUpDownIcon className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.employees}
        </span>
      ),
    }),

    // Contacts
    columnHelper.accessor("contactCount", {
      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="flex items-center gap-1.5"
        >
          Contacts
          <ArrowUpDownIcon className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {row.original.contactCount}
        </span>
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
            companyStatusStyles[row.original.status],
          )}
        >
          {row.original.status}
        </Badge>
      ),
    }),

    // Location
    columnHelper.accessor("location", {
      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="flex items-center gap-1.5"
        >
          Location
          <ArrowUpDownIcon className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.location}
        </span>
      ),
    }),

    // Last Activity
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

    // Actions
    columnHelper.display({
      id: "actions",
      header: () => null,
      cell: ({ row }) => {
        const company = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
                  aria-label={`Actions for ${company.name}`}
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
                    to="/companies/$companyId"
                    params={{ companyId: company.id }}
                  />
                }
              >
                <EyeIcon className="size-4" />
                <span>View</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="gap-2"
                onClick={() => onEdit(company)}
              >
                <PencilIcon className="size-4" />
                <span>Edit</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="gap-2 text-red-600 focus:text-red-600"
                onClick={() => onDelete(company)}
              >
                <TrashIcon className="size-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    }),
  ])