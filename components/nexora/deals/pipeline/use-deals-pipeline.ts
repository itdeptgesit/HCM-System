import { useMemo, useState } from "react"

import {
  deals as initialDeals,
  type Deal,
  type DealStage,
} from "@/components/nexora/deals/deals-data"
import {
  DEFAULT_FILTERS,
  type PipelineFilters,
} from "./pipeline-constants"

function matchesProbability(deal: Deal, filter: PipelineFilters["probability"]) {
  if (filter === "high") return deal.probability >= 70
  if (filter === "medium") return deal.probability >= 40 && deal.probability < 70
  if (filter === "low") return deal.probability < 40
  return true
}

function matchesValue(deal: Deal, filter: PipelineFilters["value"]) {
  if (filter === "small") return deal.value < 50_000
  if (filter === "medium") return deal.value >= 50_000 && deal.value <= 100_000
  if (filter === "large") return deal.value > 100_000
  return true
}

export function useDealsPipeline() {
  const [dealsList, setDealsList] = useState<Deal[]>(initialDeals)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<PipelineFilters>(DEFAULT_FILTERS)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const owners = useMemo(
    () => Array.from(new Set(dealsList.map((d) => d.owner))).sort(),
    [dealsList]
  )

  const hasActiveFilters =
    filters.owner !== DEFAULT_FILTERS.owner ||
    filters.probability !== DEFAULT_FILTERS.probability ||
    filters.value !== DEFAULT_FILTERS.value

  const filteredDeals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return dealsList.filter((deal) => {
      const matchesSearch =
        !query ||
        deal.name.toLowerCase().includes(query) ||
        deal.company.toLowerCase().includes(query) ||
        deal.contact.toLowerCase().includes(query) ||
        deal.owner.toLowerCase().includes(query)

      const matchesOwner = filters.owner === "all" || deal.owner === filters.owner

      return (
        matchesSearch &&
        matchesOwner &&
        matchesProbability(deal, filters.probability) &&
        matchesValue(deal, filters.value)
      )
    })
  }, [dealsList, searchQuery, filters])

  const totalPipelineValue = useMemo(
    () => filteredDeals.reduce((sum, d) => sum + d.value, 0),
    [filteredDeals]
  )

  const createDeal = (newDeal: Deal) =>
    setDealsList((prev) => [newDeal, ...prev])

  const deleteDeal = (id: string) =>
    setDealsList((prev) => prev.filter((d) => d.id !== id))

  const moveDeal = (id: string, stage: DealStage) =>
    setDealsList((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              stage,
              probability:
                stage === "Won" ? 100 : stage === "Lost" ? 0 : d.probability,
            }
          : d
      )
    )

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setSearchQuery("")
  }

  return {
    filteredDeals,
    totalPipelineValue,
    owners,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    hasActiveFilters: hasActiveFilters || searchQuery.trim() !== "",
    clearFilters,
    isCreateOpen,
    setIsCreateOpen,
    createDeal,
    deleteDeal,
    moveDeal,
  }
}