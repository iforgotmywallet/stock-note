"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { TrendingUp, BarChart3, Activity, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";

/**
 * Empty state for when portfolio has no positions
 */
export function EmptyPositionsState({
  portfolioName,
}: {
  portfolioName: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="mb-4 rounded-full bg-blue-50 p-3 dark:bg-blue-900/20">
          <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          No Holdings Yet
        </h3>
        <p className="mb-6 max-w-md text-center text-sm text-gray-600 dark:text-gray-300">
          Your portfolio "{portfolioName}" doesn't have any stock positions yet.
          The AI will start making trading decisions once it analyzes market
          conditions.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/chat">
              <Plus className="mr-2 h-4 w-4" />
              Request Analysis
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Check Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty state for when portfolio has no trading actions
 */
export function EmptyActionsState({
  portfolioName,
}: {
  portfolioName: string;
}) {
  return (
    <div className="dark:bg-secondary rounded-lg bg-white shadow">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recent Trades
        </h2>
      </div>
      <div className="px-6 py-12 text-center">
        <div className="mx-auto mb-4 w-fit rounded-full bg-green-50 p-3 dark:bg-green-900/20">
          <Activity className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          No Trading Actions
        </h3>
        <p className="mx-auto mb-6 max-w-md text-sm text-gray-600 dark:text-gray-300">
          No AI trading decisions have been made for "{portfolioName}" yet.
          Trading actions will appear here once the AI starts analyzing and
          making investment decisions.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/chat">
              <BarChart3 className="mr-2 h-4 w-4" />
              Start Analysis
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state for completely new portfolio
 */
export function EmptyPortfolioState({
  portfolioName,
  portfolioDescription,
}: {
  portfolioName: string;
  portfolioDescription?: string;
}) {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-fit rounded-full bg-blue-50 p-4 dark:bg-blue-900/20">
              <TrendingUp className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Welcome to {portfolioName}
            </CardTitle>
            {portfolioDescription && (
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {portfolioDescription}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                <div className="dark:bg-secondary rounded-lg bg-gray-50 p-4">
                  <BarChart3 className="mx-auto mb-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <p className="font-medium">AI Analysis</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Request stock analysis to get started
                  </p>
                </div>
                <div className="dark:bg-secondary rounded-lg bg-gray-50 p-4">
                  <Activity className="mx-auto mb-2 h-6 w-6 text-green-600 dark:text-green-400" />
                  <p className="font-medium">Auto Trading</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    AI makes trading decisions automatically
                  </p>
                </div>
                <div className="dark:bg-secondary rounded-lg bg-gray-50 p-4">
                  <TrendingUp className="mx-auto mb-2 h-6 w-6 text-purple-600 dark:text-purple-400" />
                  <p className="font-medium">Track Performance</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Monitor your portfolio's growth
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-gray-600 dark:text-gray-300">
                Your portfolio is ready! Start by requesting a stock analysis to
                begin AI-powered trading.
              </p>
              <div className="flex justify-center gap-3">
                <Button asChild>
                  <Link href="/chat">
                    <Plus className="mr-2 h-4 w-4" />
                    Start Analysis
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/portfolio">View All Portfolios</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Loading state for dashboard data
 */
export function DashboardLoadingState() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <div className="flex items-center gap-4">
        <div className="h-9 w-16 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700"></div>
        <div>
          <div className="mb-2 h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>

      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="text-gray-600 dark:text-gray-300">
              Loading portfolio data...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
