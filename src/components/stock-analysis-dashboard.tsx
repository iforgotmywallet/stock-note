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
} from "@tabler/icons-react";

import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";
import { MarkdownRenderer } from "~/components/markdown-renderer";
import type { StockData } from "~/types/stock-data";

interface StockAnalysisDashboardProps {
  className?: string;
}

export function StockAnalysisDashboard({ className }: StockAnalysisDashboardProps) {
  const [activeTab, setActiveTab] = React.useState("overview");
  const [stockData, setStockData] = React.useState<StockData | null>(null);

  // Load stock analysis data
  React.useEffect(() => {
    const loadStockData = async () => {
      try {
        const response = await fetch('/pypl-dashboard-data.json');
        const data = await response.json() as { data: StockData };
        setStockData(data.data);
      } catch (error) {
        console.error('Failed to load stock analysis data:', error);
      }
    };
    void loadStockData();
  }, []);

  // Extract data from the loaded stock data
  const extractedData = React.useMemo(() => {
    if (!stockData) return null;
    
    // Extract price info from sentiment report
    const priceRegex = /stock price for PayPal is \$(\d+\.\d+)/;
    const changeRegex = /change of \$(\d+\.\d+) \(([^)]+)\)/;
    const priceMatch = priceRegex.exec(stockData.analysis.sentiment_report);
    const changeMatch = changeRegex.exec(stockData.analysis.sentiment_report);
    
    return {
      currentPrice: priceMatch ? `$${priceMatch[1]}` : 'N/A',
      priceChange: changeMatch ? `$${changeMatch[1]} (${changeMatch[2]})` : 'N/A',
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

  return (
    <div className={`bg-background min-h-screen ${className}`}>
      <div className="container mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="mb-4 flex flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight">{stockData?.ticker ?? 'LOADING'}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-lg font-semibold">{extractedData?.currentPrice ?? 'Loading...'}</span>
              <span className="text-sm text-green-600">{extractedData?.priceChange ?? 'Loading...'}</span>
              <span className="text-muted-foreground">{stockData?.date ?? 'Loading...'}</span>
            </div>
          </div>
          <Button
            size="sm"
            className={`text-white hover:opacity-90 ${
              stockData?.analysis?.recommendation_type === 'BUY' 
                ? 'bg-green-600 hover:bg-green-700' 
                : stockData?.analysis?.recommendation_type === 'SELL'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-yellow-600 hover:bg-yellow-700'
            }`}
          >
            {stockData?.analysis?.recommendation_type || 'LOADING'}
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
                  className="flex items-center gap-1.5 p-2 sm:p-3"
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
                    <span className={`px-2 py-1 text-sm font-medium rounded ${
                      stockData?.analysis?.recommendation_type === 'BUY' 
                        ? 'bg-green-100 text-green-800' 
                        : stockData?.analysis?.recommendation_type === 'SELL'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {stockData?.analysis?.recommendation_type ?? 'LOADING'}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Based on comprehensive technical, fundamental, and sentiment analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm">
                      Current analysis indicates a <strong>{stockData?.analysis?.recommendation_type ?? 'LOADING'}</strong> recommendation for {stockData?.ticker ?? 'this stock'} 
                      based on comprehensive multi-factor analysis including technical indicators, fundamental metrics, 
                      and market sentiment evaluation.
                    </p>
                    {/* Display final recommendation from data */}
                    {stockData?.analysis?.final_recommendation && (
                      <div className="mt-4">
                        <MarkdownRenderer content={stockData.analysis.final_recommendation} />
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
              {stockData?.analysis?.market_report && (
                <Card>
                  <CardHeader>
                    <CardTitle>Technical Analysis Report</CardTitle>
                    <CardDescription>
                      Comprehensive analysis of {stockData.ticker}&apos;s current technical position
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MarkdownRenderer content={stockData.analysis.market_report} />
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
              {stockData?.analysis?.sentiment_report && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sentiment Analysis Report</CardTitle>
                    <CardDescription>
                      Comprehensive analysis of market sentiment and social indicators
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MarkdownRenderer content={stockData.analysis.sentiment_report} />
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
                  Recent news and updates affecting PYPL
                </p>
              </div>

              {/* News Analysis Report */}
              {stockData?.analysis?.news_report && (
                <Card>
                  <CardHeader>
                    <CardTitle>News Analysis Report</CardTitle>
                    <CardDescription>
                      Current market news and macroeconomic factors affecting {stockData.ticker}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MarkdownRenderer content={stockData.analysis.news_report} />
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
              {stockData?.analysis?.fundamentals_report && (
                <Card>
                  <CardHeader>
                    <CardTitle>Fundamentals Analysis Report</CardTitle>
                    <CardDescription>
                      Financial metrics, insider transactions, and fundamental analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MarkdownRenderer content={stockData.analysis.fundamentals_report} />
                  </CardContent>
                </Card>
              )}


            </div>
          </TabsContent>

          <TabsContent value="debate" className="mt-6 px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  Investment Debate
                </h2>
                <p className="text-muted-foreground">
                  Bull vs Bear analysis and expert judgment
                </p>
              </div>

              {/* Investment Debate */}
              {stockData?.analysis?.investment_debate && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Bull Analysis</CardTitle>
                      <CardDescription>
                        Optimistic perspective on the investment opportunity
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MarkdownRenderer content={stockData.analysis.investment_debate.bull_analysis} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Bear Analysis</CardTitle>
                      <CardDescription>
                        Conservative perspective highlighting potential risks
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MarkdownRenderer content={stockData.analysis.investment_debate.bear_analysis} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Judge Decision</CardTitle>
                      <CardDescription>
                        Expert analysis weighing both perspectives
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MarkdownRenderer content={stockData.analysis.investment_debate.judge_decision} />
                    </CardContent>
                  </Card>
                </div>
              )}


            </div>
          </TabsContent>

          <TabsContent value="risk" className="mt-6 px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  Risk Assessment
                </h2>
                <p className="text-muted-foreground">
                  Multi-perspective risk analysis and recommendations
                </p>
              </div>

              {/* Risk Assessment */}
              {stockData?.analysis?.risk_assessment && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>High-Risk Analysis</CardTitle>
                      <CardDescription>
                        Aggressive investment perspective focusing on high-reward opportunities
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MarkdownRenderer content={stockData.analysis.risk_assessment.risky_analysis} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Conservative Analysis</CardTitle>
                      <CardDescription>
                        Risk-averse perspective emphasizing capital preservation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MarkdownRenderer content={stockData.analysis.risk_assessment.safe_analysis} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Balanced Analysis</CardTitle>
                      <CardDescription>
                        Moderate approach balancing risk and reward
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MarkdownRenderer content={stockData.analysis.risk_assessment.neutral_analysis} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Assessment Decision</CardTitle>
                      <CardDescription>
                        Final risk evaluation and recommendation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MarkdownRenderer content={stockData.analysis.risk_assessment.judge_decision} />
                    </CardContent>
                  </Card>
                </div>
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
              {stockData?.analysis?.trader_plan && (
                <Card>
                  <CardHeader>
                    <CardTitle>Trading Plan & Strategy</CardTitle>
                    <CardDescription>
                      Comprehensive trading strategy and execution plan
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MarkdownRenderer content={stockData.analysis.trader_plan} />
                  </CardContent>
                </Card>
              )}

              {/* Final Recommendation */}
              {stockData?.analysis?.final_recommendation && (
                <Card>
                  <CardHeader>
                    <CardTitle>Final Investment Recommendation</CardTitle>
                    <CardDescription>
                      Detailed final recommendation with rationale and action plan
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MarkdownRenderer content={stockData.analysis.final_recommendation} />
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
