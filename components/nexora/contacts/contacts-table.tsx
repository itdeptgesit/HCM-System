
"use client"

import { flexRender } from "@tanstack/react-table"

import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import type { ContactsTableInstance } from "./use-contacts-table"

type ContactsTableProps = {
  table: ContactsTableInstance
  totalCount: number
}

export function ContactsTable({
  table,
  totalCount,
}: ContactsTableProps) {
  const selectedCount = table.getSelectedRowModel().rows.length

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="hover:bg-transparent"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={
                    header.id === "select" || header.id === "actions"
                      ? "w-10"
                      : undefined
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getAllLeafColumns().length}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No contacts found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Page {table.atoms.pagination.get().pageIndex + 1} of{" "}
            {Math.max(table.getPageCount(), 1)}
          </div>

          <div className="text-sm text-muted-foreground">
            {selectedCount} of {totalCount} rows selected
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>

            <Select
              value={String(table.atoms.pagination.get().pageSize)}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
                table.setPageIndex(0)
              }}
            >
              <SelectTrigger className="h-8 w-auto">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>

          {table.getPageOptions().map((pageIndex) => {
            const isActive =
              table.atoms.pagination.get().pageIndex === pageIndex

            return (
              <Button
                key={pageIndex}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => table.setPageIndex(pageIndex)}
              >
                {pageIndex + 1}
              </Button>
            )
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
