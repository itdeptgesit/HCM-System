
export type DealStage =
  | "Qualification"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost"

export type Deal = {
  id: string
  name: string
  company: string
  contact: string
  contactAvatar?: string
  value: number
  stage: DealStage
  probability: number
  expectedClose: string
  owner: string
  ownerAvatar?: string
  lastActivity: string
}

export const dealStageStyles: Record<DealStage, string> = {
  Qualification: "border-blue-200 bg-blue-50 text-blue-700",
  Proposal: "border-amber-200 bg-amber-50 text-amber-700",
  Negotiation: "border-violet-200 bg-violet-50 text-violet-700",
  Won: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Lost: "border-red-200 bg-red-50 text-red-700",
}

export const deals: Deal[] = [
  {
    id: "1",
    name: "Enterprise Rollout",
    company: "Google",
    contact: "Caleb Reed",
    value: 240000,
    stage: "Won",
    probability: 100,
    expectedClose: "Dec 28, 2025",
    owner: "Alex Morgan",
    lastActivity: "Dec 28, 2025",
  },
  {
    id: "2",
    name: "Compliance Add-on",
    company: "Stripe",
    contact: "Olivia Martin",
    value: 95000,
    stage: "Proposal",
    probability: 70,
    expectedClose: "Oct 15, 2026",
    owner: "Alex Morgan",
    lastActivity: "Sep 25, 2026",
  },
  {
    id: "3",
    name: "Platform Renewal",
    company: "Google",
    contact: "Caleb Reed",
    value: 62000,
    stage: "Negotiation",
    probability: 85,
    expectedClose: "Oct 20, 2026",
    owner: "Jamie Wilson",
    lastActivity: "Sep 24, 2026",
  },
  {
    id: "4",
    name: "Cloud Migration",
    company: "Dzen.ru",
    contact: "Sophia Chen",
    value: 125000,
    stage: "Qualification",
    probability: 30,
    expectedClose: "Nov 12, 2026",
    owner: "Alex Morgan",
    lastActivity: "Sep 23, 2026",
  },
  {
    id: "5",
    name: "Design System Upgrade",
    company: "Figma",
    contact: "Ethan Brooks",
    value: 48000,
    stage: "Proposal",
    probability: 60,
    expectedClose: "Oct 30, 2026",
    owner: "Jamie Wilson",
    lastActivity: "Sep 22, 2026",
  },
  {
    id: "6",
    name: "Annual SaaS Contract",
    company: "Notion",
    contact: "Mia Davis",
    value: 78000,
    stage: "Negotiation",
    probability: 80,
    expectedClose: "Nov 05, 2026",
    owner: "Alex Morgan",
    lastActivity: "Sep 21, 2026",
  },
  {
    id: "7",
    name: "Marketing Automation",
    company: "Patreon",
    contact: "Noah Wilson",
    value: 36000,
    stage: "Qualification",
    probability: 25,
    expectedClose: "Nov 18, 2026",
    owner: "Jamie Wilson",
    lastActivity: "Sep 20, 2026",
  },
  {
    id: "8",
    name: "Security Integration",
    company: "Okta",
    contact: "Ava Thompson",
    value: 110000,
    stage: "Won",
    probability: 100,
    expectedClose: "Dec 25, 2025",
    owner: "Alex Morgan",
    lastActivity: "Dec 25, 2025",
  },
  {
    id: "9",
    name: "Customer Portal",
    company: "Airtable",
    contact: "Liam Taylor",
    value: 54000,
    stage: "Lost",
    probability: 0,
    expectedClose: "Sep 15, 2026",
    owner: "Jamie Wilson",
    lastActivity: "Sep 18, 2026",
  },
  {
    id: "10",
    name: "Analytics Expansion",
    company: "Vercel",
    contact: "Isabella Clark",
    value: 89000,
    stage: "Proposal",
    probability: 65,
    expectedClose: "Nov 22, 2026",
    owner: "Alex Morgan",
    lastActivity: "Sep 17, 2026",
  },
]

export function formatDealValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}