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
import { MarkdownRenderer } from "~/components/markdown-renderer";
import { extractLocalTimeFromSessionId } from "~/lib/utils";
import type { StockData } from "~/types/stock-data";

interface StockAnalysisDashboardProps {
  reportData?: StockData;
  sessionId?: string;
  className?: string;
}

export function StockAnalysisDashboard({
  reportData,
  sessionId,
  className,
}: StockAnalysisDashboardProps) {
  const [activeTab, setActiveTab] = React.useState("overview");
  const [stockData, setStockData] = React.useState<StockData | null>(null);
  const [debateView, setDebateView] = React.useState<"bull" | "bear" | "judge">(
    "bull",
  );
  const [riskView, setRiskView] = React.useState<
    "risky" | "safe" | "neutral" | "judge"
  >("risky");

  // Load stock analysis data
  React.useEffect(() => {
    if (reportData) {
      // Use provided report data
      setStockData(reportData);
    } else {
      // Fall back to static JSON for backward compatibility
      const loadStockData = async () => {
        try {
          const response = await fetch("/pypl-dashboard-data.json");
          const data = (await response.json()) as { data: StockData };
          setStockData(data.data);
        } catch (error) {
          console.error("Failed to load stock analysis data:", error);
        }
      };
      void loadStockData();
    }
  }, [reportData]);

  // Extract data from the loaded stock data
  const extractedData = React.useMemo(() => {
    if (!stockData) return null;

    // Extract price info from market report
    const priceRegex =
      /\*\*(?:Current Price|Current Close)(?:\s*\([^)]+\))?\*\*:\s*\$(\d+\.\d+)/;
    const priceMatch = priceRegex.exec(stockData.analysis.market_report);

    return {
      currentPrice: priceMatch ? `${priceMatch[1]}` : "N/A",
    };
  }, [stockData]);

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

  // Show loading state when no data is available
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
                ${extractedData?.currentPrice ?? "Loading..."}
              </span>
            </p>
          </div>
          <Button
            size="sm"
            className={`text-white hover:opacity-90 ${
              stockData?.analysis?.recommendation_type === "BUY"
                ? "bg-green-600 hover:bg-green-700"
                : stockData?.analysis?.recommendation_type === "SELL"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-yellow-600 hover:bg-yellow-700"
            }`}
          >
            {stockData?.analysis?.recommendation_type || "LOADING"}
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
                        stockData?.analysis?.recommendation_type === "BUY"
                          ? "bg-green-100 text-green-800"
                          : stockData?.analysis?.recommendation_type === "SELL"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {stockData?.analysis?.recommendation_type ?? "LOADING"}
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
                      Current analysis indicates a{" "}
                      <strong>
                        {stockData?.analysis?.recommendation_type ?? "LOADING"}
                      </strong>{" "}
                      recommendation for {stockData?.ticker ?? "this stock"}
                      based on comprehensive multi-factor analysis including
                      technical indicators, fundamental metrics, and market
                      sentiment evaluation.
                    </p>
                    {/* Display final recommendation from data */}
                    {stockData?.analysis?.final_recommendation ? (
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
