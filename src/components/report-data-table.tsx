"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconRefresh,
  IconLoader2,
  IconWorldUpload,
  IconCircleCheck,
  IconX,
  IconAlertTriangle,
  IconSortAscending2,
  IconSortDescending2,
} from "@tabler/icons-react";
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
} from "@tanstack/react-table";
import { z } from "zod";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ProgressButton } from "~/components/progress-button";
import {
  getAgentReports,
  updateReportPublished,
  deleteReport,
  type AgentReportRow,
} from "~/actions/agent-reports";

// Re-export the type for external use
export type { AgentReportRow } from "~/actions/agent-reports";

// Team configuration for analyst tags
const teamConfig = {
  market: { label: "Market", variant: "default" as const },
  news: { label: "News", variant: "secondary" as const },
  fundamentals: { label: "Fundamentals", variant: "outline" as const },
  social: { label: "Social", variant: "destructive" as const },
} as const;

// Status configuration for status badges
const statusConfig = {
  queued: {
    label: "Queued",
    variant: "secondary" as const,
    icon: IconWorldUpload,
    iconClassName: "text-blue-500",
  },
  processing: {
    label: "In Process",
    variant: "secondary" as const,
    icon: IconLoader2,
    iconClassName: "animate-spin text-gray-500",
  },
  done: {
    label: "Done",
    variant: "outline" as const,
    icon: IconCircleCheck,
    iconClassName: "text-green-600",
  },
  failed: {
    label: "Failed",
    variant: "destructive" as const,
    icon: IconX,
    iconClassName: "",
  },
  NEC: {
    label: "Not Enough Coverage",
    variant: "outline" as const,
    icon: IconAlertTriangle,
    iconClassName: "",
  },
} as const;

// Define the schema for agent report data
export const agentReportSchema = z.object({
  id: z.string(),
  ticker: z.string(),
  analysisDate: z.date(),
  recommendation: z.string(),
  status: z.enum(["queued", "processing", "done", "failed", "NEC"]),
  published: z.boolean(),
  analystTeams: z.array(z.string()),
});

interface ReportDataTableProps {
  userId: string;
  className?: string;
  onRefreshReady?: (refreshFn: () => Promise<void>) => void;
}

// Create columns with action handlers
const createColumns = (
  onTogglePublish: (id: string, ticker: string, published: boolean) => void,
  onDelete: (id: string, ticker: string) => void,
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
      <div className="text-foreground font-medium">{row.original.ticker}</div>
    ),
    enableHiding: false,
    enableSorting: true,
  },
  {
    accessorKey: "analystTeams",
    header: "Team",
    cell: ({ row }) => {
      const isProcessing =
        row.original.status === "processing" ||
        row.original.status === "queued";
      const hasTeams = row.original.analystTeams.length > 0;
      const teamCount = row.original.analystTeams.length;
      const showLoading = isProcessing && teamCount < 4; // Only show loading if not all 4 teams are complete

      return (
        <div className="flex flex-wrap items-center gap-1">
          {hasTeams ? (
            row.original.analystTeams.map((team) => {
              const config = teamConfig[team as keyof typeof teamConfig];
              return (
                <Badge
                  key={team}
                  variant={config?.variant ?? "outline"}
                  className="px-2 py-0.5 text-xs"
                >
                  {config?.label ?? team}
                </Badge>
              );
            })
          ) : (
            <span className="text-muted-foreground text-xs">
              Analyst joining
            </span>
          )}

          {/* Show loading icon when queued/processing and teams are still being processed */}
          {showLoading && (
            <IconLoader2 className="ml-1 size-3 animate-spin text-blue-500" />
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const config =
        statusConfig[row.original.status as keyof typeof statusConfig];

      // Fallback for unknown status
      if (!config) {
        return (
          <Badge variant="outline" className="px-2 py-0.5 text-xs">
            {row.original.status}
          </Badge>
        );
      }

      const IconComponent = config.icon;

      return (
        <Badge
          variant={config.variant}
          className={`flex items-center gap-1 px-2 py-0.5 text-xs whitespace-nowrap`}
        >
          <IconComponent className={`size-3 ${config.iconClassName}`} />
          {config.label}
        </Badge>
      );
    },
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      // Define status priority: queued > processing > failed > NEC > done
      const statusPriority = {
        queued: 0,
        processing: 1,
        failed: 2,
        NEC: 3,
        done: 4,
      };
      const priorityA =
        statusPriority[rowA.original.status as keyof typeof statusPriority] ??
        999;
      const priorityB =
        statusPriority[rowB.original.status as keyof typeof statusPriority] ??
        999;
      return priorityA - priorityB;
    },
  },
  {
    accessorKey: "analysisDate",
    header: "Analysis Date",
    cell: ({ row }) => (
      <div className="text-muted-foreground text-sm whitespace-nowrap">
        {row.original.analysisDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <div className="text-muted-foreground text-sm whitespace-nowrap">
        {row.original.updatedAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "recommendation",
    header: "Recommendation",
    cell: ({ row }) => {
      const { recommendation, status, id, ticker } = row.original;

      // Show progress button if recommendation is null/empty and status is processing
      if (
        (!recommendation || recommendation.trim() === "") &&
        status === "processing"
      ) {
        return <ProgressButton reportId={id} ticker={ticker} />;
      }

      // Helper function to get emoji for recommendation
      const getRecommendationEmoji = (rec: string) => {
        const upperRec = rec.toUpperCase();
        if (upperRec === "BUY" || upperRec === "STRONG BUY") return "🚀";
        if (upperRec === "SELL" || upperRec === "STRONG SELL") return "💩";
        if (upperRec === "HOLD") return "⏸️";
        if (upperRec === "BUY OR HOLD" || upperRec.includes("BUY")) return "🙌";
        if (upperRec === "SELL OR HOLD" || upperRec.includes("SELL"))
          return "🙌";
        return "📊"; // Default for other recommendations
      };

      // Handle case where recommendation exists
      if (recommendation && recommendation.trim() !== "") {
        return (
          <Badge
            variant="outline"
            className="border-border bg-background text-foreground hover:bg-muted flex items-center gap-1.5 px-2 py-1 text-xs whitespace-nowrap"
          >
            <span className="text-sm">
              {getRecommendationEmoji(recommendation)}
            </span>
            <span>{recommendation}</span>
          </Badge>
        );
      }

      // Fallback for empty recommendation
      return (
        <div className="text-muted-foreground text-xs">No recommendation</div>
      );
    },
    enableSorting: false,
    filterFn: (row, id, value) => {
      const recommendation = row.getValue(id) as string;
      if (!recommendation || recommendation.trim() === "") {
        return false; // Don't show rows without recommendations in filter results
      }
      return recommendation === value; // Exact match for database values
    },
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
          <DropdownMenuItem
            onClick={() =>
              onTogglePublish(
                row.original.id,
                row.original.ticker,
                row.original.published,
              )
            }
          >
            {row.original.published ? "Unpublish" : "Publish"}
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
];

export function ReportDataTable({
  userId,
  className,
  onRefreshReady,
}: ReportDataTableProps) {
  // Navigation
  const router = useRouter();

  // State management
  const [data, setData] = React.useState<AgentReportRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "desc",
  );
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "updatedAt", desc: true },
    { id: "status", desc: false }, // processing first, then failed, NEC, done
    { id: "analysisDate", desc: true },
  ]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    type: "delete" | "publish" | "unpublish";
    reportId: string;
    ticker: string;
  }>({
    open: false,
    type: "delete",
    reportId: "",
    ticker: "",
  });

  // Data fetching function
  const fetchData = React.useCallback(async () => {
    try {
      setError(null);
      const reports = await getAgentReports(userId);
      console.log(
        "Fetched reports:",
        reports.map((r) => ({
          ticker: r.ticker,
          status: r.status,
          sessionId: r.sessionId,
        })),
      );
      setData(reports);
    } catch (err) {
      console.error("Error fetching reports:", err);

      let errorMessage = "Failed to fetch reports";
      let toastMessage = "Failed to load analysis reports";

      if (err instanceof Error) {
        errorMessage = err.message;

        // Provide specific error messages based on error type
        if (err.message.includes("network") || err.message.includes("fetch")) {
          toastMessage = "Network error - please check your connection";
        } else if (err.message.includes("timeout")) {
          toastMessage = "Request timed out - please try again";
        } else if (
          err.message.includes("database") ||
          err.message.includes("Database")
        ) {
          toastMessage = "Database temporarily unavailable";
        } else if (
          err.message.includes("unauthorized") ||
          err.message.includes("Unauthorized")
        ) {
          toastMessage = "Session expired - please sign in again";
        }
      }

      setError(errorMessage);
      toast.error(toastMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Handle refresh
  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, [fetchData]);

  // Initial data fetch
  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Expose refresh function to parent component
  React.useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(handleRefresh);
    }
  }, [onRefreshReady, handleRefresh]);

  // Handle confirmation dialog actions
  const openConfirmDialog = React.useCallback(
    (
      type: "delete" | "publish" | "unpublish",
      reportId: string,
      ticker: string,
    ) => {
      setConfirmDialog({
        open: true,
        type,
        reportId,
        ticker,
      });
    },
    [],
  );

  const closeConfirmDialog = React.useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  }, []);

  // Handle row actions
  const handleTogglePublish = React.useCallback(
    async (reportId: string, currentPublished: boolean) => {
      const newPublished = !currentPublished;
      try {
        await updateReportPublished(reportId, newPublished);
        toast.success(
          `Report ${newPublished ? "published" : "unpublished"} successfully`,
        );
        // Update the local state
        setData((prevData) =>
          prevData.map((report) =>
            report.id === reportId
              ? { ...report, published: newPublished }
              : report,
          ),
        );
      } catch (err) {
        console.error(
          `Error ${newPublished ? "publishing" : "unpublishing"} report:`,
          err,
        );

        // Provide specific error messages
        let errorMessage = `Failed to ${newPublished ? "publish" : "unpublish"} report`;
        if (err instanceof Error) {
          if (
            err.message.includes("network") ||
            err.message.includes("fetch")
          ) {
            errorMessage = "Network error - please check your connection";
          } else if (
            err.message.includes("unauthorized") ||
            err.message.includes("permission")
          ) {
            errorMessage = "You don't have permission to modify this report";
          } else if (err.message.includes("not found")) {
            errorMessage = "Report not found - it may have been deleted";
          }
        }

        toast.error(errorMessage);
      } finally {
        closeConfirmDialog();
      }
    },
    [closeConfirmDialog],
  );

  const handleDelete = React.useCallback(
    async (reportId: string) => {
      try {
        await deleteReport(reportId);
        toast.success("Report deleted successfully");
        // Remove from local state
        setData((prevData) =>
          prevData.filter((report) => report.id !== reportId),
        );
      } catch (err) {
        console.error("Error deleting report:", err);

        // Provide specific error messages
        let errorMessage = "Failed to delete report";
        if (err instanceof Error) {
          if (
            err.message.includes("network") ||
            err.message.includes("fetch")
          ) {
            errorMessage = "Network error - please check your connection";
          } else if (
            err.message.includes("unauthorized") ||
            err.message.includes("permission")
          ) {
            errorMessage = "You don't have permission to delete this report";
          } else if (err.message.includes("not found")) {
            errorMessage =
              "Report not found - it may have already been deleted";
          } else if (
            err.message.includes("constraint") ||
            err.message.includes("reference")
          ) {
            errorMessage =
              "Cannot delete report - it may be referenced by other data";
          }
        }

        toast.error(errorMessage);
      } finally {
        closeConfirmDialog();
      }
    },
    [closeConfirmDialog],
  );

  const handleConfirmAction = React.useCallback(async () => {
    if (confirmDialog.type === "delete") {
      await handleDelete(confirmDialog.reportId);
    } else if (
      confirmDialog.type === "publish" ||
      confirmDialog.type === "unpublish"
    ) {
      const currentPublished = confirmDialog.type === "unpublish";
      await handleTogglePublish(confirmDialog.reportId, currentPublished);
    }
  }, [confirmDialog, handleDelete, handleTogglePublish]);

  // Handle sort direction toggle
  const handleSortToggle = React.useCallback(() => {
    const newDirection = sortDirection === "desc" ? "asc" : "desc";
    setSortDirection(newDirection);

    // Update the sorting state to reflect the new direction
    setSorting([
      { id: "updatedAt", desc: newDirection === "desc" },
      { id: "status", desc: false }, // Keep status sorting as is
      { id: "analysisDate", desc: newDirection === "desc" },
    ]);
  }, [sortDirection]);

  // Handle row click navigation
  const handleRowClick = React.useCallback(
    async (sessionId: string, event: React.MouseEvent) => {
      // Prevent navigation if clicking on buttons or interactive elements
      const target = event.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest('[role="button"]') ||
        target.closest("a")
      ) {
        return;
      }

      // Update sidebar ordering before navigation
      try {
        console.log("Updating sidebar for sessionId:", sessionId);
        const response = await fetch("/api/reports/sidebar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          throw new Error(
            `API call failed: ${response.status} ${response.statusText}`,
          );
        }

        const result = await response.json();
        console.log("Sidebar update result:", result);

        // Dispatch a custom event to notify the sidebar to refresh
        window.dispatchEvent(
          new CustomEvent("sidebarRefresh", {
            detail: { sessionId },
          }),
        );
      } catch (error) {
        console.error("Failed to update sidebar ordering:", error);
        // Continue with navigation even if sidebar update fails
      }

      router.push(`/document/${sessionId}`);
    },
    [router],
  );

  // Create columns with handlers
  const columns = React.useMemo(
    () =>
      createColumns(
        (id: string, ticker: string, published: boolean) =>
          openConfirmDialog(published ? "unpublish" : "publish", id, ticker),
        (id: string, ticker: string) => openConfirmDialog("delete", id, ticker),
      ),
    [openConfirmDialog],
  );

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
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  if (loading) {
    return (
      <div
        className={`flex w-full flex-col justify-start gap-6 ${className ?? ""}`}
      >
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Analysis Reports</h2>
          </div>
        </div>
        <div className="flex h-32 items-center justify-center">
          <div className="text-muted-foreground flex items-center gap-2">
            <IconRefresh className="size-4 animate-spin" />
            Loading analysis reports...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex w-full flex-col justify-start gap-6 ${className ?? ""}`}
      >
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Analysis Reports</h2>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <IconRefresh />
            <span className="hidden lg:inline">Retry</span>
          </Button>
        </div>
        <div className="flex h-32 flex-col items-center justify-center gap-2">
          <div className="text-destructive">Failed to load reports</div>
          <div className="text-muted-foreground text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex w-full flex-col justify-start gap-2 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Analysis Reports 📖</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <Select
            value={
              (table.getColumn("status")?.getFilterValue() as string) ?? "all"
            }
            onValueChange={(value) => {
              table
                .getColumn("status")
                ?.setFilterValue(value === "all" ? undefined : value);
            }}
          >
            <SelectTrigger className="w-auto max-w-[200px] min-w-[80px] rounded-full border-0 bg-gray-100 px-4 py-2 transition-colors hover:bg-gray-200 focus:bg-gray-200 [&_*[data-slot=select-value]]:line-clamp-none [&_*[data-slot=select-value]]:whitespace-nowrap">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="processing">In Process</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="NEC">Not Enough Coverage</SelectItem>
            </SelectContent>
          </Select>

          {/* Recommendation Filter */}
          <Select
            value={
              (table.getColumn("recommendation")?.getFilterValue() as string) ??
              "all"
            }
            onValueChange={(value) => {
              table
                .getColumn("recommendation")
                ?.setFilterValue(value === "all" ? undefined : value);
            }}
          >
            <SelectTrigger className="w-auto max-w-[220px] min-w-[80px] rounded-full border-0 bg-gray-100 px-4 py-2 transition-colors hover:bg-gray-200 focus:bg-gray-200 [&_*[data-slot=select-value]]:line-clamp-none [&_*[data-slot=select-value]]:whitespace-nowrap">
              <SelectValue placeholder="All Recommendations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Recommendations</SelectItem>
              <SelectItem value="BUY">BUY</SelectItem>
              <SelectItem value="SELL">SELL</SelectItem>
              <SelectItem value="HOLD">HOLD</SelectItem>
              <SelectItem value="BUY or HOLD">BUY or HOLD</SelectItem>
              <SelectItem value="SELL or HOLD">SELL or HOLD</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSortToggle}
            title={`Sort ${sortDirection === "desc" ? "Ascending" : "Descending"}`}
          >
            {sortDirection === "desc" ? (
              <IconSortDescending2 className="size-4" />
            ) : (
              <IconSortAscending2 className="size-4" />
            )}
          </Button>

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
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={(event) => {
                      void handleRowClick(row.original.sessionId, event);
                    }}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
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
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-20 rounded-full border-0 bg-gray-100 px-3 py-1 transition-colors hover:bg-gray-200 focus:bg-gray-200"
                  id="rows-per-page"
                >
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
              {confirmDialog.type === "delete"
                ? "Delete Report"
                : confirmDialog.type === "publish"
                  ? "Publish Report"
                  : "Unpublish Report"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === "delete"
                ? `Are you sure you want to permanently delete the analysis report for ${confirmDialog.ticker}? This action cannot be undone.`
                : confirmDialog.type === "publish"
                  ? `Are you sure you want to publish the analysis report for ${confirmDialog.ticker}? This will make it visible to others.`
                  : `Are you sure you want to unpublish the analysis report for ${confirmDialog.ticker}? This will make it no longer visible to others.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeConfirmDialog}>
              Cancel
            </Button>
            <Button
              variant={
                confirmDialog.type === "delete" ? "destructive" : "default"
              }
              onClick={handleConfirmAction}
            >
              {confirmDialog.type === "delete"
                ? "Delete"
                : confirmDialog.type === "publish"
                  ? "Publish"
                  : "Unpublish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
