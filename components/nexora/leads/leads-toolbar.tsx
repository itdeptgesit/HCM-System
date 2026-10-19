"use client"

import { SearchIcon } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

type LeadsToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
  status: {
    value: string
    options: string[]
    onChange: (value: string) => void
  }
}

export function LeadsToolbar({
  search,
  onSearchChange,
  status,
}: LeadsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full sm:w-72">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          placeholder="Search leads..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8"
        />
      </div>

      <div className="max-w-full">
        <Tabs
          value={status.value}
          onValueChange={(value) => status.onChange(String(value))}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>

            {status.options.map((option) => (
              <TabsTrigger key={option} value={option}>
                {option}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}