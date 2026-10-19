import { useState } from "react"
import {
  ArrowRightLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  TEAM_ROLES,
  type TeamMember,
  type TeamRole,
  type TeamStatus,
} from "./team-data"
import { TeamDeleteDialog } from "./team-delete-dialog"

interface TeamMemberActionsProps {
  member: TeamMember
  onEdit: (member: TeamMember) => void
  onChangeRole: (id: string, role: TeamRole) => void
  onSetStatus: (id: string, status: TeamStatus) => void
  onRemove: (id: string) => void
}

export function TeamMemberActions({
  member,
  onEdit,
  onChangeRole,
  onSetStatus,
  onRemove,
}: TeamMemberActionsProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const isInvited = member.status === "Invited"
  const isDeactivated = member.status === "Deactivated"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${member.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground data-[popup-open]:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(member)}>
              <Pencil /> Edit details
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRightLeft /> Change role
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={member.role}
                  onValueChange={(role) => onChangeRole(member.id, role as TeamRole)}
                >
                  {TEAM_ROLES.map((role) => (
                    <DropdownMenuRadioItem key={role} value={role}>
                      {role}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          {!member.isYou && (
            <>
              <DropdownMenuSeparator />

              {!isInvited && (
                <DropdownMenuItem
                  onClick={() =>
                    onSetStatus(member.id, isDeactivated ? "Active" : "Deactivated")
                  }
                >
                  {isDeactivated ? (
                    <>
                      <UserCheck /> Reactivate
                    </>
                  ) : (
                    <>
                      <UserX /> Deactivate
                    </>
                  )}
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 /> {isInvited ? "Cancel invite" : "Remove from team"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <TeamDeleteDialog
        member={member}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={onRemove}
      />
    </>
  )
}
