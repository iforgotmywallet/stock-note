"use client";

import * as React from "react";
import {
  IconChartBar,
  IconDashboard,
  IconMoodHappy,
  IconNews,
  IconCalculator,
  IconMessageCircle,
  IconAlertTriangle,
  IconTarget,
  IconRosetteDiscountCheckFilled,
} from "@tabler/icons-react";

import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Progress } from "~/components/ui/progress";
import { Spinner } from "~/components/ui/spinner";
import { MarkdownRenderer } from "~/components/markdown-renderer";
import { extractLocalTimeFromSessionId } from "~/lib/utils";

import type { StockData } from "~/types/stock-data";
import type { ProgressData } from "~/components/progress-popover";

type ReportStatus = "queued" | "processing" | "done" | "failed" | "NEC";

interface StockAnalysisDashboardProps {
  reportData?: StockData;
  sessionId?: string;
  className?: string;
  status?: ReportStatus;
  ticker?: string;
  reportId?: string;
  price?: string | null;
}

export function StockAnalysisDashboard({
  reportData,
  sessionId,
  className,
  status,
  ticker,
  reportId,
  price,
}: StockAnalysisDashboardProps) {
  // Status checks
  const isProcessing = status === "processing" || status === "queued";
  const isFailed = status === "failed" || status === "NEC";
  const isNEC = status === "NEC";
  const isQueued = status === "queued";
  const isFailed_Only = status === "failed";

  const [activeTab, setActiveTab] = React.useState("overview");
  const [stockData, setStockData] = React.useState<StockData | null>(null);
  const [debateView, setDebateView] = React.useState<"bull" | "bear" | "judge">(
    "bull",
  );
  const [riskView, setRiskView] = React.useState<
    "risky" | "safe" | "neutral" | "judge"
  >("risky");
  const [progressData, setProgressData] = React.useState<ProgressData | null>(
    null,
  );
  const [isLoadingProgress, setIsLoadingProgress] = React.useState(false);

  // Load stock analysis data
  React.useEffect(() => {
    if (reportData) {
      setStockData(reportData);
    }
    // Removed fallback demo data loading - just display failed state when no data
  }, [reportData]);

  // Refresh to view complete report
  const handleRefreshReport = React.useCallback(() => {
    window.location.reload();
  }, []);

  // Fetch progress data when processing
  React.useEffect(() => {
    if (isProcessing && reportId && status === "processing") {
      const fetchProgress = async () => {
        setIsLoadingProgress(true);
        try {
          const response = await fetch(`/api/reports/${reportId}/progress`);
          if (response.ok) {
            const apiResponse = await response.json();
            const data = apiResponse.data || apiResponse;
            if (data?.percentage !== undefined) {
              setProgressData(data);
            }
          }
        } catch (error) {
          console.error("Failed to fetch progress:", error);
        } finally {
          setIsLoadingProgress(false);
        }
      };

      fetchProgress();

      // Set up polling for progress updates every 10 seconds
      const interval = setInterval(() => {
        void fetchProgress();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [isProcessing, reportId, status]);

  // Use price from database
  const currentPrice = price ?? "N/A";

  const tabs = [
    { id: "overview", label: "Overview", icon: IconDashboard },
    { id: "market", label: "Market", icon: IconChartBar },
    { id: "sentiment", label: "Sentiment", icon: IconMoodHappy },
    { id: "news", label: "News", icon: IconNews },
    { id: "fundamentals", label: "Fundamentals", icon: IconCalculator },
    { id: "debate", label: "Debate", icon: IconMessageCircle },
    { id: "risk", label: "Risk", icon: IconAlertTriangle },
    { id: "plan", label: "Plan", icon: IconTarget },
  ];

  // Show skeleton when processing/queued
  if (isProcessing) {
    return (
      <div className={`bg-background min-h-screen ${className}`}>
        <div className="container mx-auto max-w-7xl">
          {/* Header Skeleton */}
          <div className="mb-8 flex flex-col items-start justify-between sm:flex-row sm:items-center sm:px-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-5 w-5 rounded-full" />
                {sessionId && <Skeleton className="h-6 w-16" />}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">At</span>
                <Skeleton className="h-6 w-32" />
                <span className="text-muted-foreground">, the price is</span>
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
            <Skeleton className="h-8 w-20" />
          </div>

          {/* Tab Navigation Skeleton */}
          <div className="w-full px-4 pb-4 sm:px-6">
            <div className="mb-6 grid h-auto w-full grid-cols-4 gap-2 lg:grid-cols-8">
              {tabs.map((tab) => (
                <Skeleton key={tab.id} className="h-12 w-full" />
              ))}
            </div>

            {/* Tab Content Skeleton */}
            <div className="mt-6 px-4 sm:px-6">
              <div className="space-y-4 sm:space-y-6">
                <div className="mb-6">
                  <Skeleton className="mb-2 h-7 w-48" />
                  <Skeleton className="h-5 w-96" />
                </div>

                {/* Card Skeleton */}
                <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
                  <div className="flex flex-col space-y-1.5 p-6">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <div className="p-6 pt-0">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="mt-4 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar for Processing State */}
            {status === "processing" && (
              <div className="mt-8 px-4 sm:px-6">
                <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="leading-none font-medium">
                          Analysis Progress
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          Progress for {ticker || "this stock"}
                        </p>
                      </div>
                      {isLoadingProgress && <Spinner className="size-4" />}
                    </div>

                    {progressData?.percentage !== undefined &&
                    progressData.populatedColumns &&
                    progressData.totalColumns !== undefined ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {Math.round(progressData.percentage)}%
                            {progressData.percentage >= 100 && (
                              <span className="ml-2 text-xs text-green-600">
                                - Analysis Complete!
                              </span>
                            )}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {progressData.populatedColumns.length} of{" "}
                            {progressData.totalColumns} steps complete
                          </span>
                        </div>
                        <Progress
                          value={progressData.percentage}
                          className="h-2"
                        />
                        <div className="flex items-center justify-between">
                          <div className="text-muted-foreground text-xs">
                            Last updated:{" "}
                            {new Date(
                              progressData.lastUpdated,
                            ).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                          {progressData.percentage >= 100 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleRefreshReport}
                              className="h-7 px-3 text-xs"
                            >
                              View Report
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : isLoadingProgress ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="flex flex-col items-center gap-2">
                          <Spinner className="size-5" />
                          <span className="text-muted-foreground text-sm">
                            Loading progress...
                          </span>
                        </div>
                      </div>
                    ) : progressData ? (
                      <div className="space-y-2">
                        <div className="text-muted-foreground text-sm">
                          Progress data is being calculated...
                        </div>
                        {progressData.percentage !== undefined && (
                          <Progress
                            value={progressData.percentage}
                            className="h-2"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">
                        Progress information will be available shortly...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show failed state
  if (isFailed) {
    return (
      <div className={`bg-background min-h-screen ${className}`}>
        <div className="container mx-auto max-w-7xl">
          {/* Header Section for Failed State */}
          <div className="mb-8 flex flex-col items-start justify-between sm:flex-row sm:items-center sm:px-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {ticker ?? "UNKNOWN"}
                </h1>
                <IconRosetteDiscountCheckFilled
                  className="h-5 w-5 text-gray-400 drop-shadow-sm"
                  title="Report Status"
                />
                {sessionId && (
                  <Badge variant="secondary" className="font-mono">
                    #
                    {sessionId.split("_").pop()?.slice(-8) ??
                      sessionId.slice(-8)}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                Analysis could not be completed
              </p>
            </div>
            <Button
              size="sm"
              className="bg-red-600 text-white hover:bg-red-700 hover:opacity-90"
            >
              {isNEC ? "Not Enough Credit" : "Failed"}
            </Button>
          </div>

          {/* Empty State Content */}
          <div className="flex min-h-[60vh] items-center justify-center px-4 sm:px-6">
            <div className="space-y-4 text-center">
              <IconAlertTriangle className="text-muted-foreground mx-auto h-16 w-16" />
              <h2 className="text-2xl font-semibold">Analysis Unavailable</h2>
              <p className="text-muted-foreground max-w-md">
                {isNEC
                  ? "This analysis could not be completed due to insufficient credit."
                  : "The analysis failed to complete. Please try generating a new report."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading when no data
  if (!stockData) {
    return (
      <div className={`bg-background min-h-screen ${className}`}>
        <div className="container mx-auto max-w-7xl">
          <div className="flex min-h-screen items-center justify-center">
            <div className="space-y-4 text-center">
              <div className="border-primary mx-auto h-12 w-12 animate-spin rounded-full border-b-2"></div>
              <h2 className="text-xl font-semibold">Loading Analysis...</h2>
              <p className="text-muted-foreground">
                {sessionId
                  ? `Loading report data for session ${sessionId}`
                  : "Loading stock analysis data"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-background min-h-screen ${className}`}>
      <div className="container mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="mb-8 flex flex-col items-start justify-between sm:flex-row sm:items-center sm:px-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {stockData?.ticker ?? "LOADING"}
              </h1>
              <IconRosetteDiscountCheckFilled
                className="h-5 w-5 text-blue-600 drop-shadow-sm"
                title="Verified Report"
              />
              {sessionId && (
                <Badge variant="secondary" className="font-mono">
                  #
                  {sessionId.split("_").pop()?.slice(-8) ?? sessionId.slice(-8)}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              At{" "}
              <span className="text-foreground bg-accent rounded-md px-1.5 py-0.5 font-mono">
                {(() => {
                  if (sessionId) {
                    const localTime = extractLocalTimeFromSessionId(sessionId);
                    if (localTime) {
                      return localTime.toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    }
                  }
                  return stockData?.date ?? "Loading...";
                })()}
              </span>
              , the price is{" "}
              <span className="rounded-md bg-green-50 px-1.5 py-0.5 font-mono text-green-800 dark:bg-green-900/20 dark:text-green-400">
                ${currentPrice}
              </span>
            </p>
          </div>
          <Button
            size="sm"
            className={`text-white hover:opacity-90 ${
              // Show status for failed states, otherwise show recommendation
              isFailed
                ? "bg-red-600 hover:bg-red-700"
                : isProcessing
                  ? "bg-blue-600 hover:bg-blue-700"
                  : stockData?.analysis?.recommendation_type === "BUY"
                    ? "bg-green-600 hover:bg-green-700"
                    : stockData?.analysis?.recommendation_type === "SELL"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-yellow-600 hover:bg-yellow-700"
            }`}
          >
            {isFailed_Only
              ? "FAILED"
              : isNEC
                ? "NEC"
                : isQueued
                  ? "QUEUED"
                  : isProcessing
                    ? "PROCESSING"
                    : stockData?.analysis?.recommendation_type || "LOADING"}
          </Button>
        </div>

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full px-4 pb-4 sm:px-6"
        >
          <TabsList className="grid h-auto w-full grid-cols-4 lg:grid-cols-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="text-foreground data-[state=active]:text-foreground flex items-center gap-1.5 p-2 sm:p-3"
                >
                  <IconComponent className="size-4" />
                  <span className="hidden text-xs sm:inline sm:text-sm">
                    {tab.label}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="overview" className="mt-6 px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  Investment Overview
                </h2>
                <p className="text-muted-foreground">
                  Comprehensive analysis summary and key recommendations
                </p>
              </div>

              {/* Current Recommendation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Final Recommendation
                    <span
                      className={`rounded px-2 py-1 text-sm font-medium ${
                        isFailed
                          ? "bg-red-100 text-red-800"
                          : isProcessing
                            ? "bg-blue-100 text-blue-800"
                            : stockData?.analysis?.recommendation_type === "BUY"
                              ? "bg-green-100 text-green-800"
                              : stockData?.analysis?.recommendation_type ===
                                  "SELL"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {isFailed_Only
                        ? "FAILED"
                        : isNEC
                          ? "NEC"
                          : isQueued
                            ? "QUEUED"
                            : isProcessing
                              ? "PROCESSING"
                              : (stockData?.analysis?.recommendation_type ??
                                "LOADING")}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Based on comprehensive technical, fundamental, and sentiment
                    analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm">
                      {isFailed ? (
                        <>
                          Analysis for{" "}
                          {stockData?.ticker ?? ticker ?? "this stock"} could
                          not be completed.{" "}
                          {isNEC
                            ? "Insufficient data or market conditions prevented analysis completion."
                            : "The analysis process encountered an error and failed to complete."}
                        </>
                      ) : isProcessing ? (
                        <>
                          Analysis for{" "}
                          {stockData?.ticker ?? ticker ?? "this stock"} is
                          currently{" "}
                          <strong>{isQueued ? "QUEUED" : "IN PROGRESS"}</strong>
                          .{" "}
                          {isQueued
                            ? "The analysis has been queued and will begin processing shortly."
                            : "The system is performing comprehensive multi-factor analysis including technical indicators, fundamental metrics, and market sentiment evaluation."}
                        </>
                      ) : (
                        <>
                          Current analysis indicates a{" "}
                          <strong>
                            {stockData?.analysis?.recommendation_type ??
                              "LOADING"}
                          </strong>{" "}
                          recommendation for {stockData?.ticker ?? "this stock"}
                          based on comprehensive multi-factor analysis including
                          technical indicators, fundamental metrics, and market
                          sentiment evaluation.
                        </>
                      )}
                    </p>
                    {/* Display final recommendation from data */}
                    {isFailed ? (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                        <p className="text-sm text-red-800 dark:text-red-400">
                          {isNEC
                            ? "Analysis could not be completed due to insufficient market data or adverse conditions."
                            : "The analysis process failed to complete successfully. Please try generating a new report."}
                        </p>
                      </div>
                    ) : isProcessing ? (
                      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
                          <p className="text-sm text-blue-800 dark:text-blue-400">
                            {isQueued
                              ? "Analysis has been queued and will begin processing shortly."
                              : "Analysis is currently in progress. This may take several minutes to complete."}
                          </p>
                        </div>
                      </div>
                    ) : stockData?.analysis?.final_recommendation ? (
                      <div className="mt-4">
                        <MarkdownRenderer
                          content={stockData.analysis.final_recommendation}
                        />
                      </div>
                    ) : (
                      <div className="bg-muted mt-4 rounded-lg p-4">
                        <p className="text-muted-foreground text-sm">
                          Final recommendation analysis is not available for
                          this report.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="market" className="mt-6 px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  Market Analysis
                </h2>
                <p className="text-muted-foreground">
                  Technical indicators and market trends
                </p>
              </div>

              {/* Technical Analysis Report */}
              {stockData?.analysis?.market_report ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Technical Analysis Report</CardTitle>
                    <CardDescription>
                      Comprehensive analysis of {stockData.ticker}&apos;s
                      current technical position
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MarkdownRenderer
                      content={stockData.analysis.market_report}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Technical Analysis Report</CardTitle>
                    <CardDescription>
                      Market analysis data is not available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-muted-foreground text-sm">
                        Technical analysis data is not available for this
                        report. This may be because the analysis is still in
                        progress or the data could not be retrieved.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sentiment" className="mt-6 px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  Market Sentiment
                </h2>
                <p className="text-muted-foreground">
                  Investor sentiment and market psychology indicators
                </p>
              </div>

              {/* Sentiment Analysis Report */}
              {stockData?.analysis?.sentiment_report ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Sentiment Analysis Report</CardTitle>
                    <CardDescription>
                      Comprehensive analysis of market sentiment and social
                      indicators
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MarkdownRenderer
                      content={stockData.analysis.sentiment_report}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Sentiment Analysis Report</CardTitle>
                    <CardDescription>
                      Sentiment analysis data is not available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-muted-foreground text-sm">
                        Sentiment analysis data is not available for this
                        report. This may be because the analysis is still in
                        progress or the data could not be retrieved.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="news" className="mt-6 px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  Latest News
                </h2>
                <p className="text-muted-foreground">
                  Recent news and updates affecting{" "}
                  {stockData?.ticker ?? "this stock"}
                </p>
              </div>

              {/* News Analysis Report */}
              {stockData?.analysis?.news_report ? (
                <Card>
                  <CardHeader>
                    <CardTitle>News Analysis Report</CardTitle>
                    <CardDescription>
                      Current market news and macroeconomic factors affecting{" "}
                      {stockData.ticker}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MarkdownRenderer
                      content={stockData.analysis.news_report}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>News Analysis Report</CardTitle>
                    <CardDescription>
                      News analysis data is not available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-muted-foreground text-sm">
                        News analysis data is not available for this report.
                        This may be because the analysis is still in progress or
                        the data could not be retrieved.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="fundamentals" className="mt-6 px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  Financial Fundamentals
                </h2>
                <p className="text-muted-foreground">
                  Key financial metrics and ratios
                </p>
              </div>

              {/* Fundamentals Analysis Report */}
              {stockData?.analysis?.fundamentals_report ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Fundamentals Analysis Report</CardTitle>
                    <CardDescription>
                      Financial metrics, insider transactions, and fundamental
                      analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MarkdownRenderer
                      content={stockData.analysis.fundamentals_report}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Fundamentals Analysis Report</CardTitle>
                    <CardDescription>
                      Fundamentals analysis data is not available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-muted-foreground text-sm">
                        Fundamentals analysis data is not available for this
                        report. This may be because the analysis is still in
                        progress or the data could not be retrieved.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="debate" className="mt-6 px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      Investment Debate
                    </h2>
                    <p className="text-muted-foreground">
                      Bull vs Bear analysis and expert judgment
                    </p>
                  </div>
                  <Tabs
                    value={debateView}
                    onValueChange={(value) =>
                      setDebateView(value as "bull" | "bear" | "judge")
                    }
                  >
                    <TabsList className="grid h-auto w-fit grid-cols-3">
                      <TabsTrigger
                        value="bull"
                        className="text-foreground data-[state=active]:text-foreground flex items-center gap-1.5 px-3 py-2 text-sm"
                      >
                        🐂 Bull
                      </TabsTrigger>
                      <TabsTrigger
                        value="bear"
                        className="text-foreground data-[state=active]:text-foreground flex items-center gap-1.5 px-3 py-2 text-sm"
                      >
                        🐻 Bear
                      </TabsTrigger>
                      <TabsTrigger
                        value="judge"
                        className="text-foreground data-[state=active]:text-foreground flex items-center gap-1.5 px-3 py-2 text-sm"
                      >
                        ⚖️ Judge
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {/* Investment Debate */}
              {stockData?.analysis?.investment_debate ? (
                <div className="space-y-6">
                  {/* Investment Debate Analysis - Show based on selected view */}
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {debateView === "bull" && "🐂 Bull Analysis"}
                        {debateView === "bear" && "🐻 Bear Analysis"}
                        {debateView === "judge" && "⚖️ Judge Decision"}
                      </CardTitle>
                      <CardDescription>
                        {debateView === "bull" &&
                          "Optimistic perspective on the investment opportunity"}
                        {debateView === "bear" &&
                          "Conservative perspective highlighting potential risks"}
                        {debateView === "judge" &&
                          "Expert analysis weighing both perspectives"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {debateView === "bull" &&
                        (stockData.analysis.investment_debate.bull_analysis ? (
                          <MarkdownRenderer
                            content={
                              stockData.analysis.investment_debate.bull_analysis
                            }
                          />
                        ) : (
                          <div className="bg-muted rounded-lg p-4">
                            <p className="text-muted-foreground text-sm">
                              Bull analysis is not available for this report.
                            </p>
                          </div>
                        ))}
                      {debateView === "bear" &&
                        (stockData.analysis.investment_debate.bear_analysis ? (
                          <MarkdownRenderer
                            content={
                              stockData.analysis.investment_debate.bear_analysis
                            }
                          />
                        ) : (
                          <div className="bg-muted rounded-lg p-4">
                            <p className="text-muted-foreground text-sm">
                              Bear analysis is not available for this report.
                            </p>
                          </div>
                        ))}
                      {debateView === "judge" &&
                        (stockData.analysis.investment_debate.judge_decision ? (
                          <MarkdownRenderer
                            content={
                              stockData.analysis.investment_debate
                                .judge_decision
                            }
                          />
                        ) : (
                          <div className="bg-muted rounded-lg p-4">
                            <p className="text-muted-foreground text-sm">
                              Judge decision is not available for this report.
                            </p>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Investment Debate</CardTitle>
                    <CardDescription>
                      Investment debate data is not available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-muted-foreground text-sm">
                        Investment debate analysis is not available for this
                        report. This may be because the analysis is still in
                        progress or the data could not be retrieved.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="risk" className="mt-6 px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      Risk Assessment
                    </h2>
                    <p className="text-muted-foreground">
                      Multi-perspective risk analysis and recommendations
                    </p>
                  </div>
                  <Tabs
                    value={riskView}
                    onValueChange={(value) =>
                      setRiskView(
                        value as "risky" | "safe" | "neutral" | "judge",
                      )
                    }
                  >
                    <TabsList className="grid h-auto w-fit grid-cols-4">
                      <TabsTrigger
                        value="risky"
                        className="text-foreground data-[state=active]:text-foreground flex items-center gap-1.5 px-3 py-2 text-sm"
                      >
                        🔥 High Risk
                      </TabsTrigger>
                      <TabsTrigger
                        value="safe"
                        className="text-foreground data-[state=active]:text-foreground flex items-center gap-1.5 px-3 py-2 text-sm"
                      >
                        🛡️ Conservative
                      </TabsTrigger>
                      <TabsTrigger
                        value="neutral"
                        className="text-foreground data-[state=active]:text-foreground flex items-center gap-1.5 px-3 py-2 text-sm"
                      >
                        ⚖️ Balanced
                      </TabsTrigger>
                      <TabsTrigger
                        value="judge"
                        className="text-foreground data-[state=active]:text-foreground flex items-center gap-1.5 px-3 py-2 text-sm"
                      >
                        📊 Decision
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {/* Risk Assessment */}
              {stockData?.analysis?.risk_assessment ? (
                <div className="space-y-6">
                  {/* Risk Analysis - Show based on selected view */}
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {riskView === "risky" && "🔥 High-Risk Analysis"}
                        {riskView === "safe" && "🛡️ Conservative Analysis"}
                        {riskView === "neutral" && "⚖️ Balanced Analysis"}
                        {riskView === "judge" && "📊 Risk Assessment Decision"}
                      </CardTitle>
                      <CardDescription>
                        {riskView === "risky" &&
                          "Aggressive investment perspective focusing on high-reward opportunities"}
                        {riskView === "safe" &&
                          "Risk-averse perspective emphasizing capital preservation"}
                        {riskView === "neutral" &&
                          "Moderate approach balancing risk and reward"}
                        {riskView === "judge" &&
                          "Final risk evaluation and recommendation"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {riskView === "risky" &&
                        (stockData.analysis.risk_assessment.risky_analysis ? (
                          <MarkdownRenderer
                            content={
                              stockData.analysis.risk_assessment.risky_analysis
                            }
                          />
                        ) : (
                          <div className="bg-muted rounded-lg p-4">
                            <p className="text-muted-foreground text-sm">
                              High-risk analysis is not available for this
                              report.
                            </p>
                          </div>
                        ))}
                      {riskView === "safe" &&
                        (stockData.analysis.risk_assessment.safe_analysis ? (
                          <MarkdownRenderer
                            content={
                              stockData.analysis.risk_assessment.safe_analysis
                            }
                          />
                        ) : (
                          <div className="bg-muted rounded-lg p-4">
                            <p className="text-muted-foreground text-sm">
                              Conservative analysis is not available for this
                              report.
                            </p>
                          </div>
                        ))}
                      {riskView === "neutral" &&
                        (stockData.analysis.risk_assessment.neutral_analysis ? (
                          <MarkdownRenderer
                            content={
                              stockData.analysis.risk_assessment
                                .neutral_analysis
                            }
                          />
                        ) : (
                          <div className="bg-muted rounded-lg p-4">
                            <p className="text-muted-foreground text-sm">
                              Balanced analysis is not available for this
                              report.
                            </p>
                          </div>
                        ))}
                      {riskView === "judge" &&
                        (stockData.analysis.risk_assessment.judge_decision ? (
                          <MarkdownRenderer
                            content={
                              stockData.analysis.risk_assessment.judge_decision
                            }
                          />
                        ) : (
                          <div className="bg-muted rounded-lg p-4">
                            <p className="text-muted-foreground text-sm">
                              Risk assessment decision is not available for this
                              report.
                            </p>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Assessment</CardTitle>
                    <CardDescription>
                      Risk assessment data is not available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-muted-foreground text-sm">
                        Risk assessment analysis is not available for this
                        report. This may be because the analysis is still in
                        progress or the data could not be retrieved.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="plan" className="mt-6 px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  Trading Plan
                </h2>
                <p className="text-muted-foreground">
                  Strategic trading plan and final recommendations
                </p>
              </div>

              {/* Trading Plan */}
              {stockData?.analysis?.trader_plan ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Trading Plan & Strategy</CardTitle>
                    <CardDescription>
                      Comprehensive trading strategy and execution plan
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MarkdownRenderer
                      content={stockData.analysis.trader_plan}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Trading Plan & Strategy</CardTitle>
                    <CardDescription>
                      Trading plan data is not available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-muted-foreground text-sm">
                        Trading plan analysis is not available for this report.
                        This may be because the analysis is still in progress or
                        the data could not be retrieved.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
