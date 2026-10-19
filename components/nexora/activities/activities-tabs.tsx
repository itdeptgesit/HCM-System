"use client"

import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Badge } from "@workspace/ui/components/badge"

import type { ActivityStatus } from "./activity-data"

export type ActivityTab = "all" | ActivityStatus

type ActivitiesTabsProps = {
  value: ActivityTab
  onValueChange: (value: ActivityTab) => void
  counts: Record<ActivityTab, number>
}

const tabs: { value: ActivityTab; label: string }[] = [
  { value: "all", label: "All Activities" },
  { value: "Upcoming", label: "Upcoming" },
  { value: "Overdue", label: "Overdue" },
  { value: "Completed", label: "Completed" },
]

export function ActivitiesTabs({
  value,
  onValueChange,
  counts,
}: ActivitiesTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(nextValue) =>
        onValueChange(nextValue as ActivityTab)
      }
      className="w-full"
    >
      {/* 
        Mobile: Horizontal scrollable container with hidden scrollbar 
        Tablet (sm): 2-column grid 
        Desktop (lg): Inline flexible bar 
      */}
      <div className="w-full overflow-x-auto no-scrollbar">
        <TabsList className="inline-flex min-w-full justify-start p-1 sm:grid sm:grid-cols-2 sm:w-full lg:inline-flex lg:w-auto">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex shrink-0 items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium transition-all"
            >
              <span className="whitespace-nowrap">{tab.label}</span>
              <Badge
                variant="secondary"
                className="h-5 shrink-0 rounded-full px-1.5 text-[10px] font-normal"
              >
                {counts[tab.value] ?? 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  )
}