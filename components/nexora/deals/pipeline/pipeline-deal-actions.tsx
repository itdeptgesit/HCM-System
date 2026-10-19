import { useState } from "react"
import {
  ArrowRightLeft,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react"

import type { Deal, DealStage } from "@/components/nexora/deals/deals-data"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { PIPELINE_STAGES, STAGE_DOT_COLORS } from "./pipeline-constants"
import { PipelineDeleteDialog } from "./pipeline-delete-dialog"

interface PipelineDealActionsProps {
  deal: Deal
  onDelete: (id: string) => void
  onMove: (id: string, stage: DealStage) => void
  onEdit?: (deal: Deal) => void
  triggerClassName?: string
}

export function PipelineDealActions({
  deal,
  onDelete,
  onMove,
  onEdit,
  triggerClassName = "",
}: PipelineDealActionsProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-opacity hover:bg-muted hover:text-foreground ${triggerClassName}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit?.(deal)}>
              <Pencil /> Edit Deal
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRightLeft /> Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {PIPELINE_STAGES.filter((s) => s !== deal.stage).map((stage) => (
                  <DropdownMenuItem
                    key={stage}
                    onClick={() => onMove(deal.id, stage)}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${STAGE_DOT_COLORS[stage]}`}
                    />
                    {stage}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            {deal.stage !== "Won" && (
              <DropdownMenuItem onClick={() => onMove(deal.id, "Won")}>
                <CheckCircle2 className="text-emerald-500" /> Mark as Won
              </DropdownMenuItem>
            )}
            {deal.stage !== "Lost" && (
              <DropdownMenuItem onClick={() => onMove(deal.id, "Lost")}>
                <XCircle className="text-rose-500" /> Mark as Lost
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PipelineDeleteDialog
        deal={deal}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={onDelete}
      />
    </>
  )
}