"use client";

import * as React from "react";
import type { PortfolioActionWithDetails } from "~/lib/database/portfolios";
import { EmptyActionsState } from "~/components/portfolio-empty-states";
import { IconAlertTriangle } from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { MarkdownRenderer } from "~/components/markdown-renderer";
import { cn } from "~/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";


interface PortfolioRecentActionsProps {
  actions: PortfolioActionWithDetails[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  portfolioName?: string;
  className?: string;
}

/**
 * Component to display recent AI trading actions for a portfolio
 * Shows the last 10 actions with proper formatting and styling
 */
export function PortfolioRecentActions({ 
  actions, 
  loading = false, 
  error = null, 
  onRetry,
  portfolioName = "Portfolio",
  className
}: PortfolioRecentActionsProps) {
  const [selectedAction, setSelectedAction] = React.useState<PortfolioActionWithDetails | null>(null);
  const [analysisData, setAnalysisData] = React.useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  
  // Calculate pagination
  const totalPages = Math.ceil(actions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedActions = actions.slice(startIndex, endIndex);
  
  // Reset to page 1 when actions change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [actions.length]);

  // Fetch analysis data when dialog opens
  React.useEffect(() => {
    if (selectedAction?.session_id) {
      setIsLoadingAnalysis(true);
      setAnalysisError(null);
      setAnalysisData(null);
      
      fetch(`/api/reports/${selectedAction.session_id}/analysis`)
        .then(async res => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            // For 404, show a user-friendly message
            if (res.status === 404) {
              throw new Error('Analysis report not found. This action may not have an associated analysis report.');
            }
            throw new Error(errorData.error || `Failed to fetch analysis (${res.status})`);
          }
          return res.json();
        })
        .then(data => {
          setAnalysisData(data.final_analysis || 'No analysis available for this action.');
        })
        .catch(err => {
          console.error('Error fetching analysis for session_id:', selectedAction.session_id, err);
          setAnalysisError(err.message || 'Failed to load analysis');
        })
        .finally(() => {
          setIsLoadingAnalysis(false);
        });
    } else if (selectedAction) {
      // No session_id available
      setAnalysisData('No analysis report linked to this action.');
      setIsLoadingAnalysis(false);
    }
  }, [selectedAction?.session_id, selectedAction]);
  // Loading state
  if (loading) {
    return (
      <div className={cn("rounded-lg border", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Date</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Trade Type</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("rounded-lg border", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Date</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Trade Type</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center">
                <div className="flex flex-col items-center gap-3 text-red-600">
                  <IconAlertTriangle className="size-12" />
                  <div className="space-y-1">
                    <div className="font-medium">Failed to load trading actions</div>
                    <div className="text-sm text-gray-600">{error}</div>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state
  if (actions.length === 0) {
    return <EmptyActionsState portfolioName={portfolioName} />;
  }

  return (
    <div className={cn("rounded-lg border overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap w-[160px]">Date</TableHead>
              <TableHead className="whitespace-nowrap w-[100px]">Ticker</TableHead>
              <TableHead className="whitespace-nowrap w-[110px]">Action</TableHead>
              <TableHead className="whitespace-nowrap w-[150px]">Trade Type</TableHead>
              <TableHead className="whitespace-nowrap text-right w-[120px]">Shares</TableHead>
              <TableHead className="whitespace-nowrap text-right w-[120px]">Price</TableHead>
              <TableHead className="whitespace-nowrap pl-8">Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedActions.map((action) => (
              <TableRow key={action.id}>
                <TableCell className="whitespace-nowrap text-sm align-middle w-[160px]">
                  <div className="flex flex-col">
                    <span>
                      {new Date(action.action_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(action.action_date).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm font-medium font-mono align-middle w-[100px]">
                  {action.ticker}
                </TableCell>
                <TableCell className="whitespace-nowrap align-middle w-[110px]">
                  <ActionBadge action={action.action} />
                </TableCell>
                <TableCell className="whitespace-nowrap align-middle w-[150px]">
                  <TradeTypeBadge tradeType={action.trade_type} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-right align-middle w-[120px]">
                  {action.shares.toFixed(2)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-right align-middle w-[120px]">
                  ${action.price_at_action.toFixed(2)}
                </TableCell>
                <TableCell className="text-sm align-middle pl-8">
                  <Button
                    variant="link"
                    className="h-auto p-0 text-left font-normal"
                    onClick={() => setSelectedAction(action)}
                  >
                    <span className="max-w-xs truncate block">
                      {action.note ?? 'View Analysis'}
                    </span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {actions.length === 0 ? '0' : startIndex + 1} - {Math.min(endIndex, actions.length)} of {actions.length} row(s)
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Rows per page selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Page info and navigation */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <IconChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <IconChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <IconChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <IconChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Dialog */}
      <Dialog open={!!selectedAction} onOpenChange={(open) => !open && setSelectedAction(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Trading Action Details - {selectedAction?.ticker}
            </DialogTitle>
            <DialogDescription>
              {selectedAction?.action} {selectedAction?.shares.toFixed(2)} shares at ${selectedAction?.price_at_action.toFixed(2)} | {selectedAction?.action_date ? new Date(selectedAction.action_date).toLocaleString() : 'N/A'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            {/* Action Note */}
            {selectedAction?.note && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <h3 className="text-sm font-semibold mb-2">Note</h3>
                <p className="text-sm">{selectedAction.note}</p>
              </div>
            )}

            {/* Analysis Section */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Action Report</h3>
              {isLoadingAnalysis && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading analysis...</div>
                </div>
              )}
              
              {analysisError && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20 p-4">
                  <div className="flex items-start gap-2 text-yellow-800 dark:text-yellow-200">
                    <IconAlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">{analysisError}</div>
                  </div>
                </div>
              )}
              
              {!isLoadingAnalysis && !analysisError && analysisData && (
                <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border p-4">
                  <MarkdownRenderer content={analysisData} />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Action badge component with appropriate styling for different action types
 */
function ActionBadge({ action }: { action: string }) {
  const getBadgeStyles = (actionType: string) => {
    switch (actionType.toUpperCase()) {
      case 'BUY':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
      case 'SELL':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
      case 'HOLD':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600';
      default:
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700';
    }
  };

  return (
    <span 
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getBadgeStyles(action)}`}
    >
      {action.toUpperCase()}
    </span>
  );
}

/**
 * Trade type badge component with appropriate styling for different trade types
 */
function TradeTypeBadge({ tradeType }: { tradeType: string | null }) {
  if (!tradeType) {
    return <span className="text-xs text-gray-400">-</span>;
  }

  const getBadgeStyles = (type: string) => {
    switch (type.toUpperCase()) {
      case 'LONG_BUY':
        return 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700';
      case 'LONG_SELL':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-700';
      case 'SHORT_OPEN':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700';
      case 'SHORT_ADD':
        return 'bg-violet-100 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-700';
      case 'SHORT_COVER':
        return 'bg-pink-100 dark:bg-pink-900/20 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-700';
      case 'HOLD':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-600';
    }
  };

  const getDisplayText = (type: string) => {
    switch (type.toUpperCase()) {
      case 'LONG_BUY':
        return 'LONG BUY';
      case 'LONG_SELL':
        return 'LONG SELL';
      case 'SHORT_OPEN':
        return 'SHORT OPEN';
      case 'SHORT_ADD':
        return 'SHORT ADD';
      case 'SHORT_COVER':
        return 'SHORT COVER';
      default:
        return type.toUpperCase();
    }
  };

  return (
    <span 
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getBadgeStyles(tradeType)}`}
    >
      {getDisplayText(tradeType)}
    </span>
  );
}