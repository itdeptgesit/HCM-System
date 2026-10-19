import type { DealStage } from "@/components/nexora/deals/deals-data"

export const PIPELINE_STAGES: DealStage[] = [
  "Qualification",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
]

export const STAGE_DOT_COLORS: Record<DealStage, string> = {
  Qualification: "bg-blue-500",
  Proposal: "bg-amber-500",
  Negotiation: "bg-purple-500",
  Won: "bg-emerald-500",
  Lost: "bg-rose-500",
}

export function getInitials(name: string) {
  if (!name) return "U"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export type ProbabilityFilter = "all" | "high" | "medium" | "low"
export type ValueFilter = "all" | "small" | "medium" | "large"

export interface PipelineFilters {
  owner: string // "all" or owner name
  probability: ProbabilityFilter
  value: ValueFilter
}

export const DEFAULT_FILTERS: PipelineFilters = {
  owner: "all",
  probability: "all",
  value: "all",
}

export const PROBABILITY_OPTIONS: { value: ProbabilityFilter; label: string }[] = [
  { value: "all", label: "Any probability" },
  { value: "high", label: "High (70%+)" },
  { value: "medium", label: "Medium (40–69%)" },
  { value: "low", label: "Low (under 40%)" },
]

export const VALUE_OPTIONS: { value: ValueFilter; label: string }[] = [
  { value: "all", label: "Any value" },
  { value: "small", label: "Under $50k" },
  { value: "medium", label: "$50k – $100k" },
  { value: "large", label: "Over $100k" },
]

export function getProbabilityStyle(probability: number) {
  if (probability >= 70)
    return {
      bar: "bg-emerald-500",
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    }
  if (probability >= 40)
    return {
      bar: "bg-amber-500",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    }
  return {
    bar: "bg-rose-500",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  }
}