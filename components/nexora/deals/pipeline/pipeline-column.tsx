import {
  formatDealValue,
  type Deal,
  type DealStage,
} from "@/components/nexora/deals/deals-data"
import { Badge } from "@workspace/ui/components/badge"
import { STAGE_DOT_COLORS } from "./pipeline-constants"
import { PipelineCard } from "./pipeline-card"

interface PipelineColumnProps {
  stage: DealStage
  deals: Deal[]
  onDelete: (id: string) => void
  onMove: (id: string, stage: DealStage) => void
}

export function PipelineColumn({ stage, deals, onDelete, onMove }: PipelineColumnProps) {
  const totalValue = deals.reduce((total, deal) => total + deal.value, 0)

  return (
    <div className="flex w-[340px] min-w-[310px] shrink-0 flex-col rounded-xl bg-muted/40 p-3">
      {/* Stage Header */}
      <div className="mb-3 flex items-center justify-between border-b px-1 pb-3 pt-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${STAGE_DOT_COLORS[stage]}`} />
          <h2 className="text-sm font-semibold text-foreground">{stage}</h2>
          <Badge variant="outline" className="h-5 px-1.5 text-xs font-medium">
            {deals.length}
          </Badge>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          {formatDealValue(totalValue)}
        </span>
      </div>

      {/* Cards */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
        {deals.map((deal) => (
          <PipelineCard
            key={deal.id}
            deal={deal}
            onDelete={onDelete}
            onMove={onMove}
          />
        ))}

        {deals.length === 0 && (
          <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center">
            <p className="text-xs text-muted-foreground">
              No deals in {stage.toLowerCase()}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}