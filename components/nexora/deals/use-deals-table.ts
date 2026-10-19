
"use client"

import { useCallback, useMemo, useState } from "react"
import { useTable } from "@tanstack/react-table"

import {
  deals as initialDeals,
  type Deal,
  type DealStage,
} from "./deals-data"

import { createDealsColumns, features } from "./deals-columns"

const pageSize = 10

export function useDealsTable() {
  const [data, setData] = useState<Deal[]>(initialDeals)
  const [search, setSearch] = useState("")
  const [stage, setStage] = useState("all")

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteIds, setDeleteIds] = useState<string[]>([])

  // Open delete confirmation for one deal
  const handleDelete = useCallback((deal: Deal) => {
    setDeleteIds([deal.id])
    setDeleteOpen(true)
  }, [])

  // Columns
  const columns = useMemo(
    () => createDealsColumns({ onDelete: handleDelete }),
    [handleDelete],
  )

  // Table
  const table = useTable({
    key: "deals-table",
    features,
    columns: columns as never,
    data,
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue ?? "").toLowerCase().trim()

      if (!query) return true

      const deal = row.original

      return [
        deal.name,
        deal.company,
        deal.contact,
        deal.owner,
        deal.stage,
        deal.expectedClose,
        deal.lastActivity,
      ].some((value) => value.toLowerCase().includes(query))
    },
  })

  // Add new deal
  const addDeal = useCallback(
    (deal: Deal) => {
      setData((current) => [deal, ...current])
      table.setPageIndex(0)
    },
    [table],
  )

  // Search
  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value)
      table.setGlobalFilter(value)
      table.setPageIndex(0)
    },
    [table],
  )

  // Stage filter
  const handleStageChange = useCallback(
    (value: string) => {
      setStage(value)

      table.setColumnFilters(
        value === "all"
          ? []
          : [{ id: "stage", value: value as DealStage }],
      )

      table.setPageIndex(0)
    },
    [table],
  )

  // Bulk delete
  const requestBulkDelete = useCallback(() => {
    const selectedIds = table
      .getSelectedRowModel()
      .rows.map((row) => row.original.id)

    if (selectedIds.length === 0) return

    setDeleteIds(selectedIds)
    setDeleteOpen(true)
  }, [table])

  // Confirm delete
  const confirmDelete = useCallback(() => {
    if (deleteIds.length === 0) return

    setData((current) =>
      current.filter((deal) => !deleteIds.includes(deal.id)),
    )

    table.setRowSelection({})
    setDeleteIds([])
    setDeleteOpen(false)
  }, [deleteIds, table])

  // Deal names shown in the confirmation dialog
  const deleteTargets = useMemo(
    () =>
      data
        .filter((deal) => deleteIds.includes(deal.id))
        .map((deal) => deal.name),
    [data, deleteIds],
  )

  return {
    table,
    totalCount: data.length,
    selectedCount: table.getSelectedRowModel().rows.length,
    addDeal,

    search,
    handleSearch,

    stage: {
      value: stage,
      onChange: handleStageChange,
    },

    requestBulkDelete,

    dialog: {
      open: deleteOpen,
      onOpenChange: setDeleteOpen,
      targets: deleteTargets,
      onConfirm: confirmDelete,
    },
  }
}