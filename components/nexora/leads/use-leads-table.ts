"use client"

import * as React from "react"
import { useTable } from "@tanstack/react-table"

import { createLeadsColumns, features } from "./leads-columns"
import { statusStyles, type Lead, type LeadStatus } from "./leads-data"

export function useLeadsTable(initialLeads: Lead[]) {
  // Local copy so rows can be removed. Swap setData for your API mutation later.
  const [data, setData] = React.useState<Lead[]>(initialLeads)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [deleteTargets, setDeleteTargets] = React.useState<Lead[]>([])

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")

  const requestDelete = React.useCallback((lead: Lead) => {
    setDeleteTargets([lead])
    setDialogOpen(true)
  }, [])

  const columns = React.useMemo(
    () => createLeadsColumns(requestDelete),
    [requestDelete],
  )

  const table = useTable({
    key: "leads-table",
    features,
    columns,
    data,
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).toLowerCase().trim()
      const lead = row.original

      return [
        lead.name,
        lead.email,
        lead.company,
        lead.status,
        lead.owner.name,
      ].some((value) => value.toLowerCase().includes(query))
    },
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  })

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  const handleSearch = (value: string) => {
    setSearch(value)
    table.setGlobalFilter(value)
    table.setPageIndex(0)
  }

  // ---------------------------------------------------------------------------
  // Status tabs
  // ---------------------------------------------------------------------------

  const statusOptions = React.useMemo(
    () => Object.keys(statusStyles) as LeadStatus[],
    [],
  )

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    table
      .getColumn("status")
      ?.setFilterValue(value === "all" ? undefined : value)
    table.setPageIndex(0)
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const selectedRows = table.getSelectedRowModel().rows

  const requestBulkDelete = () => {
    setDeleteTargets(selectedRows.map((row) => row.original))
    setDialogOpen(true)
  }

  const confirmDelete = () => {
    const ids = new Set(deleteTargets.map((lead) => lead.id))

    setData((prev) => prev.filter((lead) => !ids.has(lead.id)))

    table.setRowSelection((prev) => {
      const next = { ...prev }
      ids.forEach((id) => delete next[id])
      return next
    })
  }

  // If the last rows on the last page are deleted, step back a page
  React.useEffect(() => {
    const { pageIndex } = table.atoms.pagination.get()
    const lastPage = Math.max(table.getPageCount() - 1, 0)
    if (pageIndex > lastPage) table.setPageIndex(lastPage)
  }, [data.length, table])

  return {
    table,
    totalCount: data.length,
    selectedCount: selectedRows.length,
    requestBulkDelete,
    search,
    handleSearch,
    status: {
      value: statusFilter,
      options: statusOptions as string[],
      onChange: handleStatusChange,
    },
    dialog: {
      open: dialogOpen,
      onOpenChange: setDialogOpen,
      targets: deleteTargets,
      onConfirm: confirmDelete,
    },
  }
}

export type LeadsTableInstance = ReturnType<typeof useLeadsTable>["table"]