import { Badge } from "@workspace/ui/components/badge"
import {
  ROLE_CONFIG,
  STATUS_CONFIG,
  type TeamRole,
  type TeamStatus,
} from "./team-data"

export function RoleBadge({ role }: { role: TeamRole }) {
  const Icon = ROLE_CONFIG[role].icon

  return (
    <Badge variant="outline" className="gap-1.5 font-medium">
      <Icon className="h-3 w-3 text-muted-foreground" />
      {role}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: TeamStatus }) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${config.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  )
}
