"use client"

import {
  AlertTriangleIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

type DealsDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targets: string[]
  onConfirm: () => void
}

export function DealsDeleteDialog({
  open,
  onOpenChange,
  targets,
  onConfirm,
}: DealsDeleteDialogProps) {
  const isBulkDelete = targets.length > 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangleIcon className="size-5" />
          </div>

          <DialogTitle>
            {isBulkDelete ? "Delete selected deals?" : "Delete deal?"}
          </DialogTitle>

          <DialogDescription>
            {isBulkDelete
              ? `Are you sure you want to delete these ${targets.length} deals? This action cannot be undone.`
              : `Are you sure you want to delete "${targets[0] ?? "this deal"}"? This action cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        {isBulkDelete && (
          <div className="max-h-32 overflow-y-auto rounded-md border p-3">
            <ul className="space-y-1 text-sm text-muted-foreground">
              {targets.map((target) => (
                <li key={target} className="truncate">
                  • {target}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={targets.length === 0}
          >
            <Trash2Icon className="mr-2 size-4" />
            {isBulkDelete ? "Delete deals" : "Delete deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}