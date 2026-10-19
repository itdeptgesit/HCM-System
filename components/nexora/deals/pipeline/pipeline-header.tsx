import { Plus } from "lucide-react"

import { formatDealValue } from "@/components/nexora/deals/deals-data"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

interface PipelineHeaderProps {
  dealCount: number
  totalValue: number
  onCreate: () => void
}

export function PipelineHeader({
  dealCount,
  totalValue,
  onCreate,
}: PipelineHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sales Pipeline
          </h1>
          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
            {dealCount} deals
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your sales pipeline, track deals across stages, and predict
          revenue.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="mr-2 hidden text-right md:block">
          <div className="text-xs text-muted-foreground">
            Total Pipeline Value
          </div>
          <div className="text-lg font-bold tracking-tight text-foreground">
            {formatDealValue(totalValue)}
          </div>
        </div>
        <Button onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Deal
        </Button>
      </div>
    </div>
  )
}