import type { TeamMember, TeamRole, TeamStatus } from "./team-data"

export interface TeamFilters {
  role: "all" | TeamRole
  status: "all" | TeamStatus
}

export const DEFAULT_TEAM_FILTERS: TeamFilters = { role: "all", status: "all" }

export function getInitials(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
  return initials || "U"
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
]

/** Same name always gets the same colour. */
export function getAvatarColor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

/** Revenue as a % of quota, or null when the member has no quota. */
export function getQuotaAttainment(member: TeamMember) {
  if (member.quota <= 0) return null
  return Math.round((member.revenue / member.quota) * 100)
}

export function getAttainmentStyle(percent: number | null) {
  if (percent === null) return { bar: "bg-muted-foreground/30", text: "text-muted-foreground" }
  if (percent >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }
  if (percent >= 50) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" }
  return { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" }
}

export function applyTeamFilters(
  members: TeamMember[],
  search: string,
  filters: TeamFilters,
) {
  const query = search.trim().toLowerCase()

  return members.filter((member) => {
    const matchesSearch =
      !query ||
      [member.name, member.email, member.title, member.location ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query)

    return (
      matchesSearch &&
      (filters.role === "all" || member.role === filters.role) &&
      (filters.status === "all" || member.status === filters.status)
    )
  })
}
