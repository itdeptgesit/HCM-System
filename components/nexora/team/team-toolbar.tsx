import { CircleDot, LayoutGrid, List, Search, Shield, X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import {
  TEAM_ROLES,
  TEAM_STATUSES,
  type TeamRole,
  type TeamStatus,
  type TeamView,
} from "./team-data"
import { TeamFilterMenu } from "./team-filter-menu"
import type { TeamFilters } from "./team-utils"

interface TeamToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  filters: TeamFilters
  onFiltersChange: (filters: TeamFilters) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  view: TeamView
  onViewChange: (view: TeamView) => void
}

const ROLE_OPTIONS = [
  { value: "all", label: "Any role" },
  ...TEAM_ROLES.map((role) => ({ value: role, label: role })),
]

const STATUS_OPTIONS = [
  { value: "all", label: "Any status" },
  ...TEAM_STATUSES.map((status) => ({ value: status, label: status })),
]

export function TeamToolbar({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  hasActiveFilters,
  onClearFilters,
  view,
  onViewChange,
}: TeamToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email, title..."
            className="h-9 w-full bg-background pl-9"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <TeamFilterMenu
          label="Role"
          icon={Shield}
          value={filters.role}
          options={ROLE_OPTIONS}
          onChange={(value) =>
            onFiltersChange({ ...filters, role: value as "all" | TeamRole })
          }
        />
        <TeamFilterMenu
          label="Status"
          icon={CircleDot}
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(value) =>
            onFiltersChange({ ...filters, status: value as "all" | TeamStatus })
          }
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-muted-foreground"
            onClick={onClearFilters}
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <Tabs value={view} onValueChange={(v) => onViewChange(v as TeamView)}>
        <TabsList className="grid h-9 w-[120px] grid-cols-2">
          <TabsTrigger value="grid" className="px-2" aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="list" className="px-2" aria-label="List view">
            <List className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
