import type { Deal, DealStage } from "@/components/nexora/deals/deals-data"
import { PIPELINE_STAGES } from "./pipeline-constants"
import { PipelineColumn } from "./pipeline-column"

interface PipelineBoardProps {
  deals: Deal[]
  onDelete: (id: string) => void
  onMove: (id: string, stage: DealStage) => void
}

export function PipelineBoard({ deals, onDelete, onMove }: PipelineBoardProps) {
  return (
    <div className="flex min-w-0 flex-1 gap-4 overflow-x-auto pb-6">
      {PIPELINE_STAGES.map((stage) => (
        <PipelineColumn
          key={stage}
          stage={stage}
          deals={deals.filter((deal) => deal.stage === stage)}
          onDelete={onDelete}
          onMove={onMove}
        />
      ))}
    </div>
  )
}