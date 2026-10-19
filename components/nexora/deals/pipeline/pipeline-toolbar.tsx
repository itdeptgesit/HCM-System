import { useNavigate } from "@tanstack/react-router"
import { DollarSign, LayoutGrid, List, Search, Target, User, X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import {
  PROBABILITY_OPTIONS,
  VALUE_OPTIONS,
  type PipelineFilters,
  type ProbabilityFilter,
  type ValueFilter,
} from "./pipeline-constants"
import { PipelineFilterMenu } from "./pipeline-filter-menu"

interface PipelineToolbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  filters: PipelineFilters
  onFiltersChange: (filters: PipelineFilters) => void
  owners: string[]
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export function PipelineToolbar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  owners,
  hasActiveFilters,
  onClearFilters,
}: PipelineToolbarProps) {
  const navigate = useNavigate()
  const ownerOptions = [
    { value: "all", label: "Any owner" },
    ...owners.map((o) => ({ value: o, label: o })),
  ]

  return (
    <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Filter deals by name, company, contact..."
            className="h-9 w-full bg-background pl-9"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <PipelineFilterMenu
          label="Owner"
          icon={User}
          value={filters.owner}
          options={ownerOptions}
          onChange={(owner) => onFiltersChange({ ...filters, owner })}
        />
        <PipelineFilterMenu
          label="Probability"
          icon={Target}
          value={filters.probability}
          options={PROBABILITY_OPTIONS}
          onChange={(v) =>
            onFiltersChange({ ...filters, probability: v as ProbabilityFilter })
          }
        />
        <PipelineFilterMenu
          label="Value"
          icon={DollarSign}
          value={filters.value}
          options={VALUE_OPTIONS}
          onChange={(v) => onFiltersChange({ ...filters, value: v as ValueFilter })}
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

      <Tabs
        value="kanban"
        onValueChange={(v) => {
          if (v === "list") navigate({ to: "/deals" })
        }}
      >
        <TabsList className="grid h-9 w-[120px] grid-cols-2">
          <TabsTrigger value="kanban" className="px-2">
            <LayoutGrid className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="list" className="px-2">
            <List className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}