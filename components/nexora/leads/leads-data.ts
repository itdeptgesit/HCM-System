export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal"
  | "Lost"

export type LeadSource =
  | "Website"
  | "Referral"
  | "Outbound"
  | "Inbound"
  | "Partner"
  | "Campaign"
  | "Social"

export type LeadOwner = {
  name: string
  avatar?: string
}

export type Lead = {
  id: string
  name: string
  email: string
  company: string
  status: LeadStatus
  score: number
  source: LeadSource
  owner: LeadOwner
  lastActivity: string
}

export const statusStyles: Record<LeadStatus, string> = {
  New:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",

  Contacted:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-400",

  Qualified:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",

  Proposal:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",

  Lost:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
}

export const statusDots: Record<LeadStatus, string> = {
  New: "bg-blue-500",
  Contacted: "bg-violet-500",
  Qualified: "bg-emerald-500",
  Proposal: "bg-amber-500",
  Lost: "bg-red-500",
}

export const leads: Lead[] = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah.chen@globex.com",
    company: "Globex",
    status: "Qualified",
    score: 86,
    source: "Referral",
    owner: {
      name: "Alex Morgan",
    },
    lastActivity: "2 hours ago",
  },
  {
    id: "2",
    name: "Marcus Rivera",
    email: "m.rivera@cobalthealth.com",
    company: "Cobalt Health",
    status: "Proposal",
    score: 72,
    source: "Outbound",
    owner: {
      name: "Priya Nair",
    },
    lastActivity: "5 hours ago",
  },
  {
    id: "3",
    name: "Emily Watson",
    email: "emily.w@northwind.com",
    company: "Northwind Traders",
    status: "Contacted",
    score: 54,
    source: "Inbound",
    owner: {
      name: "Daniel Cho",
    },
    lastActivity: "Yesterday",
  },
  {
    id: "4",
    name: "David Wilson",
    email: "d.wilson@meridianbank.com",
    company: "Meridian Bank",
    status: "New",
    score: 31,
    source: "Website",
    owner: {
      name: "Alex Morgan",
    },
    lastActivity: "Yesterday",
  },
  {
    id: "5",
    name: "Priya Nair",
    email: "priya@hexontraders.com",
    company: "Hexon Traders",
    status: "Qualified",
    score: 91,
    source: "Referral",
    owner: {
      name: "Priya Nair",
    },
    lastActivity: "2 days ago",
  },
  {
    id: "6",
    name: "James Carter",
    email: "j.carter@orionlogistics.com",
    company: "Orion Logistics",
    status: "Lost",
    score: 18,
    source: "Outbound",
    owner: {
      name: "Daniel Cho",
    },
    lastActivity: "3 days ago",
  },
  {
    id: "7",
    name: "Lena Fischer",
    email: "lena@vantageretail.com",
    company: "Vantage Retail",
    status: "New",
    score: 44,
    source: "Website",
    owner: {
      name: "Alex Morgan",
    },
    lastActivity: "3 days ago",
  },
  {
    id: "8",
    name: "Tomás Rodríguez",
    email: "tomas@fenwickco.com",
    company: "Fenwick Co.",
    status: "Contacted",
    score: 63,
    source: "Partner",
    owner: {
      name: "Priya Nair",
    },
    lastActivity: "4 days ago",
  },
  {
    id: "9",
    name: "Aisha Patel",
    email: "aisha.p@apexsolutions.com",
    company: "Apex Solutions",
    status: "Qualified",
    score: 88,
    source: "Inbound",
    owner: {
      name: "Alex Morgan",
    },
    lastActivity: "1 hour ago",
  },
  {
    id: "10",
    name: "Benjamin Hayes",
    email: "b.hayes@summittech.io",
    company: "Summit Technologies",
    status: "Proposal",
    score: 79,
    source: "Referral",
    owner: {
      name: "Daniel Cho",
    },
    lastActivity: "3 hours ago",
  },
  {
    id: "11",
    name: "Sophia Zhang",
    email: "szhang@nexusmedia.com",
    company: "Nexus Media",
    status: "New",
    score: 25,
    source: "Website",
    owner: {
      name: "Priya Nair",
    },
    lastActivity: "4 hours ago",
  },
  {
    id: "12",
    name: "Oliver Bennett",
    email: "oliver@crestviewcap.com",
    company: "Crestview Capital",
    status: "Contacted",
    score: 61,
    source: "Outbound",
    owner: {
      name: "Alex Morgan",
    },
    lastActivity: "6 hours ago",
  },
  {
    id: "13",
    name: "Camila Vance",
    email: "c.vance@solarisenergy.com",
    company: "Solaris Energy",
    status: "Qualified",
    score: 94,
    source: "Partner",
    owner: {
      name: "Priya Nair",
    },
    lastActivity: "8 hours ago",
  },
  {
    id: "14",
    name: "Liam O'Connor",
    email: "loconnor@beaconlabs.org",
    company: "Beacon Labs",
    status: "Lost",
    score: 12,
    source: "Website",
    owner: {
      name: "Daniel Cho",
    },
    lastActivity: "1 day ago",
  },
  {
    id: "15",
    name: "Isabelle Dubois",
    email: "i.dubois@vanguardgroup.com",
    company: "Vanguard Partners",
    status: "Proposal",
    score: 83,
    source: "Referral",
    owner: {
      name: "Alex Morgan",
    },
    lastActivity: "1 day ago",
  },
  {
    id: "16",
    name: "Tariq Al-Mansoor",
    email: "tariq@skylineventures.com",
    company: "Skyline Ventures",
    status: "Contacted",
    score: 58,
    source: "Inbound",
    owner: {
      name: "Daniel Cho",
    },
    lastActivity: "1 day ago",
  },
  {
    id: "17",
    name: "Chloe Tanaka",
    email: "c.tanaka@quantumdynamics.io",
    company: "Quantum Dynamics",
    status: "Qualified",
    score: 89,
    source: "Outbound",
    owner: {
      name: "Priya Nair",
    },
    lastActivity: "2 days ago",
  },
  {
    id: "18",
    name: "Ethan Wright",
    email: "ewright@bluehorizongroup.com",
    company: "Blue Horizon",
    status: "New",
    score: 37,
    source: "Website",
    owner: {
      name: "Alex Morgan",
    },
    lastActivity: "2 days ago",
  },
  {
    id: "19",
    name: "Amara Okezie",
    email: "a.okezie@pinnaclehealth.org",
    company: "Pinnacle Health",
    status: "Proposal",
    score: 76,
    source: "Partner",
    owner: {
      name: "Daniel Cho",
    },
    lastActivity: "2 days ago",
  },
  {
    id: "20",
    name: "Lucas Moreira",
    email: "lucas@ironcladsec.com",
    company: "Ironclad Security",
    status: "Lost",
    score: 22,
    source: "Outbound",
    owner: {
      name: "Priya Nair",
    },
    lastActivity: "3 days ago",
  },
  {
    id: "21",
    name: "Hannah Schmidt",
    email: "h.schmidt@aerospace-one.com",
    company: "Aerospace One",
    status: "Contacted",
    score: 67,
    source: "Inbound",
    owner: {
      name: "Alex Morgan",
    },
    lastActivity: "3 days ago",
  },
  {
    id: "22",
    name: "Rohan Kapoor",
    email: "r.kapoor@strideanalytics.com",
    company: "Stride Analytics",
    status: "Qualified",
    score: 92,
    source: "Referral",
    owner: {
      name: "Priya Nair",
    },
    lastActivity: "3 days ago",
  },
  {
    id: "23",
    name: "Zoe Kravitz",
    email: "zkravitz@lumendevelopments.com",
    company: "Lumen Devs",
    status: "New",
    score: 41,
    source: "Website",
    owner: {
      name: "Daniel Cho",
    },
    lastActivity: "4 days ago",
  },
  {
    id: "24",
    name: "Mateo Silva",
    email: "msilva@terrafirmagroup.com",
    company: "Terra Firma",
    status: "Proposal",
    score: 74,
    source: "Outbound",
    owner: {
      name: "Alex Morgan",
    },
    lastActivity: "4 days ago",
  },
  {
    id: "25",
    name: "Nadia Hussain",
    email: "n.hussain@cloudscale.io",
    company: "CloudScale Inc",
    status: "Contacted",
    score: 52,
    source: "Inbound",
    owner: {
      name: "Priya Nair",
    },
    lastActivity: "4 days ago",
  },
  {
    id: "26",
    name: "Gabriel Rossi",
    email: "gabriel@kineticsystems.com",
    company: "Kinetic Systems",
    status: "Qualified",
    score: 85,
    source: "Partner",
    owner: {
      name: "Daniel Cho",
    },
    lastActivity: "5 days ago",
  },
  {
    id: "27",
    name: "Victoria Sterling",
    email: "v.sterling@sterlingfintech.com",
    company: "Sterling Fintech",
    status: "Lost",
    score: 15,
    source: "Website",
    owner: {
      name: "Alex Morgan",
    },
    lastActivity: "5 days ago",
  },
  {
    id: "28",
    name: "Kenji Sato",
    email: "ksato@omniholdings.jp",
    company: "Omni Holdings",
    status: "Proposal",
    score: 81,
    source: "Referral",
    owner: {
      name: "Priya Nair",
    },
    lastActivity: "5 days ago",
  },
  {
    id: "29",
    name: "Fiona Gallagher",
    email: "fgallagher@swiftlogistics.io",
    company: "Swift Logistics",
    status: "New",
    score: 29,
    source: "Outbound",
    owner: {
      name: "Daniel Cho",
    },
    lastActivity: "6 days ago",
  },
  {
    id: "30",
    name: "Devon Miller",
    email: "d.miller@aspenglobal.com",
    company: "Aspen Global",
    status: "Contacted",
    score: 65,
    source: "Inbound",
    owner: {
      name: "Alex Morgan",
    },
    lastActivity: "6 days ago",
  },
  {
    id: "31",
    name: "Astrid Lindgren",
    email: "astrid@nordicbiotech.se",
    company: "Nordic Biotech",
    status: "Qualified",
    score: 87,
    source: "Partner",
    owner: {
      name: "Priya Nair",
    },
    lastActivity: "1 week ago",
  },
  {
    id: "32",
    name: "Julian Vance",
    email: "j.vance@atlasnetworks.com",
    company: "Atlas Networks",
    status: "Proposal",
    score: 70,
    source: "Website",
    owner: {
      name: "Daniel Cho",
    },
    lastActivity: "1 week ago",
  },
  {
    id: "33",
    name: "Maya Lin",
    email: "maya@prismdesign.co",
    company: "Prism Design Studios",
    status: "New",
    score: 38,
    source: "Referral",
    owner: {
      name: "Alex Morgan",
    },
    lastActivity: "1 week ago",
  },
  {
    id: "34",
    name: "Carlos Gomez",
    email: "cgomez@solardrive.com",
    company: "SolarDrive Corp",
    status: "Lost",
    score: 19,
    source: "Outbound",
    owner: {
      name: "Priya Nair",
    },
    lastActivity: "1 week ago",
  },
  {
    id: "35",
    name: "Kaitlyn Ross",
    email: "k.ross@horizonmfg.com",
    company: "Horizon Manufacturing",
    status: "Contacted",
    score: 59,
    source: "Inbound",
    owner: {
      name: "Daniel Cho",
    },
    lastActivity: "1 week ago",
  },
  {
    id: "36",
    name: "Dimitri Volkov",
    email: "d.volkov@aegissafe.com",
    company: "Aegis Cyber Security",
    status: "Qualified",
    score: 95,
    source: "Partner",
    owner: {
      name: "Alex Morgan",
    },
    lastActivity: "2 weeks ago",
  },
  {
    id: "37",
    name: "Ananya Roy",
    email: "ananya@vertexcapital.com",
    company: "Vertex Capital",
    status: "Proposal",
    score: 78,
    source: "Referral",
    owner: {
      name: "Priya Nair",
    },
    lastActivity: "2 weeks ago",
  },
  {
    id: "38",
    name: "Soren Rasmussen",
    email: "soren@fjordtechnologies.dk",
    company: "Fjord Tech",
    status: "Contacted",
    score: 62,
    source: "Website",
    owner: {
      name: "Daniel Cho",
    },
    lastActivity: "2 weeks ago",
  },
]

export const statusFilters = [
  "All",
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Lost",
] as const

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function scoreColor(score: number) {
  if (score >= 75) return "bg-emerald-500"
  if (score >= 45) return "bg-amber-500"
  return "bg-red-500"
}