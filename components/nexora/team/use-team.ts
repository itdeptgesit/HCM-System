import { useMemo, useState } from "react"

import {
  initialMembers,
  type TeamMember,
  type TeamRole,
  type TeamStatus,
  type TeamView,
} from "./team-data"
import {
  createDraft,
  draftFromMember,
  type MemberDraft,
  type MemberValues,
} from "./team-draft"
import {
  DEFAULT_TEAM_FILTERS,
  applyTeamFilters,
  type TeamFilters,
} from "./team-utils"

export function useTeam() {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<TeamFilters>(DEFAULT_TEAM_FILTERS)
  const [view, setView] = useState<TeamView>("grid")

  // Invite / edit sheet. `key` forces a fresh form every time it opens.
  const [form, setForm] = useState<{ open: boolean; key: number; draft: MemberDraft }>(
    () => ({ open: false, key: 0, draft: createDraft() }),
  )

  const filteredMembers = useMemo(
    () => applyTeamFilters(members, search, filters),
    [members, search, filters],
  )

  const hasActiveFilters =
    search.trim() !== "" ||
    filters.role !== DEFAULT_TEAM_FILTERS.role ||
    filters.status !== DEFAULT_TEAM_FILTERS.status

  const clearFilters = () => {
    setSearch("")
    setFilters(DEFAULT_TEAM_FILTERS)
  }

  // Team-wide numbers for the stat cards (not affected by filters)
  const stats = useMemo(() => {
    const active = members.filter((m) => m.status === "Active").length
    const pending = members.filter((m) => m.status === "Invited").length
    const openDeals = members.reduce((sum, m) => sum + m.openDeals, 0)
    const dealsWon = members.reduce((sum, m) => sum + m.dealsWon, 0)
    const revenue = members.reduce((sum, m) => sum + m.revenue, 0)
    const quota = members.reduce((sum, m) => sum + m.quota, 0)

    return {
      total: members.length,
      active,
      pending,
      openDeals,
      dealsWon,
      revenue,
      quota,
      attainment: quota > 0 ? Math.round((revenue / quota) * 100) : 0,
    }
  }, [members])

  // ----- invite / edit -----
  const openInvite = () =>
    setForm((f) => ({ open: true, key: f.key + 1, draft: createDraft() }))

  const openEdit = (member: TeamMember) =>
    setForm((f) => ({ open: true, key: f.key + 1, draft: draftFromMember(member) }))

  const setFormOpen = (open: boolean) => setForm((f) => ({ ...f, open }))

  /** Returns an error message, or null when saved. */
  const saveMember = (values: MemberValues, id?: string) => {
    const email = values.email.toLowerCase()
    if (members.some((m) => m.id !== id && m.email.toLowerCase() === email)) {
      return "A team member with this email already exists."
    }

    if (id) {
      setMembers((current) =>
        current.map((m) => (m.id === id ? { ...m, ...values } : m)),
      )
    } else {
      setMembers((current) => [
        {
          id: `member-${Date.now()}`,
          ...values,
          status: "Invited",
          joined: "Pending",
          lastActive: "Invite sent",
          openDeals: 0,
          dealsWon: 0,
          revenue: 0,
        },
        ...current,
      ])
    }
    return null
  }

  // ----- row actions -----
  const changeRole = (id: string, role: TeamRole) =>
    setMembers((current) => current.map((m) => (m.id === id ? { ...m, role } : m)))

  const setStatus = (id: string, status: TeamStatus) =>
    setMembers((current) =>
      current.map((m) =>
        m.id === id
          ? { ...m, status, lastActive: status === "Active" ? "Active now" : m.lastActive }
          : m,
      ),
    )

  const removeMember = (id: string) =>
    setMembers((current) => current.filter((m) => m.id !== id))

  return {
    members,
    filteredMembers,
    stats,
    search,
    setSearch,
    filters,
    setFilters,
    hasActiveFilters,
    clearFilters,
    view,
    setView,
    form,
    setFormOpen,
    openInvite,
    openEdit,
    saveMember,
    changeRole,
    setStatus,
    removeMember,
  }
}
