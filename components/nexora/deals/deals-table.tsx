"use client"

import {
  flexRender,
  type Table,
} from "@tanstack/react-table"

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpDownIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import type { Deal } from "./deals-data"
import { features } from "./deals-columns"

type DealsTableProps = {
  table: Table<typeof features, Deal>
  totalCount: number
}

export function DealsTable({
  table,
  totalCount,
}: DealsTableProps) {
  const { pageIndex, pageSize } = table.atoms.pagination.get()
  const pageCount = Math.max(1, table.getPageCount())
  const selectedCount = table.getSelectedRowModel().rows.length

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <UITable>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted()

                  return (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 gap-1.5 font-medium"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sorted === "asc" ? (
                            <ArrowUpIcon className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ArrowDownIcon className="size-3.5" />
                          ) : (
                            <ArrowUpDownIcon className="size-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="align-middle"
                    >
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
                  className="h-24 text-center text-muted-foreground"
                >
                  No deals found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </UITable>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>
            Page {pageIndex + 1} of {pageCount}
          </span>

          <span>
            {selectedCount} of {totalCount} row(s) selected
          </span>

          <div className="flex items-center gap-2">
            <span>Rows per page</span>

            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                if (value) {
                  table.setPageSize(Number(value))
                }
              }}
            >
              <SelectTrigger className="h-9 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 25, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>

          {Array.from({ length: pageCount }, (_, index) => (
            <Button
              key={index}
              variant={pageIndex === index ? "default" : "outline"}
              size="icon"
              className="size-8"
              onClick={() => table.setPageIndex(index)}
              aria-label={`Go to page ${index + 1}`}
              aria-current={pageIndex === index ? "page" : undefined}
            >
              {index + 1}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}