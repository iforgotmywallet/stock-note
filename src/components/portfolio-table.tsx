"use client"

import * as React from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { IconBriefcase, IconCheck, IconX } from "@tabler/icons-react"

import { Badge } from "~/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"

// Portfolio type based on the database structure
export interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  days_of_week: string[];
  allocation_per_ticker: number;
  enabled: boolean;
  created_at: Date;
  tickers: { ticker: string }[];
}

// Day of week mapping for display
const dayLabels: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue", 
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
}

// Column definitions for the portfolio table
const columns: ColumnDef<Portfolio>[] = [
  {
    accessorKey: "name",
    header: "Portfolio Name",
    cell: ({ row }) => {
      const portfolio = row.original
      return (
        <div className="space-y-1 min-w-0">
          <div className="font-medium truncate" title={portfolio.name}>
            {portfolio.name}
          </div>
          {portfolio.description && (
            <div className="text-sm text-muted-foreground line-clamp-2" title={portfolio.description}>
              {portfolio.description}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "days_of_week",
    header: "Trading Days",
    cell: ({ row }) => {
      const days = row.original.days_of_week
      return (
        <div className="flex flex-wrap gap-1 min-w-0">
          {days.map((day) => (
            <Badge
              key={day}
              variant="outline"
              className="text-xs px-2 py-0.5 shrink-0"
              aria-label={`Trading on ${day}`}
            >
              {dayLabels[day.toLowerCase()] || day}
            </Badge>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: "enabled",
    header: "Status",
    cell: ({ row }) => {
      const enabled = row.original.enabled
      return (
        <Badge
          variant={enabled ? "default" : "secondary"}
          className="flex items-center gap-1 w-fit shrink-0"
          aria-label={`Portfolio is ${enabled ? "enabled" : "disabled"}`}
        >
          {enabled ? (
            <IconCheck className="size-3" aria-hidden="true" />
          ) : (
            <IconX className="size-3" aria-hidden="true" />
          )}
          {enabled ? "Enabled" : "Disabled"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "tickers",
    header: "Tickers",
    cell: ({ row }) => {
      const tickers = row.original.tickers
      const allocation = row.original.allocation_per_ticker
      
      return (
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap gap-1">
            {tickers.slice(0, 5).map((tickerObj) => (
              <Badge
                key={tickerObj.ticker}
                variant="outline"
                className="text-xs font-mono shrink-0"
                title={`${tickerObj.ticker} ticker`}
              >
                {tickerObj.ticker}
              </Badge>
            ))}
            {tickers.length > 5 && (
              <Badge
                variant="outline"
                className="text-xs shrink-0"
                title={`${tickers.length - 5} more tickers: ${tickers.slice(5).map(t => t.ticker).join(", ")}`}
              >
                +{tickers.length - 5}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {(allocation * 100).toFixed(0)}% per ticker
          </div>
        </div>
      )
    },
  },
]

interface PortfolioTableProps {
  portfolios: Portfolio[]
}

export function PortfolioTable({ portfolios }: PortfolioTableProps) {
  const table = useReactTable({
    data: portfolios,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (portfolios.length === 0) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Portfolio Name</TableHead>
              <TableHead>Trading Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tickers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <IconBriefcase className="size-12" />
                  <div className="space-y-1">
                    <div className="font-medium">No Portfolios Yet</div>
                    <div className="text-sm">Get started by creating your first investment portfolio</div>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}