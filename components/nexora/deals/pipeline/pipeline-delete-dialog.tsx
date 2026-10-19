import type { Deal } from "@/components/nexora/deals/deals-data"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"

interface PipelineDeleteDialogProps {
  deal: Deal
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (id: string) => void
}

export function PipelineDeleteDialog({
  deal,
  open,
  onOpenChange,
  onConfirm,
}: PipelineDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{deal.name}</span>{" "}
            ({deal.company}) will be permanently removed from your pipeline.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => onConfirm(deal.id)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}