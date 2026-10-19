"use client"

import { Search, SlidersHorizontal, X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import type { ActivityStatus, ActivityType } from "./activity-data"

export type ActivityDateFilter =
  | "all"
  | "today"
  | "next7days"
  | "past7days"

export type ActivityFilters = {
  type: ActivityType | "all"
  status: ActivityStatus | "all"
  date: ActivityDateFilter
}

type ActivitiesToolbarProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  filters: ActivityFilters
  onFiltersChange: (filters: ActivityFilters) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export function ActivitiesToolbar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  hasActiveFilters,
  onClearFilters,
}: ActivitiesToolbarProps) {
  const updateFilter = <K extends keyof ActivityFilters>(
    key: K,
    value: ActivityFilters[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Activity Type */}
          <Select
            value={filters.type}
            onValueChange={(val) =>
              updateFilter("type", val as ActivityFilters["type"])
            }
          >
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue placeholder="Activity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Call">Calls</SelectItem>
              <SelectItem value="Meeting">Meetings</SelectItem>
              <SelectItem value="Email">Emails</SelectItem>
              <SelectItem value="Task">Tasks</SelectItem>
              <SelectItem value="Note">Notes</SelectItem>
            </SelectContent>
          </Select>

          {/* Status */}
          <Select
            value={filters.status}
            onValueChange={(val) =>
              updateFilter("status", val as ActivityFilters["status"])
            }
          >
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Upcoming">Upcoming</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Date */}
          <Select
            value={filters.date}
            onValueChange={(val) =>
              updateFilter("date", val as ActivityDateFilter)
            }
          >
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="next7days">Next 7 Days</SelectItem>
              <SelectItem value="past7days">Past 7 Days</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <SlidersHorizontal className="h-3 w-3" />
            <span>Active filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {searchQuery && (
              <Badge variant="outline" className="h-6 gap-1 text-[11px] font-normal">
                Search: "{searchQuery}"
                <X
                  className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => onSearchChange("")}
                />
              </Badge>
            )}
            {filters.type !== "all" && (
              <Badge variant="outline" className="h-6 gap-1 text-[11px] font-normal">
                Type: {filters.type}
                <X
                  className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => updateFilter("type", "all")}
                />
              </Badge>
            )}
            {filters.status !== "all" && (
              <Badge variant="outline" className="h-6 gap-1 text-[11px] font-normal">
                Status: {filters.status}
                <X
                  className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => updateFilter("status", "all")}
                />
              </Badge>
            )}
            {filters.date !== "all" && (
              <Badge variant="outline" className="h-6 gap-1 text-[11px] font-normal">
                Date: {filters.date}
                <X
                  className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => updateFilter("date", "all")}
                />
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}