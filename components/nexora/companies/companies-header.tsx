"use client"

import { PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

type CompaniesHeaderProps = {
  onCreate: () => void
}

export function CompaniesHeader({
  onCreate,
}: CompaniesHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Companies
        </h1>

        <p className="text-sm text-muted-foreground">
          Manage your companies, track relationships, and organize
          business information.
        </p>
      </div>

      <Button onClick={onCreate}>
        <PlusIcon className="size-4" />
        Add Company
      </Button>
    </div>
  )
}