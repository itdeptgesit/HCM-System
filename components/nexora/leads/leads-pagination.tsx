"use client"

import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"

type LeadsPaginationProps = {
  selectedCount: number
  filteredCount: number
  totalCount: number
}

export function LeadsPagination({
  selectedCount,
  filteredCount,
  totalCount,
}: LeadsPaginationProps) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        {selectedCount > 0
          ? `${selectedCount} of ${filteredCount} selected`
          : `Showing ${filteredCount} of ${totalCount} leads`}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled
        >
          <ChevronLeftIcon className="size-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  )
}