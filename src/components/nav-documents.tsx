"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDots,
  IconFolder,
  IconShare3,
  IconTrash,
  IconFileAnalytics,
  IconFileOff,
  IconAlertCircle,
  IconChevronDown,
  IconChevronRight,
  IconLoader2,
  IconRefresh,
  type Icon,
} from "@tabler/icons-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { Skeleton } from "~/components/ui/skeleton";
import type { SidebarReportItem } from "~/lib/database/agent-reports";

interface ReportItem {
  sessionId: string;
  ticker: string;
  analysisDate: Date;
  recommendation: string;
  status: "processing" | "done" | "failed";
  name: string;
  url: string;
  icon: Icon;
}

interface NavDocumentsProps {
  userId: string;
  maxItems?: number;
}

export function NavDocuments({ userId, maxItems = 10 }: NavDocumentsProps) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(maxItems);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [hasMoreReports, setHasMoreReports] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [newlyLoadedItems, setNewlyLoadedItems] = useState<Set<string>>(
    new Set(),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch reports on component mount and when userId changes
  useEffect(() => {
    const fetchReports = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        const isInitialLoad = reports.length === 0 && !isLoadingMore;
        if (isInitialLoad) {
          setIsLoading(true);
        }
        setError(null);

        // Fetch reports from API route
        const response = await fetch(
          `/api/reports/sidebar?limit=${currentLimit}`,
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch reports: ${response.status}`);
        }

        const data = await response.json();
        const sidebarReports: SidebarReportItem[] = data.reports || [];

        // Transform sidebar reports to component format
        const transformedReports: ReportItem[] = sidebarReports.map(
          (report) => ({
            sessionId: report.sessionId,
            ticker: report.ticker,
            analysisDate: report.analysisDate,
            recommendation: report.recommendation,
            status: report.status as ReportItem["status"],
            name: report.name,
            url: report.url,
            icon: IconFileAnalytics,
          }),
        );

        if (isLoadingMore) {
          // For load more, identify new items and animate them in
          const existingIds = new Set(reports.map((r) => r.sessionId));
          const newItems = transformedReports.filter(
            (r) => !existingIds.has(r.sessionId),
          );
          const newItemIds = new Set(newItems.map((r) => r.sessionId));

          setNewlyLoadedItems(newItemIds);
          setReports(transformedReports);

          // Remove animation class after animation completes
          setTimeout(() => {
            setNewlyLoadedItems(new Set());
          }, 600);
        } else {
          // Initial load or refresh
          setReports(transformedReports);
        }

        // Check if there are more reports available
        setHasMoreReports(sidebarReports.length === currentLimit);
      } catch (err) {
        console.error("Error fetching reports for sidebar:", err);
        setError("Failed to load reports");
        if (!isLoadingMore) {
          setReports([]); // Only clear on initial load failure
        }
      } finally {
        if (!isLoadingMore) {
          setIsLoading(false);
        } else {
          // Add a small delay for smoother transition
          setTimeout(() => {
            setIsLoadingMore(false);
            setLoadingProgress(0);
          }, 300);
        }
      }
    };

    fetchReports();
  }, [userId, currentLimit, isLoadingMore]);

  // Handle document click with smooth animation
  const handleDocumentClick = useCallback(async (clickedItem: ReportItem) => {
    // Add animation class
    setAnimatingItems((prev) => new Set(prev).add(clickedItem.sessionId));

    // Move clicked item to top
    setReports((prevReports) => {
      const otherReports = prevReports.filter(
        (report) => report.sessionId !== clickedItem.sessionId,
      );
      return [clickedItem, ...otherReports];
    });

    // Update server-side ordering
    try {
      await fetch("/api/reports/sidebar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: clickedItem.sessionId }),
      });
    } catch (error) {
      console.error("Failed to update report access:", error);
      // Revert update on error
      setReports((prevReports) => {
        const withoutClicked = prevReports.filter(
          (report) => report.sessionId !== clickedItem.sessionId,
        );
        // Find original position and insert back
        return [...withoutClicked, clickedItem];
      });
    }

    // Remove animation class after animation completes
    setTimeout(() => {
      setAnimatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(clickedItem.sessionId);
        return newSet;
      });
    }, 500); // Match CSS animation duration
  }, []);

  // Check if a document is currently selected
  const isDocumentSelected = useCallback(
    (item: ReportItem) => {
      if (!pathname) return false;
      // Remove leading slash from pathname for comparison
      const currentPath = pathname.startsWith("/")
        ? pathname.slice(1)
        : pathname;
      // Remove leading slash from item URL for comparison
      const itemPath = item.url.startsWith("/") ? item.url.slice(1) : item.url;
      return currentPath === itemPath;
    },
    [pathname],
  );

  // Toggle collapse state
  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const newCollapsed = !prev;
      // If expanding (was collapsed, now not collapsed), reset to initial limit
      if (prev && !newCollapsed) {
        setCurrentLimit(maxItems);
      }
      return newCollapsed;
    });
  }, [maxItems]);

  // Extract hash from session ID (last part after final underscore)
  const extractHash = useCallback((sessionId: string) => {
    const parts = sessionId.split("_");
    const hash = parts[parts.length - 1];
    return hash ? hash.substring(0, 7) : sessionId.substring(0, 7);
  }, []);



  // Load more reports
  const loadMoreReports = useCallback(async () => {
    if (isLoadingMore || !hasMoreReports) return;

    setIsLoadingMore(true);
    setLoadingProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 20;
      });
    }, 100);

    const newLimit = currentLimit + 10;
    setCurrentLimit(newLimit);

    // Complete progress when done (handled in useEffect)
    setTimeout(() => {
      clearInterval(progressInterval);
      setLoadingProgress(100);
    }, 1000);
  }, [isLoadingMore, hasMoreReports, currentLimit]);

  // Clear all reports from recent list
  const clearAllReports = useCallback(async () => {
    if (isClearing) return;

    setIsClearing(true);
    try {
      const response = await fetch("/api/reports/sidebar/clear", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to clear reports: ${response.status}`);
      }

      // Reset state after successful clear
      setReports([]);
      setCurrentLimit(maxItems);
      setHasMoreReports(false);
      setShowClearDialog(false);
    } catch (error) {
      console.error("Failed to clear reports:", error);
      setError("Failed to clear reports");
    } finally {
      setIsClearing(false);
    }
  }, [isClearing, maxItems]);

  // Refresh documents list
  const refreshDocuments = useCallback(async () => {
    if (isRefreshing || isLoading) return;

    console.log("Refreshing nav-documents...");
    setIsRefreshing(true);
    try {
      // Reset to initial state and refetch
      setCurrentLimit(maxItems);
      setNewlyLoadedItems(new Set());

      // Trigger a fresh fetch by updating the dependency
      const response = await fetch(`/api/reports/sidebar?limit=${maxItems}`);

      if (!response.ok) {
        throw new Error(`Failed to refresh reports: ${response.status}`);
      }

      const data = await response.json();
      const sidebarReports: SidebarReportItem[] = data.reports || [];

      const transformedReports: ReportItem[] = sidebarReports.map((report) => ({
        sessionId: report.sessionId,
        ticker: report.ticker,
        analysisDate: report.analysisDate,
        recommendation: report.recommendation,
        status: report.status as ReportItem["status"],
        name: report.name,
        url: report.url,
        icon: IconFileAnalytics,
      }));

      setReports(transformedReports);
      setHasMoreReports(sidebarReports.length === maxItems);
      setError(null);
    } catch (error) {
      console.error("Failed to refresh documents:", error);
      setError("Failed to refresh documents");
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, isLoading, maxItems]);

  // Listen for sidebar refresh events from other components
  useEffect(() => {
    const handleSidebarRefresh = (event: CustomEvent) => {
      console.log("Received sidebar refresh event:", event.detail);
      if (!isRefreshing && !isLoading) {
        setTimeout(() => {
          refreshDocuments();
        }, 200); // Slightly longer delay to ensure API call completes
      }
    };

    window.addEventListener('sidebarRefresh', handleSidebarRefresh as EventListener);
    
    return () => {
      window.removeEventListener('sidebarRefresh', handleSidebarRefresh as EventListener);
    };
  }, [isRefreshing, isLoading]); // Don't include refreshDocuments to avoid infinite loop

  // Loading skeleton
  const renderLoadingSkeleton = () => (
    <SidebarMenu>
      {Array.from({ length: 3 }).map((_, index) => (
        <SidebarMenuItem key={`skeleton-${index}`}>
          <SidebarMenuButton disabled>
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  // Empty state
  const renderEmptyState = () => (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton disabled className="text-sidebar-foreground/50">
          <IconFileOff className="text-sidebar-foreground/50" />
          <span className="text-xs font-light">No reports yet</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );

  // Error state
  const renderErrorState = () => (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton disabled className="text-sidebar-foreground/50">
          <IconAlertCircle className="text-sidebar-foreground/50" />
          <span className="text-xs font-light">Failed to load</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );

  // Reports list
  const renderReports = () => (
    <SidebarMenu className="space-y-1">
      {reports.map((item, index) => {
        const isSelected = isDocumentSelected(item);
        const isAnimating = animatingItems.has(item.sessionId);
        const isNewlyLoaded = newlyLoadedItems.has(item.sessionId);

        return (
          <SidebarMenuItem
            key={item.sessionId}
            className={`transform-gpu transition-all duration-500 ease-out ${isAnimating ? "z-10" : "z-0"} hover:scale-[1.02] hover:shadow-sm ${isSelected ? "bg-accent/20 border-primary border-l-2" : ""} ${isNewlyLoaded ? "animate-in slide-in-from-bottom-2 fade-in-0" : ""} `}
            style={{
              transform:
                isAnimating && index === 0
                  ? "translateY(-4px) scale(1.02)"
                  : "translateY(0) scale(1)",
              transition: isNewlyLoaded
                ? "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
                : "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow:
                isAnimating && index === 0
                  ? "0 4px 12px rgba(0, 0, 0, 0.1)"
                  : isSelected
                    ? "0 2px 8px rgba(0, 0, 0, 0.05)"
                    : "none",
              animationDelay: isNewlyLoaded
                ? `${(index - (reports.length - newlyLoadedItems.size)) * 100}ms`
                : "0ms",
            }}
          >
            <SidebarMenuButton asChild>
              <Link
                href={item.url}
                onClick={() => handleDocumentClick(item)}
                className={`hover:bg-accent/60 active:bg-accent/80 transition-all duration-300 ease-out hover:shadow-sm active:scale-95 ${isAnimating ? "bg-accent/40" : ""} ${isSelected ? "bg-accent/30 font-medium" : ""} `}
              >
                <item.icon
                  className={`transition-all duration-300 ease-out ${isAnimating ? "text-primary scale-110" : "scale-100"} ${isSelected ? "text-primary scale-105" : ""} hover:scale-105`}
                />
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span
                    className={`truncate text-xs font-light transition-all duration-300 ease-out ${isAnimating ? "text-primary font-normal" : ""} ${isSelected ? "text-primary font-medium" : ""} `}
                  >
                    {item.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="ml-auto h-auto shrink-0 px-1.5 py-0.5 text-xs font-light opacity-80 transition-all hover:opacity-100 hover:scale-105"
                  >
                    {extractHash(item.sessionId)}
                  </Badge>
                </div>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction
                  showOnHover
                  className={`data-[state=open]:bg-accent rounded-sm transition-all duration-200 hover:scale-105 ${isSelected ? "text-primary" : ""} `}
                >
                  <IconDots />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="animate-in slide-in-from-right-2 w-24 rounded-lg duration-200"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem className="hover:bg-accent/80 transition-colors duration-150">
                  <IconFolder />
                  <span>Open</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-accent/80 transition-colors duration-150">
                  <IconShare3 />
                  <span>Share</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="hover:bg-destructive/90 transition-colors duration-150"
                >
                  <IconTrash />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        );
      })}
      {reports.length > 0 && hasMoreReports && (
        <SidebarMenuItem className="transition-all duration-200 hover:scale-[1.02]">
          <div className="relative">
            <SidebarMenuButton
              onClick={loadMoreReports}
              disabled={isLoadingMore}
              className={`text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-accent/30 relative overflow-hidden transition-all duration-300 ease-out ${isLoadingMore ? "bg-accent/20 cursor-wait" : "hover:shadow-sm active:scale-95"} disabled:cursor-not-allowed disabled:opacity-70`}
            >
              {/* Progress bar background */}
              {isLoadingMore && (
                <div
                  className="from-primary/10 to-primary/20 absolute inset-0 bg-gradient-to-r transition-all duration-300 ease-out"
                  style={{
                    width: `${loadingProgress}%`,
                    transition: "width 0.3s ease-out",
                  }}
                />
              )}

              <div className="relative z-10 flex items-center gap-2">
                {isLoadingMore ? (
                  <div className="relative flex items-center gap-1">
                    <IconLoader2 className="text-primary h-4 w-4 animate-spin transition-all duration-300" />
                    <div className="flex gap-1">
                      <div
                        className="bg-primary h-1 w-1 animate-bounce rounded-full"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="bg-primary h-1 w-1 animate-bounce rounded-full"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="bg-primary h-1 w-1 animate-bounce rounded-full"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                ) : (
                  <IconDots className="text-sidebar-foreground/70 hover:text-primary transition-all duration-300 hover:scale-110" />
                )}
                <span
                  className={`text-xs font-normal transition-all duration-300 ${isLoadingMore ? "text-primary" : ""} `}
                >
                  {isLoadingMore
                    ? `Loading more... ${Math.round(loadingProgress)}%`
                    : "Load More"}
                </span>
              </div>
            </SidebarMenuButton>
          </div>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  );

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="group/label hover:bg-accent/20 -mx-2 -my-1 flex items-center justify-between rounded-sm px-2 py-1 transition-colors duration-200">
        <div
          className="flex flex-1 cursor-pointer items-center gap-2 select-none"
          onClick={toggleCollapse}
        >
          <span>Documents</span>
          {isCollapsed && reports.length > 0 && (
            <span className="bg-primary/20 text-primary rounded-full px-1.5 py-0.5 text-xs font-normal">
              {reports.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              refreshDocuments();
            }}
            disabled={isRefreshing || isLoading}
            className="hover:bg-accent hover:text-primary rounded-sm p-1 opacity-60 transition-all duration-200 group-hover/label:opacity-100 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Refresh documents"
          >
            <IconRefresh
              className={`h-3 w-3 transition-transform duration-200 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          {reports.length > 0 && (
            <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
              <DialogTrigger asChild>
                <button
                  className="hover:bg-accent hover:text-destructive rounded-sm p-1 opacity-60 transition-all duration-200 group-hover/label:opacity-100 hover:scale-110"
                  aria-label="Clear all documents"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconTrash className="h-3 w-3 transition-transform duration-200" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clear All Documents</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to clear all documents from your
                    recent list? This action cannot be undone and will remove
                    all {reports.length} documents.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowClearDialog(false)}
                    disabled={isClearing}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={clearAllReports}
                    disabled={isClearing}
                  >
                    {isClearing ? (
                      <>
                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      "Clear All"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <button
            onClick={toggleCollapse}
            className="hover:bg-accent rounded-sm p-1 opacity-60 transition-all duration-200 group-hover/label:opacity-100 hover:scale-110"
            aria-label={isCollapsed ? "Expand documents" : "Collapse documents"}
          >
            {isCollapsed ? (
              <IconChevronRight className="h-3 w-3 transition-transform duration-200" />
            ) : (
              <IconChevronDown className="h-3 w-3 transition-transform duration-200" />
            )}
          </button>
        </div>
      </SidebarGroupLabel>

      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isCollapsed
            ? "max-h-0 scale-y-95 transform opacity-0"
            : "max-h-[800px] scale-y-100 transform opacity-100"
        } `}
        style={{
          transformOrigin: "top",
          transition: isLoadingMore
            ? "max-height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-in-out, transform 0.3s ease-in-out"
            : "all 0.5s ease-in-out",
        }}
      >
        {isLoading && renderLoadingSkeleton()}
        {!isLoading && error && renderErrorState()}
        {!isLoading && !error && reports.length === 0 && renderEmptyState()}
        {!isLoading && !error && reports.length > 0 && renderReports()}
      </div>
    </SidebarGroup>
  );
}
