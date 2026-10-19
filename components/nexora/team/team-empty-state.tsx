import { SearchX } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export function TeamEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <SearchX className="h-8 w-8 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium">No team members found</p>
        <p className="text-xs text-muted-foreground">
          Try a different search or clear the filters.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  )
}
