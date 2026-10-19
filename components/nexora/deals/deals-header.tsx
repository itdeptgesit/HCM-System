"use client"

import { PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

type DealsHeaderProps = {
  onCreate: () => void
}

export function DealsHeader({ onCreate }: DealsHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Deals
        </h1>

        <p className="text-sm text-muted-foreground">
          Track sales opportunities, manage pipelines, and close deals.
        </p>
      </div>

      <Button onClick={onCreate}>
        <PlusIcon className="size-4" />
        Add Deal
      </Button>
    </div>
  )
}