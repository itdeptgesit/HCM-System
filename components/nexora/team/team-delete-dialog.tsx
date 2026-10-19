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
import type { TeamMember } from "./team-data"

interface TeamDeleteDialogProps {
  member: TeamMember
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (id: string) => void
}

export function TeamDeleteDialog({
  member,
  open,
  onOpenChange,
  onConfirm,
}: TeamDeleteDialogProps) {
  const isInvited = member.status === "Invited"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isInvited ? "Cancel this invite?" : "Remove from team?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{member.name}</span>{" "}
            ({member.email}){" "}
            {isInvited
              ? "will no longer be able to join with the invitation that was sent."
              : "will lose access to Nexora CRM. Their deals and leads will need to be reassigned."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => onConfirm(member.id)}
          >
            {isInvited ? "Cancel invite" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
