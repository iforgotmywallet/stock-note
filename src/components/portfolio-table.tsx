"use client"

import * as React from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { IconBriefcase, IconCheck, IconX, IconDots, IconTrash } from "@tabler/icons-react"
import { useRouter } from "next/navigation"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { deletePortfolio } from "~/actions/portfolios"
import { toast } from "sonner"

// Portfolio type based on the database structure
export interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  days_of_week: string[];
  allocation_per_ticker: number;
  enabled: boolean;
  leverage: number;
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
const createColumns = (
  onDelete: (portfolio: Portfolio) => void
): ColumnDef<Portfolio>[] => [
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
      const portfolio = row.original
      
      return (
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="space-y-2 min-w-0 flex-1">
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
              {(allocation * 100).toFixed(0)}% per ticker • {row.original.leverage.toFixed(1)}x leverage
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0"
                aria-label={`Actions for ${portfolio.name}`}
              >
                <IconDots className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(portfolio)
                }}
              >
                <IconTrash className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]

interface PortfolioTableProps {
  portfolios: Portfolio[]
}

export function PortfolioTable({ portfolios }: PortfolioTableProps) {
  const router = useRouter()
  const [portfolioToDelete, setPortfolioToDelete] = React.useState<Portfolio | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = (portfolio: Portfolio) => {
    setPortfolioToDelete(portfolio)
  }

  const confirmDelete = async () => {
    if (!portfolioToDelete) return

    setIsDeleting(true)
    try {
      const result = await deletePortfolio(portfolioToDelete.id)
      
      if (result.success) {
        toast.success("Portfolio deleted successfully")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to delete portfolio")
      }
    } catch (error) {
      console.error("Error deleting portfolio:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsDeleting(false)
      setPortfolioToDelete(null)
    }
  }

  const columns = React.useMemo(() => createColumns(handleDelete), [])
  
  const table = useReactTable({
    data: portfolios,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const handleRowClick = (portfolioId: string) => {
    router.push(`/portfolio/${portfolioId}/dashboard`)
  }

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
    <>
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
                <TableRow 
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleRowClick(row.original.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleRowClick(row.original.id)
                    }
                  }}
                  aria-label={`View dashboard for ${row.original.name} portfolio`}
                >
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!portfolioToDelete} onOpenChange={(open) => !open && setPortfolioToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Portfolio</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{portfolioToDelete?.name}</strong>? 
              This will permanently remove the portfolio and all its associated data including positions, 
              actions, and daily values. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}