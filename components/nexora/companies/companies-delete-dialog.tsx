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

import type { Company } from "./companies-data"

type CompaniesDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targets: Company[]
  onConfirm: () => void
}

export function CompaniesDeleteDialog({
  open,
  onOpenChange,
  targets,
  onConfirm,
}: CompaniesDeleteDialogProps) {
  const isBulkDelete = targets.length > 1

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBulkDelete ? "Delete companies?" : "Delete company?"}
          </AlertDialogTitle>

          <AlertDialogDescription>
            {isBulkDelete ? (
              <>
                Are you sure you want to delete these{" "}
                <span className="font-medium text-foreground">
                  {targets.length} companies
                </span>
                ? This action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">
                  {targets[0]?.name ?? "this company"}
                </span>
                ? This action cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>

          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
          >
            Delete {isBulkDelete ? "companies" : "company"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}