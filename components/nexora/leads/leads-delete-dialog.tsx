"use client"

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

import type { Lead } from "./leads-data"

type LeadsDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targets: Lead[]
  onConfirm: () => void
}

export function LeadsDeleteDialog({
  open,
  onOpenChange,
  targets,
  onConfirm,
}: LeadsDeleteDialogProps) {
  const isSingle = targets.length === 1

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isSingle ? "Delete lead?" : `Delete ${targets.length} leads?`}
          </AlertDialogTitle>

          <AlertDialogDescription>
            This removes{" "}
            <span className="font-medium text-foreground">
              {isSingle ? targets[0]?.name : `${targets.length} selected leads`}
            </span>{" "}
            from your leads. This action can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}