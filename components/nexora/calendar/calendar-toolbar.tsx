import { ChevronLeft, ChevronRight, Search } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { CALENDAR_VIEWS, type CalendarView } from "./calendar-data"

interface CalendarToolbarProps {
  label: string
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  search: string
  onSearchChange: (value: string) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export function CalendarToolbar({
  label,
  view,
  onViewChange,
  search,
  onSearchChange,
  onPrev,
  onNext,
  onToday,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onToday}>
          Today
        </Button>

        <div className="flex items-center">
          <Button
            variant="outline"
            size="icon"
            className="rounded-r-none"
            onClick={onPrev}
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="-ml-px rounded-l-none"
            onClick={onNext}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="ml-1 text-lg font-semibold tracking-tight">{label}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search events..."
            className="h-8 bg-background pl-9"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <Tabs
          value={view}
          onValueChange={(value) => onViewChange(value as CalendarView)}
        >
          <TabsList className="h-9">
            {CALENDAR_VIEWS.map(({ value, label: viewLabel }) => (
              <TabsTrigger key={value} value={value} className="px-3 text-xs">
                {viewLabel}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
