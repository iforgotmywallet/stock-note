"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconLayoutColumns,
  IconRefresh,
} from "@tabler/icons-react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { z } from "zod"
import { toast } from "sonner"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { 
  getAgentReports,
  updateReportPublished,
  deleteReport,
  addOptimisticReport as addOptimisticReportAction,
  type AgentReportRow 
} from "~/actions/agent-reports"

// Re-export the type for external use
export type { AgentReportRow } from "~/actions/agent-reports"

// Team configuration for analyst tags
const teamConfig = {
  market: { label: 'Market', variant: 'default' as const },
  news: { label: 'News', variant: 'secondary' as const },
  fundamentals: { label: 'Fundamentals', variant: 'outline' as const },
  social: { label: 'Social', variant: 'destructive' as const }
} as const

// Status configuration for status badges
const statusConfig = {
  processing: { label: 'In Progress', variant: 'secondary' as const },
  done: { label: 'Complete', variant: 'default' as const },
  failed: { label: 'Failed', variant: 'destructive' as const },
  NEC: { label: 'Not Enough Coverage', variant: 'outline' as const }
} as const

// Define the schema for agent report data
export const agentReportSchema = z.object({
  id: z.string(),
  ticker: z.string(),
  analysisDate: z.date(),
  recommendation: z.string(),
  status: z.enum(['processing', 'done', 'failed', 'NEC']),
  published: z.boolean(),
  analystTeams: z.array(z.string()),
})

interface ReportDataTableProps {
  userId: string
  className?: string
  onOptimisticReportAdd?: (addOptimisticReport: (ticker: string, sessionId: string) => Promise<string>) => void
  onOptimisticReportUpdate?: (updateOptimisticReport: (reportId: string, updatedData: Partial<AgentReportRow>) => void) => void
}

// Animated table row component
const AnimatedTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & {
    isAnimating?: boolean
    isOptimistic?: boolean
  }
>(({ className, isAnimating, isOptimistic, ...props }, ref) => {
  return (
    <TableRow
      ref={ref}
      className={`
        ${className ?? ''}
        ${isAnimating ? 'animate-slide-down opacity-0' : ''}
        ${isOptimistic ? 'bg-muted/30' : ''}
      `}
      style={{
        animation: isAnimating ? 'slideDown 300ms ease-out forwards' : undefined,
      }}
      {...props}
    />
  )
})
AnimatedTableRow.displayName = "AnimatedTableRow"

// Create columns with action handlers
const createColumns = (
  onUnpublish: (id: string, ticker: string) => void,
  onDelete: (id: string, ticker: string) => void
): ColumnDef<AgentReportRow>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "ticker",
    header: "Name",
    cell: ({ row }) => (
      <div className="font-medium text-foreground">
        {row.original.ticker}
      </div>
    ),
    enableHiding: false,
    enableSorting: true,
  },
  {
    accessorKey: "analystTeams",
    header: "Team",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.analystTeams.length > 0 ? (
          row.original.analystTeams.map((team) => {
            const config = teamConfig[team as keyof typeof teamConfig]
            return (
              <Badge 
                key={team} 
                variant={config?.variant ?? 'outline'} 
                className="text-xs px-2 py-0.5"
              >
                {config?.label ?? team}
              </Badge>
            )
          })
        ) : (
          <span className="text-muted-foreground text-xs">No teams</span>
        )}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const config = statusConfig[row.original.status]
      return (
        <Badge 
          variant={config.variant} 
          className="text-xs px-2 py-0.5 whitespace-nowrap"
        >
          {config.label}
        </Badge>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: "analysisDate",
    header: "Analysis Date",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {row.original.analysisDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {row.original.updatedAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "recommendation",
    header: "Recommendation",
    cell: ({ row }) => (
      <div className="max-w-48 truncate text-sm" title={row.original.recommendation}>
        {row.original.recommendation ?? 'No recommendation'}
      </div>
    ),
    enableSorting: false,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem onClick={() => onUnpublish(row.original.id, row.original.ticker)}>
            Unpublish
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            variant="destructive" 
            onClick={() => onDelete(row.original.id, row.original.ticker)}
          >
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

export function ReportDataTable({ 
  userId, 
  className, 
  onOptimisticReportAdd, 
  onOptimisticReportUpdate 
}: ReportDataTableProps) {
  // State management
  const [data, setData] = React.useState<AgentReportRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshing, setRefreshing] = React.useState(false)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'updatedAt', desc: true },
    { id: 'analysisDate', desc: true }
  ])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // Animation state for new rows
  const [animatingRows, setAnimatingRows] = React.useState<Set<string>>(new Set())
  const [optimisticRows, setOptimisticRows] = React.useState<Set<string>>(new Set())

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean
    type: 'delete' | 'unpublish'
    reportId: string
    ticker: string
  }>({
    open: false,
    type: 'delete',
    reportId: '',
    ticker: '',
  })

  // Data fetching function
  const fetchData = React.useCallback(async () => {
    try {
      setError(null)
      const reports = await getAgentReports(userId)
      setData(reports)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch reports'
      setError(errorMessage)
      toast.error('Failed to load analysis reports')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  // Initial data fetch
  React.useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Handle confirmation dialog actions
  const openConfirmDialog = React.useCallback((type: 'delete' | 'unpublish', reportId: string, ticker: string) => {
    setConfirmDialog({
      open: true,
      type,
      reportId,
      ticker,
    })
  }, [])

  const closeConfirmDialog = React.useCallback(() => {
    setConfirmDialog(prev => ({ ...prev, open: false }))
  }, [])

  // Handle row actions
  const handleUnpublish = React.useCallback(async (reportId: string) => {
    try {
      await updateReportPublished(reportId, false)
      toast.success('Report unpublished successfully')
      // Optimistically update the local state
      setData(prevData => 
        prevData.map(report => 
          report.id === reportId 
            ? { ...report, published: false }
            : report
        )
      )
    } catch (err) {
      toast.error('Failed to unpublish report')
      console.error('Error unpublishing report:', err)
    } finally {
      closeConfirmDialog()
    }
  }, [closeConfirmDialog])

  const handleDelete = React.useCallback(async (reportId: string) => {
    try {
      await deleteReport(reportId)
      toast.success('Report deleted successfully')
      // Optimistically remove from local state
      setData(prevData => prevData.filter(report => report.id !== reportId))
    } catch (err) {
      toast.error('Failed to delete report')
      console.error('Error deleting report:', err)
    } finally {
      closeConfirmDialog()
    }
  }, [closeConfirmDialog])

  const handleConfirmAction = React.useCallback(async () => {
    if (confirmDialog.type === 'delete') {
      await handleDelete(confirmDialog.reportId)
    } else if (confirmDialog.type === 'unpublish') {
      await handleUnpublish(confirmDialog.reportId)
    }
  }, [confirmDialog, handleDelete, handleUnpublish])

  // Handle refresh
  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await fetchData()
  }, [fetchData])

  // Add optimistic report for new analysis
  const addOptimisticReport = React.useCallback(async (ticker: string, sessionId: string) => {
    try {
      // Create optimistic report entry
      const reportId = await addOptimisticReportAction(ticker, userId, sessionId)
      
      // Create optimistic row data
      const optimisticRow: AgentReportRow = {
        id: reportId,
        ticker,
        analysisDate: new Date(),
        updatedAt: new Date(),
        recommendation: '',
        status: 'processing',
        published: false,
        analystTeams: [],
        sessionId,
        userId,
      }

      // Add to optimistic rows set
      setOptimisticRows(prev => new Set(prev).add(reportId))
      
      // Add to animating rows set for animation
      setAnimatingRows(prev => new Set(prev).add(reportId))
      
      // Add to data at the beginning of the array
      setData(prevData => [optimisticRow, ...prevData])
      
      // Remove from animating rows after animation completes
      setTimeout(() => {
        setAnimatingRows(prev => {
          const newSet = new Set(prev)
          newSet.delete(reportId)
          return newSet
        })
      }, 300) // Animation duration
      
      return reportId
    } catch (error) {
      console.error('Error adding optimistic report:', error)
      toast.error('Failed to start analysis')
      throw error
    }
  }, [userId])

  // Update optimistic report when analysis completes
  const updateOptimisticReport = React.useCallback((reportId: string, updatedData: Partial<AgentReportRow>) => {
    setData(prevData => 
      prevData.map(report => 
        report.id === reportId 
          ? { ...report, ...updatedData }
          : report
      )
    )
    
    // Remove from optimistic rows set if analysis is complete
    if (updatedData.status && updatedData.status !== 'processing') {
      setOptimisticRows(prev => {
        const newSet = new Set(prev)
        newSet.delete(reportId)
        return newSet
      })
    }
  }, [])

  // Expose optimistic update functions to parent component
  React.useEffect(() => {
    if (onOptimisticReportAdd) {
      onOptimisticReportAdd(addOptimisticReport)
    }
    if (onOptimisticReportUpdate) {
      onOptimisticReportUpdate(updateOptimisticReport)
    }
  }, [addOptimisticReport, updateOptimisticReport, onOptimisticReportAdd, onOptimisticReportUpdate])

  // Create columns with handlers
  const columns = React.useMemo(
    () => createColumns(
      (id: string, ticker: string) => openConfirmDialog('unpublish', id, ticker), 
      (id: string, ticker: string) => openConfirmDialog('delete', id, ticker)
    ),
    [openConfirmDialog]
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })



  if (loading) {
    return (
      <div className={`w-full flex-col justify-start gap-6 ${className ?? ''}`}>
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Analysis Reports</h2>
          </div>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground flex items-center gap-2">
            <IconRefresh className="animate-spin size-4" />
            Loading analysis reports...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`w-full flex-col justify-start gap-6 ${className ?? ''}`}>
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Analysis Reports</h2>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <IconRefresh />
            <span className="hidden lg:inline">Retry</span>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <div className="text-destructive">Failed to load reports</div>
          <div className="text-muted-foreground text-sm">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full flex-col justify-start gap-6 ${className ?? ''}`}>
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Analysis Reports</h2>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">Customize Columns</span>
                <span className="lg:hidden">Columns</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <IconRefresh className={refreshing ? "animate-spin" : ""} />
            <span className="hidden lg:inline">
              {refreshing ? "Refreshing..." : "Refresh"}
            </span>
          </Button>
        </div>
      </div>
      
      <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const isAnimating = animatingRows.has(row.id)
                  const isOptimistic = optimisticRows.has(row.id)
                  
                  return (
                    <AnimatedTableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      isAnimating={isAnimating}
                      isOptimistic={isOptimistic}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </AnimatedTableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No analysis reports found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={closeConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === 'delete' ? 'Delete Report' : 'Unpublish Report'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === 'delete' 
                ? `Are you sure you want to permanently delete the analysis report for ${confirmDialog.ticker}? This action cannot be undone.`
                : `Are you sure you want to unpublish the analysis report for ${confirmDialog.ticker}? This will make it no longer visible to others.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeConfirmDialog}>
              Cancel
            </Button>
            <Button 
              variant={confirmDialog.type === 'delete' ? 'destructive' : 'default'}
              onClick={handleConfirmAction}
            >
              {confirmDialog.type === 'delete' ? 'Delete' : 'Unpublish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}