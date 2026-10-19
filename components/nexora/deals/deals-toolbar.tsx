"use client"

import { SearchIcon, Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

type DealsToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
  stage: string
  onStageChange: (value: string) => void
  selectedCount: number
  onBulkDelete: () => void
}

export function DealsToolbar({
  search,
  onSearchChange,
  stage,
  onStageChange,
  selectedCount,
  onBulkDelete,
}: DealsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            placeholder="Search deals..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-9"
          />
        </div>

        {/* Stage filter */}
        <Select
            value={stage}
            onValueChange={(value) => {
                if (value !== null) {
                    onStageChange(value)
                }
            }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="Qualification">Qualification</SelectItem>
            <SelectItem value="Proposal">Proposal</SelectItem>
            <SelectItem value="Negotiation">Negotiation</SelectItem>
            <SelectItem value="Won">Won</SelectItem>
            <SelectItem value="Lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action */}
      {selectedCount > 0 && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onBulkDelete}
          className="gap-1.5"
        >
          <Trash2Icon className="size-4" />
          Delete ({selectedCount})
        </Button>
      )}
    </div>
  )
}