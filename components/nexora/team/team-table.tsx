import { formatDealValue } from "@/components/nexora/deals/deals-data"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { RoleBadge, StatusBadge } from "./team-badges"
import type { TeamMember, TeamRole, TeamStatus } from "./team-data"
import { TeamMemberActions } from "./team-member-actions"
import { TeamMemberAvatar } from "./team-member-avatar"
import { getAttainmentStyle, getQuotaAttainment } from "./team-utils"

interface TeamTableProps {
  members: TeamMember[]
  onEdit: (member: TeamMember) => void
  onChangeRole: (id: string, role: TeamRole) => void
  onSetStatus: (id: string, status: TeamStatus) => void
  onRemove: (id: string) => void
}

export function TeamTable({
  members,
  onEdit,
  onChangeRole,
  onSetStatus,
  onRemove,
}: TeamTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-4">Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Open</TableHead>
            <TableHead className="text-right">Won</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="min-w-[150px]">Quota</TableHead>
            <TableHead>Last active</TableHead>
            <TableHead className="w-12 pr-4" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {members.map((member) => {
            const attainment = getQuotaAttainment(member)
            const style = getAttainmentStyle(attainment)

            return (
              <TableRow
                key={member.id}
                className={member.status === "Deactivated" ? "opacity-60" : ""}
              >
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <TeamMemberAvatar member={member} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{member.name}</span>
                        {member.isYou && (
                          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {member.email}
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <RoleBadge role={member.role} />
                </TableCell>

                <TableCell>
                  <StatusBadge status={member.status} />
                </TableCell>

                <TableCell className="text-right tabular-nums">
                  {member.openDeals}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {member.dealsWon}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatDealValue(member.revenue)}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${style.bar}`}
                        style={{ width: `${Math.min(attainment ?? 0, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold ${style.text}`}>
                      {attainment === null ? "—" : `${attainment}%`}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {member.lastActive}
                </TableCell>

                <TableCell className="pr-4">
                  <TeamMemberActions
                    member={member}
                    onEdit={onEdit}
                    onChangeRole={onChangeRole}
                    onSetStatus={onSetStatus}
                    onRemove={onRemove}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
