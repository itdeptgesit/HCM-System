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

type ContactsToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  selectedCount: number
  onBulkDelete: () => void
}

export function ContactsToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  selectedCount,
  onBulkDelete,
}: ContactsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
            value={status}
            onValueChange={(value) => onStatusChange(value ?? "all")}
            >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Lead">Lead</SelectItem>
            <SelectItem value="Lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

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