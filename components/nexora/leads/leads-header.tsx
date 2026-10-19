"use client"

import { DownloadIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { Link } from "@tanstack/react-router"
import { Button, buttonVariants } from "@workspace/ui/components/button"

type LeadsHeaderProps = {
  selectedCount: number
  onDeleteSelected: () => void
}

export function LeadsHeader({
  selectedCount,
  onDeleteSelected,
}: LeadsHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>

        <p className="text-sm text-muted-foreground">
          Manage and track all incoming leads in one place.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {selectedCount > 0 && (
          <Button
            variant="destructive"
            className="gap-1.5"
            onClick={onDeleteSelected}
          >
            <Trash2Icon className="size-4" />
            Delete ({selectedCount})
          </Button>
        )}

        <Button variant="outline" className="gap-1.5">
          <DownloadIcon className="size-4" />
          Export
        </Button>

        <Link to="/leads/new" className={buttonVariants()}>
          <PlusIcon className="size-4" />
          Add Lead
        </Link>
      </div>
    </div>
  )
}