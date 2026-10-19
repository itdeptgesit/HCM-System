
"use client"

import * as React from "react"
import { useTable } from "@tanstack/react-table"

import { createContactsColumns, features } from "./contacts-columns"
import {
  contactStatusStyles,
  type Contact,
  type ContactStatus,
} from "./contacts-data"

export function useContactsTable(initialContacts: Contact[]) {
  const [data, setData] = React.useState<Contact[]>(initialContacts)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [deleteTargets, setDeleteTargets] = React.useState<Contact[]>([])

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const requestDelete = React.useCallback((contact: Contact) => {
    setDeleteTargets([contact])
    setDialogOpen(true)
  }, [])

  const columns = React.useMemo(
    () => createContactsColumns(requestDelete),
    [requestDelete],
  )

  // ---------------------------------------------------------------------------
  // TanStack Table
  // ---------------------------------------------------------------------------

  const table = useTable({
    key: "contacts-table",
    features,
    columns,
    data,
    getRowId: (row) => row.id,
    autoResetPageIndex: false,

    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).toLowerCase().trim()
      const contact = row.original

      return [
        contact.name,
        contact.company,
        contact.email,
        contact.phone,
        contact.status,
      ].some((value) => value.toLowerCase().includes(query))
    },

    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
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
  // Status filter
  // ---------------------------------------------------------------------------

  const statusOptions = React.useMemo(
    () => Object.keys(contactStatusStyles) as ContactStatus[],
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
  // Bulk delete
  // ---------------------------------------------------------------------------

  const selectedRows = table.getSelectedRowModel().rows

  const requestBulkDelete = () => {
    setDeleteTargets(selectedRows.map((row) => row.original))
    setDialogOpen(true)
  }

  const confirmDelete = () => {
    const ids = new Set(deleteTargets.map((contact) => contact.id))

    setData((prev) => prev.filter((contact) => !ids.has(contact.id)))

    table.setRowSelection((prev) => {
      const next = { ...prev }

      ids.forEach((id) => delete next[id])

      return next
    })

    setDialogOpen(false)
    setDeleteTargets([])
  }

  // ---------------------------------------------------------------------------
  // Keep pagination in range after deleting rows
  // ---------------------------------------------------------------------------

  React.useEffect(() => {
    const { pageIndex } = table.atoms.pagination.get()
    const lastPage = Math.max(table.getPageCount() - 1, 0)

    if (pageIndex > lastPage) {
      table.setPageIndex(lastPage)
    }
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

export type ContactsTableInstance =
  ReturnType<typeof useContactsTable>["table"]
