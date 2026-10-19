"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useTable } from "@tanstack/react-table"

import {
  companies,
  type Company,
} from "./companies-data"

import {
  createCompaniesColumns,
  features,
} from "./companies-columns"

type CompanyAction = "view" | "edit" | null

export function useCompaniesTable() {
  const [data, setData] = useState<Company[]>(companies)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")

  const [deleteTargets, setDeleteTargets] = useState<Company[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [selectedAction, setSelectedAction] = useState<CompanyAction>(null)

  const handleView = useCallback((company: Company) => {
    setSelectedCompany(company)
    setSelectedAction("view")
  }, [])

  const handleEdit = useCallback((company: Company) => {
    setSelectedCompany(company)
    setSelectedAction("edit")
  }, [])

  const handleDelete = useCallback((company: Company) => {
    setDeleteTargets([company])
    setDeleteDialogOpen(true)
  }, [])

  const columns = useMemo(
    () =>
      createCompaniesColumns({
        onView: handleView,
        onEdit: handleEdit,
        onDelete: handleDelete,
      }),
    [handleView, handleEdit, handleDelete],
  )

  const table = useTable({
    key: "companies-table",
    features,
    columns,
    data,
    autoResetPageIndex: false,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      const company = row.original
      const query = String(filterValue ?? "").toLowerCase().trim()

      return [
        company.name,
        company.website,
        company.industry,
        company.employees,
        company.email,
        company.phone,
        company.location,
        company.status,
      ].some((value) => value.toLowerCase().includes(query))
    },
  })

  function handleSearch(value: string) {
    setSearch(value)
    table.setGlobalFilter(value || undefined)
    table.setPageIndex(0)
  }

  function handleStatusChange(value: string) {
    setStatus(value)
    table.getColumn("status")?.setFilterValue(
      value === "all" ? undefined : value,
    )
    table.setPageIndex(0)
  }

  function requestBulkDelete() {
    const selected = table
      .getSelectedRowModel()
      .rows.map((row) => row.original)

    if (selected.length === 0) return

    setDeleteTargets(selected)
    setDeleteDialogOpen(true)
  }

  function confirmDelete() {
    const ids = new Set(deleteTargets.map((company) => company.id))

    setData((current) =>
      current.filter((company) => !ids.has(company.id)),
    )

    table.setRowSelection({})
    setDeleteTargets([])
    setDeleteDialogOpen(false)
  }

  function clearSelectedAction() {
    setSelectedCompany(null)
    setSelectedAction(null)
  }

  useEffect(() => {
    const { pageIndex, pageSize } = table.atoms.pagination.get()
    const pageCount = Math.max(1, Math.ceil(data.length / pageSize))

    if (pageIndex >= pageCount) {
      table.setPageIndex(pageCount - 1)
    }
  }, [data.length, table])

  return {
    table,
    totalCount: data.length,
    selectedCount: table.getSelectedRowModel().rows.length,

    search,
    handleSearch,

    status: {
      value: status,
      onChange: handleStatusChange,
      options: ["all", "Active", "Lead", "Inactive"],
    },

    requestBulkDelete,

    dialog: {
      open: deleteDialogOpen,
      onOpenChange: setDeleteDialogOpen,
      targets: deleteTargets,
      onConfirm: confirmDelete,
    },

    selectedCompany,
    selectedAction,
    clearSelectedAction,
  }
}