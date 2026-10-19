import type { TeamMember, TeamRole } from "./team-data"

/** Form-friendly (all strings) version of a member. */
export interface MemberDraft {
  id?: string
  name: string
  email: string
  title: string
  role: TeamRole
  phone: string
  location: string
  quota: string
}

export interface MemberValues {
  name: string
  email: string
  title: string
  role: TeamRole
  phone?: string
  location?: string
  quota: number
}

export function createDraft(): MemberDraft {
  return {
    name: "",
    email: "",
    title: "",
    role: "Sales Rep",
    phone: "",
    location: "",
    quota: "",
  }
}

export function draftFromMember(member: TeamMember): MemberDraft {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    title: member.title,
    role: member.role,
    phone: member.phone ?? "",
    location: member.location ?? "",
    quota: member.quota ? String(member.quota) : "",
  }
}

export function draftToValues(
  draft: MemberDraft,
): { values: MemberValues } | { error: string } {
  const name = draft.name.trim()
  const email = draft.email.trim()
  const quota = draft.quota.trim() === "" ? 0 : Number(draft.quota)

  if (!name) return { error: "Please enter the member's name." }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email address." }
  if (!Number.isFinite(quota) || quota < 0) return { error: "Quota must be a positive number." }

  return {
    values: {
      name,
      email,
      title: draft.title.trim(),
      role: draft.role,
      phone: draft.phone.trim() || undefined,
      location: draft.location.trim() || undefined,
      quota,
    },
  }
}
