
"use client"

import {
  Building2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  UserRoundIcon,
  EyeIcon,
} from "lucide-react"

import {
  createColumnHelper,
  tableFeatures,
  rowSelectionFeature,
  rowSortingFeature,
  rowPaginationFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  createSortedRowModel,
  createPaginatedRowModel,
  createFilteredRowModel,
} from "@tanstack/react-table"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import {
  dealStageStyles,
  formatDealValue,
  type Deal,
} from "./deals-data"

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

const columnHelper = createColumnHelper<typeof features, Deal>()

type CreateDealsColumnsProps = {
  onDelete: (deal: Deal) => void
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

const companyDomains: Record<string, string> = {
  Google: "google.com",
  Stripe: "stripe.com",
  "Dzen.ru": "dzen.ru",
  Figma: "figma.com",
  Notion: "notion.so",
  Patreon: "patreon.com",
  Okta: "okta.com",
  Airtable: "airtable.com",
  Vercel: "vercel.com",
}

function getCompanyLogoUrl(company: string) {
  const domain = companyDomains[company]

  return domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    : undefined
}

function getContactAvatarUrl(name: string) {
  return `https://i.pravatar.cc/80?u=${encodeURIComponent(name)}`
}

export function createDealsColumns({
  onDelete,
}: CreateDealsColumnsProps) {
  return [
    columnHelper.display({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(checked) =>
            table.toggleAllPageRowsSelected(!!checked)
          }
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(!!checked)}
          aria-label={`Select ${row.original.name}`}
        />
      ),
      enableSorting: false,
    }),

    columnHelper.accessor("name", {
      header: "Deal",
      cell: ({ row }) => {
  const deal = row.original
  const logoUrl = getCompanyLogoUrl(deal.company)

  return (
    <div className="flex min-w-48 items-center gap-3">
      <Avatar
        shape="square"
        className="size-10 shrink-0 rounded-lg bg-background"
      >
        {logoUrl && (
          <AvatarImage
            src={logoUrl}
            alt={`${deal.company} logo`}
            className="rounded-lg object-contain p-1.5"
          />
        )}
        <AvatarFallback className="rounded-lg">
          <Building2Icon className="size-5 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 space-y-0.5">
        <p className="truncate font-medium">{deal.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {deal.company}
        </p>
      </div>
    </div>
  )
},
    }),

    columnHelper.accessor("contact", {
  header: "Contact",
  cell: ({ row }) => (
    <div className="flex items-center gap-2">
      <Avatar className="size-8">
        <AvatarImage
          src={
            row.original.contactAvatar ||
            getContactAvatarUrl(row.original.contact)
          }
          alt={row.original.contact}
        />
        <AvatarFallback className="text-xs">
          {getInitials(row.original.contact)}
        </AvatarFallback>
      </Avatar>

      <span className="whitespace-nowrap text-sm">
        {row.original.contact}
      </span>
    </div>
  ),
}),

    columnHelper.accessor("value", {
      header: "Deal Value",
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          {formatDealValue(getValue())}
        </span>
      ),
    }),

    columnHelper.accessor("stage", {
      header: "Stage",
      cell: ({ getValue }) => {
        const stage = getValue()

        return (
          <Badge
            variant="outline"
            className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${dealStageStyles[stage]}`}
          >
            {stage}
          </Badge>
        )
      },
    }),

    columnHelper.accessor("probability", {
      header: "Probability",
      cell: ({ getValue }) => {
        const probability = getValue()

        return (
          <div className="flex min-w-24 items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${probability}%` }}
              />
            </div>
            <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
              {probability}%
            </span>
          </div>
        )
      },
    }),

    columnHelper.accessor("expectedClose", {
      header: "Expected Close",
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {getValue()}
        </span>
      ),
    }),

    columnHelper.accessor("owner", {
  header: "Owner",
  cell: ({ row }) => (
    <div className="flex items-center gap-2">
      <Avatar className="size-8">
        {row.original.ownerAvatar && (
          <AvatarImage
            src={row.original.ownerAvatar}
            alt={row.original.owner}
          />
        )}
        <AvatarFallback className="text-xs">
          {getInitials(row.original.owner)}
        </AvatarFallback>
      </Avatar>

      <span className="whitespace-nowrap text-sm">
        {row.original.owner}
      </span>
    </div>
  ),
}),

    columnHelper.accessor("lastActivity", {
      header: "Last Activity",
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {getValue()}
        </span>
      ),
    }),

    columnHelper.display({
      id: "actions",
      cell: ({ row }) => {
        const deal = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                />
              }
            >
              <MoreHorizontalIcon className="size-4" />
              <span className="sr-only">Open actions</span>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem className="gap-2">
                <EyeIcon className="size-4" />
                View
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2">
                <PencilIcon className="size-4" />
                Edit
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="gap-2 text-red-600 focus:text-red-600"
                onClick={() => onDelete(deal)}
              >
                <Trash2Icon className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
    }),
  ]
}