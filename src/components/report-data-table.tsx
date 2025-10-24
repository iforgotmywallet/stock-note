"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  IconChevronDown,
  IconEyeOff,
  IconTrash,
  IconBookmark,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
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
  bulkDeleteReports,
  bulkSaveReports,
  type AgentReportRow,
} from "~/actions/agent-reports";
import { extractHashFromSessionId } from "~/lib/utils";

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
  showIdColumn?: boolean;
}

// Create columns with action handlers
const createColumns = (
  onTogglePublish: (id: string, ticker: string, published: boolean) => void,
  onDelete: (id: string, ticker: string) => void,
  updateSidebarAsync: (sessionId: string) => void,
  showIdColumn: boolean = false,
): ColumnDef<AgentReportRow>[] => {
  const columns: ColumnDef<AgentReportRow>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
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
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
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
  ];

  // Conditionally add ID column
  if (showIdColumn) {
    columns.push({
      accessorKey: "sessionId",
      header: "Id",
      cell: ({ row }) => {
        const sessionId = row.original.sessionId;
        const hashId = extractHashFromSessionId(sessionId);
        return <div className="font-mono text-sm">{hashId}</div>;
      },
      enableSorting: true,
    });
  }

  // Add remaining columns
  columns.push(
  {
    accessorKey: "ticker",
    header: "Name",
    cell: ({ row }) => (
      <Link 
        href={`/document/${row.original.sessionId}`}
        className="text-foreground font-medium hover:underline"
        onClick={() => updateSidebarAsync(row.original.sessionId)}
      >
        {row.original.ticker}
      </Link>
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
    header: ({ column }) => {
      const [popoverOpen, setPopoverOpen] = React.useState(false);
      
      const handleSort = (direction: "asc" | "desc") => {
        column.toggleSorting(direction === "desc");
        setPopoverOpen(false);
      };

      return (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto p-0 font-medium hover:bg-transparent"
            >
              <span>Analysis Date</span>
              <IconChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-1" align="start">
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleSort("asc")}
              >
                <IconSortAscending2 className="mr-2 h-3 w-3" />
                Asc
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleSort("desc")}
              >
                <IconSortDescending2 className="mr-2 h-3 w-3" />
                Desc
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      );
    },
    cell: ({ row }) => (
      <Link 
        href={`/document/${row.original.sessionId}`}
        className="text-muted-foreground text-sm whitespace-nowrap hover:underline"
        onClick={() => updateSidebarAsync(row.original.sessionId)}
      >
        {row.original.analysisDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </Link>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      const [popoverOpen, setPopoverOpen] = React.useState(false);
      
      const handleSort = (direction: "asc" | "desc") => {
        column.toggleSorting(direction === "desc");
        setPopoverOpen(false);
      };

      return (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto p-0 font-medium hover:bg-transparent"
            >
              <span>Updated</span>
              <IconChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-1" align="start">
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleSort("asc")}
              >
                <IconSortAscending2 className="mr-2 h-3 w-3" />
                Asc
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleSort("desc")}
              >
                <IconSortDescending2 className="mr-2 h-3 w-3" />
                Desc
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      );
    },
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
          <Link 
            href={`/document/${row.original.sessionId}`}
            onClick={() => updateSidebarAsync(row.original.sessionId)}
          >
            <Badge
              variant="outline"
              className="border-border bg-background text-foreground hover:bg-muted flex items-center gap-1.5 px-2 py-1 text-xs whitespace-nowrap cursor-pointer"
            >
              <span className="text-sm">
                {getRecommendationEmoji(recommendation)}
              </span>
              <span>{recommendation}</span>
            </Badge>
          </Link>
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
            onClick={(e) => e.stopPropagation()}
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onTogglePublish(
                row.original.id,
                row.original.ticker,
                row.original.published,
              );
            }}
          >
            {row.original.published ? "Unpublish" : "Publish"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row.original.id, row.original.ticker);
            }}
          >
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  });

  return columns;
};

export function ReportDataTable({
  userId,
  className,
  onRefreshReady,
  showIdColumn = false,
}: ReportDataTableProps) {
  const router = useRouter();

  // State management
  const [data, setData] = React.useState<AgentReportRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

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
    type: "delete" | "publish" | "unpublish" | "bulkDelete";
    reportId: string;
    ticker: string;
    selectedReports?: AgentReportRow[];
    loading?: boolean;
  }>({
    open: false,
    type: "delete",
    reportId: "",
    ticker: "",
    loading: false,
  });

  // Bulk operations loading state
  const [bulkOperationLoading, setBulkOperationLoading] = React.useState(false);

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

  // Expose refresh function to parent component for main table refresh
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
      
      // Set loading state
      setConfirmDialog(prev => ({ ...prev, loading: true }));

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
            errorMessage = "Network error - please check your connection and try again";
          } else if (err.message.includes("timeout")) {
            errorMessage = "Request timed out - please try again";
          } else if (
            err.message.includes("unauthorized") ||
            err.message.includes("permission")
          ) {
            errorMessage = "You don't have permission to modify this report";
          } else if (err.message.includes("not found")) {
            errorMessage = "Report not found - it may have been deleted";
          } else if (err.message.includes("database") || err.message.includes("Database")) {
            errorMessage = "Database temporarily unavailable - please try again later";
          }
        }

        toast.error(errorMessage);
      } finally {
        setConfirmDialog(prev => ({ ...prev, loading: false }));
        closeConfirmDialog();
      }
    },
    [closeConfirmDialog],
  );

  const handleDelete = React.useCallback(
    async (reportId: string) => {
      // Set loading state
      setConfirmDialog(prev => ({ ...prev, loading: true }));

      try {
        await deleteReport(reportId);
        toast.success("Report deleted successfully");
        // Remove from local state
        setData((prevData) =>
          prevData.filter((report) => report.id !== reportId),
        );
        
        // Report deleted successfully
      } catch (err) {
        console.error("Error deleting report:", err);

        // Provide specific error messages
        let errorMessage = "Failed to delete report";
        if (err instanceof Error) {
          if (
            err.message.includes("network") ||
            err.message.includes("fetch")
          ) {
            errorMessage = "Network error - please check your connection and try again";
          } else if (err.message.includes("timeout")) {
            errorMessage = "Request timed out - please try again";
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
          } else if (err.message.includes("database") || err.message.includes("Database")) {
            errorMessage = "Database temporarily unavailable - please try again later";
          }
        }

        toast.error(errorMessage);
      } finally {
        setConfirmDialog(prev => ({ ...prev, loading: false }));
        closeConfirmDialog();
      }
    },
    [closeConfirmDialog],
  );



  const handleBulkDeleteConfirmed = React.useCallback(async () => {
    const selectedReports = confirmDialog.selectedReports;
    if (!selectedReports || selectedReports.length === 0) return;

    const reportIds = selectedReports.map(report => report.id);

    // Set loading state
    setConfirmDialog(prev => ({ ...prev, loading: true }));
    setBulkOperationLoading(true);

    try {
      const result = await bulkDeleteReports(reportIds, userId);
      
      if (result.deleted > 0) {
        toast.success(`${result.deleted} report${result.deleted === 1 ? '' : 's'} deleted successfully`);
        
        // Remove deleted reports from local state
        setData(prevData => 
          prevData.filter(report => !reportIds.includes(report.id))
        );
        
        // Clear selection
        setRowSelection({});
        
        // Reports deleted successfully
      }
      
      if (result.failed.length > 0) {
        const failedCount = result.failed.length;
        if (result.deleted > 0) {
          toast.warning(`${result.deleted} report${result.deleted === 1 ? '' : 's'} deleted, but ${failedCount} failed due to permission issues`);
        } else {
          toast.error(`Failed to delete ${failedCount} report${failedCount === 1 ? '' : 's'} - you don't have permission to delete these reports`);
        }
      }
    } catch (err) {
      console.error("Error deleting reports:", err);
      
      // Provide specific error messages
      let errorMessage = "Failed to delete reports";
      if (err instanceof Error) {
        if (err.message.includes("network") || err.message.includes("fetch")) {
          errorMessage = "Network error - please check your connection and try again";
        } else if (err.message.includes("timeout")) {
          errorMessage = "Request timed out - please try again";
        } else if (err.message.includes("permission") || err.message.includes("unauthorized")) {
          errorMessage = "You don't have permission to delete these reports";
        } else if (err.message.includes("database") || err.message.includes("Database")) {
          errorMessage = "Database temporarily unavailable - please try again later";
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setConfirmDialog(prev => ({ ...prev, loading: false }));
      setBulkOperationLoading(false);
      closeConfirmDialog();
    }
  }, [confirmDialog.selectedReports, userId, closeConfirmDialog]);

  const handleConfirmAction = React.useCallback(async () => {
    if (confirmDialog.type === "delete") {
      await handleDelete(confirmDialog.reportId);
    } else if (
      confirmDialog.type === "publish" ||
      confirmDialog.type === "unpublish"
    ) {
      const currentPublished = confirmDialog.type === "unpublish";
      await handleTogglePublish(confirmDialog.reportId, currentPublished);
    } else if (confirmDialog.type === "bulkDelete") {
      await handleBulkDeleteConfirmed();
    }
  }, [confirmDialog, handleDelete, handleTogglePublish, handleBulkDeleteConfirmed]);



  // Simple navigation helper for updating sidebar (optional, lightweight)
  const updateSidebarAsync = React.useCallback(async (sessionId: string) => {
    // Fire and forget - don't block navigation
    try {
      fetch("/api/reports/sidebar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {}); // Ignore errors
    } catch (error) {
      // Ignore errors - this is optional
    }
  }, []);

  // Simple, lightweight row click handler
  const handleRowClick = React.useCallback((sessionId: string, event: React.MouseEvent) => {
    // Prevent navigation if clicking on interactive elements
    const target = event.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest('[role="checkbox"]') ||
      target.closest('[role="menuitem"]')
    ) {
      return;
    }

    // Update sidebar in background (non-blocking)
    updateSidebarAsync(sessionId);
    
    // Navigate immediately
    router.push(`/document/${sessionId}`);
  }, [router, updateSidebarAsync]);

  // Create columns with handlers
  const columns = React.useMemo(
    () =>
      createColumns(
        (id: string, ticker: string, published: boolean) =>
          openConfirmDialog(published ? "unpublish" : "publish", id, ticker),
        (id: string, ticker: string) => openConfirmDialog("delete", id, ticker),
        updateSidebarAsync,
        showIdColumn,
      ),
    [openConfirmDialog, showIdColumn, updateSidebarAsync],
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

  // Handle bulk actions (defined after table creation)
  const handleBulkDelete = React.useCallback(async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedReports = selectedRows.map(row => row.original);
    
    if (selectedReports.length === 0) return;

    setConfirmDialog({
      open: true,
      type: "bulkDelete",
      reportId: "",
      ticker: "",
      selectedReports,
    });
  }, [table]);

  const handleBulkSave = React.useCallback(async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedReports = selectedRows.map(row => row.original);
    
    if (selectedReports.length === 0) return;

    // Validate that all selected reports have "done" status
    const nonDoneReports = selectedReports.filter(report => report.status !== "done");
    if (nonDoneReports.length > 0) {
      const nonDoneTickers = nonDoneReports.map(r => r.ticker).join(", ");
      toast.error(
        `Cannot save reports that are not completed. The following reports are not done: ${nonDoneTickers}`
      );
      return;
    }

    const sessionIds = selectedReports.map(report => report.sessionId);
    setBulkOperationLoading(true);

    try {
      const result = await bulkSaveReports(sessionIds, userId);
      
      if (result.saved > 0 && result.skipped > 0) {
        toast.success(`${result.saved} report${result.saved === 1 ? '' : 's'} saved successfully. ${result.skipped} ${result.skipped === 1 ? 'was' : 'were'} already saved.`);
      } else if (result.saved > 0) {
        toast.success(`${result.saved} report${result.saved === 1 ? '' : 's'} saved successfully`);
      } else if (result.skipped > 0) {
        toast.info(`All ${result.skipped} report${result.skipped === 1 ? ' was' : 's were'} already saved`);
      } else {
        toast.info("No reports were saved");
      }
      
      // Clear selection after successful save
      setRowSelection({});
      
      // Reports saved successfully
    } catch (err) {
      console.error("Error saving reports:", err);
      
      // Provide specific error messages
      let errorMessage = "Failed to save reports";
      if (err instanceof Error) {
        if (err.message.includes("network") || err.message.includes("fetch")) {
          errorMessage = "Network error - please check your connection and try again";
        } else if (err.message.includes("timeout")) {
          errorMessage = "Request timed out - please try again";
        } else if (err.message.includes("permission") || err.message.includes("unauthorized")) {
          errorMessage = "You don't have permission to save these reports";
        } else if (err.message.includes("database") || err.message.includes("Database")) {
          errorMessage = "Database temporarily unavailable - please try again later";
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setBulkOperationLoading(false);
    }
  }, [table, userId]);

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
          {/* Bulk Actions Dropdown */}
          {(() => {
            const selectedRows = table.getFilteredSelectedRowModel().rows;
            const selectedCount = selectedRows.length;
            const selectedReports = selectedRows.map(row => row.original);
            const nonDoneReports = selectedReports.filter(report => report.status !== "done");
            const hasNonDoneReports = nonDoneReports.length > 0;
            
            const isDisabled = selectedCount === 0 || bulkOperationLoading;
            const isSaveDisabled = isDisabled || hasNonDoneReports;
            
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDisabled}
                    className={`${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {bulkOperationLoading ? (
                      <>
                        <IconLoader2 className="mr-1 h-3 w-3 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Actions{selectedCount > 0 ? ` (${selectedCount})` : ''}
                        <IconChevronDown className="ml-1 h-3 w-3" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={handleBulkSave}
                    disabled={isSaveDisabled}
                    className={hasNonDoneReports ? 'opacity-50' : ''}
                  >
                    <IconBookmark className="mr-2 h-4 w-4" />
                    Save Selected
                    {hasNonDoneReports && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (Only done)
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleBulkDelete}
                    disabled={isDisabled}
                    className="text-destructive focus:text-destructive"
                  >
                    <IconTrash className="mr-2 h-4 w-4" />
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}

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
                    onClick={(event) => handleRowClick(row.original.sessionId, event)}
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
      <Dialog open={confirmDialog.open} onOpenChange={confirmDialog.loading ? undefined : closeConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === "delete"
                ? "Delete Report"
                : confirmDialog.type === "bulkDelete"
                  ? "Delete Selected Reports"
                  : confirmDialog.type === "publish"
                    ? "Publish Report"
                    : "Unpublish Report"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === "delete"
                ? `Are you sure you want to permanently delete the analysis report for ${confirmDialog.ticker}? This action cannot be undone and will remove all associated data.`
                : confirmDialog.type === "bulkDelete"
                  ? (() => {
                      const selectedReports = confirmDialog.selectedReports || [];
                      const count = selectedReports.length;
                      const tickers = selectedReports.map(r => r.ticker);
                      const displayTickers = count <= 5 ? tickers.join(", ") : `${tickers.slice(0, 3).join(", ")} and ${count - 3} more`;
                      return `Are you sure you want to permanently delete ${count} report${count === 1 ? '' : 's'}? (${displayTickers}) This action cannot be undone and will remove all associated data for these reports.`;
                    })()
                  : confirmDialog.type === "publish"
                    ? `Are you sure you want to publish the analysis report for ${confirmDialog.ticker}? This will make the report visible to other users.`
                    : `Are you sure you want to unpublish the analysis report for ${confirmDialog.ticker}? This will make the report no longer visible to other users.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={closeConfirmDialog}
              disabled={confirmDialog.loading}
            >
              Cancel
            </Button>
            <Button
              variant={
                confirmDialog.type === "delete" || confirmDialog.type === "bulkDelete" 
                  ? "destructive" 
                  : "default"
              }
              onClick={handleConfirmAction}
              disabled={confirmDialog.loading}
            >
              {confirmDialog.loading ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  {confirmDialog.type === "delete"
                    ? "Deleting..."
                    : confirmDialog.type === "bulkDelete"
                      ? "Deleting..."
                      : confirmDialog.type === "publish"
                        ? "Publishing..."
                        : "Unpublishing..."}
                </>
              ) : (
                <>
                  {confirmDialog.type === "delete"
                    ? "Delete Report"
                    : confirmDialog.type === "bulkDelete"
                      ? "Delete Selected"
                      : confirmDialog.type === "publish"
                        ? "Publish Report"
                        : "Unpublish Report"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
