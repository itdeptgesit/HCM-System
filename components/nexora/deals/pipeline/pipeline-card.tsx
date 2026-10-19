import { useState } from "react"
import {
  ArrowRightLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
  XCircle,
} from "lucide-react"

import {
  formatDealValue,
  type Deal,
  type DealStage,
} from "@/components/nexora/deals/deals-data"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Card } from "@workspace/ui/components/card"
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
import {
  PIPELINE_STAGES,
  STAGE_DOT_COLORS,
  getInitials,
} from "./pipeline-constants"
import { PipelineDeleteDialog } from "./pipeline-delete-dialog"

interface PipelineCardProps {
  deal: Deal
  onDelete: (id: string) => void
  onMove: (id: string, stage: DealStage) => void
  onEdit?: (deal: Deal) => void
}

function getProbabilityStyle(probability: number) {
  if (probability >= 70)
    return {
      bar: "bg-emerald-500",
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    }
  if (probability >= 40)
    return {
      bar: "bg-amber-500",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    }
  return {
    bar: "bg-rose-500",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  }
}

export function PipelineCard({
  deal,
  onDelete,
  onMove,
  onEdit,
}: PipelineCardProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const prob = getProbabilityStyle(deal.probability)

  return (
    <>
      <Card className="group relative shrink-0 gap-0 border-border/70 bg-card py-0 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
        <div className="space-y-3 p-3.5">
          {/* Top: company + title + menu */}
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Building2 className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold leading-tight">
                {deal.name}
              </h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {deal.company}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 data-[popup-open]:opacity-100 group-hover:opacity-100">
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
                      {PIPELINE_STAGES.filter((s) => s !== deal.stage).map(
                        (stage) => (
                          <DropdownMenuItem
                            key={stage}
                            onClick={() => onMove(deal.id, stage)}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${STAGE_DOT_COLORS[stage]}`}
                            />
                            {stage}
                          </DropdownMenuItem>
                        )
                      )}
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
          </div>

          {/* Value + probability */}
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <span className="text-xl font-bold leading-none tracking-tight">
                {formatDealValue(deal.value)}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${prob.badge}`}
              >
                {deal.probability}%
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${prob.bar}`}
                style={{ width: `${deal.probability}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
          <div className="flex min-w-0 items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{deal.contact}</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {deal.expectedClose && (
              <div
                className="flex items-center gap-1 text-[11px]"
                title={`Expected Close: ${deal.expectedClose}`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{deal.expectedClose}</span>
              </div>
            )}
            <Avatar className="h-6 w-6 border" title={deal.owner}>
              <AvatarFallback className="bg-background text-[10px] font-medium">
                {getInitials(deal.owner)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </Card>

      <PipelineDeleteDialog
        deal={deal}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={onDelete}
      />
    </>
  )
}