"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { Loader2, X, FileText, Calendar, TrendingUp } from "lucide-react";
import { cn } from "~/lib/utils";
import { MAX_REPORTS_PER_CHAT } from "~/lib/constants";

// Use the constant from the OpenAI service
const MAX_SELECTED_REPORTS = MAX_REPORTS_PER_CHAT;

// Types based on the API responses
interface Report {
  sessionId: string;
  ticker: string;
  analysisDate: Date;
  name: string;
  recommendation: string;
}

interface SelectedReport extends Report {
  content: string;
}

interface ReportSelectorProps {
  onReportsSelected: (reports: SelectedReport[]) => void;
  selectedReports: SelectedReport[];
  className?: string;
}

export function ReportSelector({
  onReportsSelected,
  selectedReports,
  className,
}: ReportSelectorProps) {
  const [availableReports, setAvailableReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingContent, setLoadingContent] = useState<Set<string>>(new Set());

  // Fetch available reports on component mount
  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch("/api/chat/reports");
      
      if (!response.ok) {
        let errorMessage = "Failed to fetch reports";
        
        if (response.status === 401) {
          errorMessage = "Authentication required. Please log in again.";
        } else if (response.status === 403) {
          errorMessage = "Access denied. You don't have permission to view reports.";
        } else if (response.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Convert date strings to Date objects
      const reportsWithDates = data.reports.map((report: any) => ({
        ...report,
        analysisDate: new Date(report.analysisDate),
      }));
      
      setAvailableReports(reportsWithDates);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError(err instanceof Error ? err.message : "Failed to load reports");
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReportContent = async (sessionId: string): Promise<string> => {
    const response = await fetch(`/api/chat/reports/${sessionId}`);
    
    if (!response.ok) {
      let errorMessage = "Failed to fetch report content";
      
      if (response.status === 401) {
        errorMessage = "Authentication required. Please log in again.";
      } else if (response.status === 403) {
        errorMessage = "Access denied to this report.";
      } else if (response.status === 404) {
        errorMessage = "Report not found or no longer available.";
      } else if (response.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return data.content;
  };

  const handleReportToggle = async (report: Report, isSelected: boolean) => {
    if (isSelected) {
      // Check if we've reached the maximum limit
      if (selectedReports.length >= MAX_SELECTED_REPORTS) {
        import("sonner").then(({ toast }) => {
          toast.error(`Maximum ${MAX_SELECTED_REPORTS} reports allowed. Remove a report to add another.`);
        });
        return;
      }

      // Add report to selection
      try {
        setLoadingContent(prev => new Set(prev).add(report.sessionId));
        
        const content = await fetchReportContent(report.sessionId);
        const selectedReport: SelectedReport = { ...report, content };
        
        const newSelectedReports = [...selectedReports, selectedReport];
        onReportsSelected(newSelectedReports);
      } catch (err) {
        console.error("Error fetching report content:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load report content";
        setError(errorMessage);
        
        // Show toast notification for report content errors
        import("sonner").then(({ toast }) => {
          toast.error(`Failed to load ${report.ticker} report: ${errorMessage}`);
        });
      } finally {
        setLoadingContent(prev => {
          const newSet = new Set(prev);
          newSet.delete(report.sessionId);
          return newSet;
        });
      }
    } else {
      // Remove report from selection
      const newSelectedReports = selectedReports.filter(
        selected => selected.sessionId !== report.sessionId
      );
      onReportsSelected(newSelectedReports);
    }
  };

  const removeSelectedReport = (sessionId: string) => {
    const newSelectedReports = selectedReports.filter(
      selected => selected.sessionId !== sessionId
    );
    onReportsSelected(newSelectedReports);
  };

  const isReportSelected = (sessionId: string) => {
    return selectedReports.some(selected => selected.sessionId === sessionId);
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation.toLowerCase()) {
      case "buy":
      case "strong buy":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "sell":
      case "strong sell":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "hold":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Select Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin" />
            <span className="ml-2">Loading reports...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Select Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={fetchReports} variant="outline" size="sm">
                Try Again {retryCount > 0 && `(${retryCount})`}
              </Button>
              {retryCount > 2 && (
                <p className="text-xs text-muted-foreground">
                  If the problem persists, please refresh the page or contact support.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5" />
          Select Reports
          {selectedReports.length > 0 && (
            <Badge 
              variant={selectedReports.length >= MAX_SELECTED_REPORTS ? "destructive" : "secondary"}
            >
              {selectedReports.length}/{MAX_SELECTED_REPORTS} selected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4 min-h-0">
        {/* Selected Reports Section */}
        {selectedReports.length > 0 && (
          <div className="space-y-2 flex-shrink-0">
            <h4 className="text-sm font-medium text-muted-foreground">
              Selected Reports
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedReports.map((report) => (
                <Badge
                  key={report.sessionId}
                  variant="default"
                  className="flex items-center gap-1 pr-1"
                >
                  <span>{report.name}</span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="size-4 hover:bg-primary-foreground/20"
                    onClick={() => removeSelectedReport(report.sessionId)}
                  >
                    <X className="size-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Available Reports Section */}
        <div className="flex-1 flex flex-col space-y-2 min-h-0">
          <div className="flex items-center justify-between flex-shrink-0">
            <h4 className="text-sm font-medium text-muted-foreground">
              Available Reports
            </h4>
            {selectedReports.length >= MAX_SELECTED_REPORTS && (
              <p className="text-xs text-muted-foreground">
                Limit reached ({MAX_SELECTED_REPORTS} max)
              </p>
            )}
          </div>
          
          {availableReports.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
              <div>
                <FileText className="size-12 mx-auto mb-4 opacity-50" />
                <p>No reports available</p>
                <p className="text-sm">Generate some reports first to use them in chat</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {availableReports.map((report) => {
                const isSelected = isReportSelected(report.sessionId);
                const isLoadingThisReport = loadingContent.has(report.sessionId);
                const isLimitReached = selectedReports.length >= MAX_SELECTED_REPORTS;
                const isDisabled = isLoadingThisReport || (isLimitReached && !isSelected);
                
                return (
                  <div
                    key={report.sessionId}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                      isSelected
                        ? "bg-primary/5 border-primary/20"
                        : isDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={(checked) =>
                        handleReportToggle(report, checked as boolean)
                      }
                    />
                    
                    {isLoadingThisReport && (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">{report.ticker}</span>
                          <Badge
                            variant="outline"
                            className={cn("text-xs px-2 py-0.5", getRecommendationColor(report.recommendation))}
                          >
                            <TrendingUp className="size-2.5 mr-1" />
                            {report.recommendation}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                          <Calendar className="size-2.5" />
                          <span>
                            {report.analysisDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Helpful info about the limit */}
        {availableReports.length > 0 && (
          <div className="flex-shrink-0 pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Select up to {MAX_SELECTED_REPORTS} reports for optimal chat performance
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}