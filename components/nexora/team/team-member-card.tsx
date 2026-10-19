import { Mail, MapPin } from "lucide-react"

import { formatDealValue } from "@/components/nexora/deals/deals-data"
import { Badge } from "@workspace/ui/components/badge"
import { Card } from "@workspace/ui/components/card"
import { RoleBadge, StatusBadge } from "./team-badges"
import type { TeamMember, TeamRole, TeamStatus } from "./team-data"
import { TeamMemberActions } from "./team-member-actions"
import { TeamMemberAvatar } from "./team-member-avatar"
import { getAttainmentStyle, getQuotaAttainment } from "./team-utils"

interface TeamMemberCardProps {
  member: TeamMember
  onEdit: (member: TeamMember) => void
  onChangeRole: (id: string, role: TeamRole) => void
  onSetStatus: (id: string, status: TeamStatus) => void
  onRemove: (id: string) => void
}

export function TeamMemberCard({
  member,
  onEdit,
  onChangeRole,
  onSetStatus,
  onRemove,
}: TeamMemberCardProps) {
  const attainment = getQuotaAttainment(member)
  const style = getAttainmentStyle(attainment)
  const isMuted = member.status === "Deactivated"

  return (
    <Card
      className={`gap-0 border-border/70 py-0 shadow-xs transition-all duration-200 hover:border-border hover:shadow-md ${
        isMuted ? "opacity-70" : ""
      }`}
    >
      <div className="space-y-4 p-4">
        {/* Identity */}
        <div className="flex items-start gap-3">
          <TeamMemberAvatar member={member} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold leading-tight">
                {member.name}
              </h3>
              {member.isYou && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  You
                </Badge>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {member.title || "No title"}
            </p>
          </div>

          <TeamMemberActions
            member={member}
            onEdit={onEdit}
            onChangeRole={onChangeRole}
            onSetStatus={onSetStatus}
            onRemove={onRemove}
          />
        </div>

        {/* Role + status */}
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role={member.role} />
          <StatusBadge status={member.status} />
        </div>

        {/* Contact */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{member.email}</span>
          </div>
          {member.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{member.location}</span>
            </div>
          )}
        </div>

        {/* Performance */}
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center">
          <div>
            <div className="text-base font-bold leading-tight">{member.openDeals}</div>
            <div className="text-[11px] text-muted-foreground">Open</div>
          </div>
          <div>
            <div className="text-base font-bold leading-tight">{member.dealsWon}</div>
            <div className="text-[11px] text-muted-foreground">Won</div>
          </div>
          <div>
            <div className="text-base font-bold leading-tight">
              {formatDealValue(member.revenue)}
            </div>
            <div className="text-[11px] text-muted-foreground">Revenue</div>
          </div>
        </div>

        {/* Quota */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Quota attainment</span>
            <span className={`font-semibold ${style.text}`}>
              {attainment === null ? "No quota" : `${attainment}%`}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${style.bar}`}
              style={{ width: `${Math.min(attainment ?? 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2.5 text-[11px] text-muted-foreground">
        <span>Joined {member.joined}</span>
        <span>{member.lastActive}</span>
      </div>
    </Card>
  )
}
