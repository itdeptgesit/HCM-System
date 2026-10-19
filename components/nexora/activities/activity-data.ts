
export type ActivityType = "Call" | "Meeting" | "Email" | "Task" | "Note"

export type ActivityStatus = "Upcoming" | "Overdue" | "Completed"

export type ActivityPriority = "Low" | "Medium" | "High"

export type RelatedEntityType = "Lead" | "Contact" | "Company" | "Deal"

export type Activity = {
  id: string
  title: string
  description: string
  type: ActivityType
  status: ActivityStatus
  priority: ActivityPriority
  date: string
  time?: string
  durationMinutes?: number
  owner: string
  ownerAvatar?: string
  relatedTo?: {
    type: RelatedEntityType
    name: string
  }
  location?: string
  outcome?: string
}

export const activityTypeStyles: Record<ActivityType, string> = {
  Call: "border-blue-200 bg-blue-50 text-blue-700",
  Meeting: "border-violet-200 bg-violet-50 text-violet-700",
  Email: "border-sky-200 bg-sky-50 text-sky-700",
  Task: "border-amber-200 bg-amber-50 text-amber-700",
  Note: "border-gray-200 bg-gray-50 text-gray-700",
}

export const activityStatusStyles: Record<ActivityStatus, string> = {
  Upcoming: "border-blue-200 bg-blue-50 text-blue-700",
  Overdue: "border-red-200 bg-red-50 text-red-700",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
}

export const activityPriorityStyles: Record<ActivityPriority, string> = {
  Low: "text-muted-foreground",
  Medium: "text-amber-600",
  High: "text-red-600",
}

export const activities: Activity[] = [
  {
    id: "1",
    title: "Follow-up call with Caleb",
    description: "Discuss the Enterprise Rollout and finalize the contract.",
    type: "Call",
    status: "Upcoming",
    priority: "High",
    date: "2026-10-02",
    time: "10:00 AM",
    durationMinutes: 30,
    owner: "Alex Morgan",
    relatedTo: {
      type: "Contact",
      name: "Caleb Reed",
    },
  },
  {
    id: "2",
    title: "Product demo with Stripe",
    description: "Present the compliance dashboard and discuss integration.",
    type: "Meeting",
    status: "Upcoming",
    priority: "High",
    date: "2026-10-02",
    time: "02:30 PM",
    durationMinutes: 60,
    owner: "Jamie Wilson",
    relatedTo: {
      type: "Company",
      name: "Stripe",
    },
    location: "Google Meet",
  },
  {
    id: "3",
    title: "Send pricing proposal",
    description: "Share the updated pricing proposal with the client.",
    type: "Email",
    status: "Upcoming",
    priority: "Medium",
    date: "2026-10-03",
    time: "11:00 AM",
    owner: "Alex Morgan",
    relatedTo: {
      type: "Deal",
      name: "Compliance Add-on",
    },
  },
  {
    id: "4",
    title: "Prepare project requirements",
    description: "Collect technical requirements for the cloud migration.",
    type: "Task",
    status: "Overdue",
    priority: "High",
    date: "2026-09-28",
    time: "04:00 PM",
    owner: "Alex Morgan",
    relatedTo: {
      type: "Deal",
      name: "Cloud Migration",
    },
  },
  {
    id: "5",
    title: "Quarterly business review",
    description: "Review account performance, goals and upcoming opportunities.",
    type: "Meeting",
    status: "Upcoming",
    priority: "Medium",
    date: "2026-10-05",
    time: "11:30 AM",
    durationMinutes: 45,
    owner: "Jamie Wilson",
    relatedTo: {
      type: "Company",
      name: "Google",
    },
    location: "Google Meet",
  },
  {
    id: "6",
    title: "Initial discovery call",
    description: "Understand the prospect's business requirements.",
    type: "Call",
    status: "Completed",
    priority: "Medium",
    date: "2026-09-29",
    time: "10:30 AM",
    durationMinutes: 25,
    owner: "Alex Morgan",
    relatedTo: {
      type: "Lead",
      name: "Sophia Chen",
    },
    outcome: "Qualified lead",
  },
  {
    id: "7",
    title: "Update CRM contact details",
    description: "Verify contact information and update the CRM record.",
    type: "Task",
    status: "Completed",
    priority: "Low",
    date: "2026-09-28",
    time: "02:00 PM",
    owner: "Jamie Wilson",
    relatedTo: {
      type: "Contact",
      name: "Olivia Martin",
    },
  },
  {
    id: "8",
    title: "Send onboarding information",
    description: "Email the onboarding guide and account setup instructions.",
    type: "Email",
    status: "Completed",
    priority: "Medium",
    date: "2026-09-26",
    time: "09:30 AM",
    owner: "Alex Morgan",
    relatedTo: {
      type: "Company",
      name: "Notion",
    },
  },
  {
    id: "9",
    title: "Discuss renewal terms",
    description: "Review renewal pricing and contract duration.",
    type: "Call",
    status: "Overdue",
    priority: "High",
    date: "2026-09-30",
    time: "03:00 PM",
    durationMinutes: 30,
    owner: "Jamie Wilson",
    relatedTo: {
      type: "Deal",
      name: "Platform Renewal",
    },
  },
  {
    id: "10",
    title: "Client feedback",
    description: "Client shared positive feedback about the latest product demo.",
    type: "Note",
    status: "Completed",
    priority: "Low",
    date: "2026-09-25",
    owner: "Alex Morgan",
    relatedTo: {
      type: "Contact",
      name: "Ethan Brooks",
    },
    outcome: "Interested in moving forward",
  },
  {
    id: "11",
    title: "Schedule technical discussion",
    description: "Arrange a meeting with the client's technical team.",
    type: "Task",
    status: "Upcoming",
    priority: "Medium",
    date: "2026-10-06",
    time: "01:00 PM",
    owner: "Jamie Wilson",
    relatedTo: {
      type: "Company",
      name: "Figma",
    },
  },
  {
    id: "12",
    title: "Send contract for review",
    description: "Send the final contract draft for legal review.",
    type: "Email",
    status: "Upcoming",
    priority: "High",
    date: "2026-10-07",
    time: "10:00 AM",
    owner: "Alex Morgan",
    relatedTo: {
      type: "Deal",
      name: "Annual SaaS Contract",
    },
  },
]