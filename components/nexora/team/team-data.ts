import {
  LifeBuoy,
  ShieldCheck,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react"

export type TeamRole = "Admin" | "Sales Manager" | "Sales Rep" | "Support"
export type TeamStatus = "Active" | "Away" | "Invited" | "Deactivated"
export type TeamView = "grid" | "list"

export interface TeamMember {
  id: string
  name: string
  email: string
  title: string
  role: TeamRole
  status: TeamStatus
  phone?: string
  location?: string
  joined: string
  lastActive: string
  openDeals: number
  dealsWon: number
  /** Closed-won revenue this quarter */
  revenue: number
  /** Quarterly revenue target. 0 = no quota (e.g. support). */
  quota: number
  /** The signed-in user. Can't be removed or deactivated. */
  isYou?: boolean
}

export const TEAM_ROLES: TeamRole[] = [
  "Admin",
  "Sales Manager",
  "Sales Rep",
  "Support",
]

export const TEAM_STATUSES: TeamStatus[] = [
  "Active",
  "Away",
  "Invited",
  "Deactivated",
]

export const ROLE_CONFIG: Record<
  TeamRole,
  { icon: LucideIcon; description: string }
> = {
  Admin: { icon: ShieldCheck, description: "Full access, billing and settings" },
  "Sales Manager": { icon: Users, description: "Manages reps, deals and forecasts" },
  "Sales Rep": { icon: Target, description: "Works leads, contacts and deals" },
  Support: { icon: LifeBuoy, description: "Handles customer requests" },
}

export const STATUS_CONFIG: Record<TeamStatus, { dot: string; badge: string }> = {
  Active: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  Away: {
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  Invited: {
    dot: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  Deactivated: {
    dot: "bg-zinc-400",
    badge: "bg-muted text-muted-foreground",
  },
}

export const initialMembers: TeamMember[] = [
  {
    id: "member-1",
    name: "Alex Morgan",
    email: "alex@nexora.dev",
    title: "Head of Sales",
    role: "Admin",
    status: "Active",
    phone: "+1 415 555 0132",
    location: "San Francisco, CA",
    joined: "Jan 2022",
    lastActive: "Active now",
    openDeals: 6,
    dealsWon: 14,
    revenue: 482000,
    quota: 500000,
    isYou: true,
  },
  {
    id: "member-2",
    name: "Jamie Wilson",
    email: "jamie@nexora.dev",
    title: "Sales Manager",
    role: "Sales Manager",
    status: "Active",
    phone: "+1 212 555 0176",
    location: "New York, NY",
    joined: "Mar 2022",
    lastActive: "5 min ago",
    openDeals: 8,
    dealsWon: 11,
    revenue: 356000,
    quota: 400000,
  },
  {
    id: "member-3",
    name: "Priya Sharma",
    email: "priya@nexora.dev",
    title: "Account Executive",
    role: "Sales Rep",
    status: "Active",
    location: "Austin, TX",
    joined: "Aug 2022",
    lastActive: "12 min ago",
    openDeals: 5,
    dealsWon: 9,
    revenue: 274000,
    quota: 300000,
  },
  {
    id: "member-4",
    name: "Daniel Kim",
    email: "daniel@nexora.dev",
    title: "Account Executive",
    role: "Sales Rep",
    status: "Away",
    location: "Seattle, WA",
    joined: "Nov 2022",
    lastActive: "2 hours ago",
    openDeals: 7,
    dealsWon: 6,
    revenue: 168000,
    quota: 300000,
  },
  {
    id: "member-5",
    name: "Maria Lopez",
    email: "maria@nexora.dev",
    title: "Customer Success Manager",
    role: "Support",
    status: "Active",
    location: "Miami, FL",
    joined: "Feb 2023",
    lastActive: "30 min ago",
    openDeals: 3,
    dealsWon: 4,
    revenue: 92000,
    quota: 150000,
  },
  {
    id: "member-6",
    name: "Ethan Brooks",
    email: "ethan@nexora.dev",
    title: "Sales Development Rep",
    role: "Sales Rep",
    status: "Active",
    location: "Chicago, IL",
    joined: "Jun 2023",
    lastActive: "1 hour ago",
    openDeals: 9,
    dealsWon: 3,
    revenue: 74000,
    quota: 200000,
  },
  {
    id: "member-7",
    name: "Aisha Khan",
    email: "aisha@nexora.dev",
    title: "Account Executive",
    role: "Sales Rep",
    status: "Invited",
    joined: "Pending",
    lastActive: "Invite sent",
    openDeals: 0,
    dealsWon: 0,
    revenue: 0,
    quota: 300000,
  },
  {
    id: "member-8",
    name: "Lucas Meyer",
    email: "lucas@nexora.dev",
    title: "Support Specialist",
    role: "Support",
    status: "Deactivated",
    location: "Denver, CO",
    joined: "Sep 2023",
    lastActive: "3 weeks ago",
    openDeals: 0,
    dealsWon: 0,
    revenue: 0,
    quota: 0,
  },
]
