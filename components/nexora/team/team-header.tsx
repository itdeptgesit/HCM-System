import { UserPlus } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

interface TeamHeaderProps {
  memberCount: number
  onInvite: () => void
}

export function TeamHeader({ memberCount, onInvite }: TeamHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
            {memberCount} members
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your sales team, roles and performance.
        </p>
      </div>

      <Button onClick={onInvite} className="gap-2">
        <UserPlus className="h-4 w-4" />
        Invite Member
      </Button>
    </div>
  )
}
