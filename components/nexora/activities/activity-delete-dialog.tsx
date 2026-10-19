"use client"

import { AlertTriangle } from "lucide-react"

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
import { buttonVariants } from "@workspace/ui/components/button"

import type { Activity } from "./activity-data"

type ActivityDeleteDialogProps = {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (activity: Activity) => void
}

export function ActivityDeleteDialog({
  activity,
  open,
  onOpenChange,
  onConfirm,
}: ActivityDeleteDialogProps) {
  const handleDelete = () => {
    if (!activity) return

    onConfirm(activity)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <AlertDialogTitle className="text-lg font-semibold">
            Delete activity
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              "{activity?.title ?? "this activity"}"
            </span>
            ? This action cannot be undone and will permanently remove this
            record.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-2 flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <AlertDialogCancel className="mt-2 sm:mt-0">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className={buttonVariants({ variant: "destructive" })}
          >
            Delete activity
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}