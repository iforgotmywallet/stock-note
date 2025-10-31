"use client";

import { useState, useEffect } from "react";
import { PortfolioPerformanceSummary } from "~/components/portfolio-performance-summary";
import { PortfolioHoldingsTable } from "~/components/portfolio-holdings-table";
import { PortfolioRecentActions } from "~/components/portfolio-recent-actions";
import {
  PortfolioDashboardErrorBoundary,
  HoldingsTableErrorFallback,
  RecentActionsErrorFallback,
} from "~/components/portfolio-dashboard-error-boundary";

import type {
  PortfolioPositionWithMetrics,
  PortfolioActionWithDetails,
} from "~/lib/database/portfolios";

interface PortfolioDashboardClientProps {
  portfolioId: string;
  portfolioName: string;
  portfolioLeverage: number;
  initialPositions: PortfolioPositionWithMetrics[];
  initialActions: PortfolioActionWithDetails[];
}

/**
 * Client-side dashboard component with data fetching and retry mechanisms
 */
export function PortfolioDashboardClient({
  portfolioId,
  portfolioName,
  portfolioLeverage,
  initialPositions,
  initialActions,
}: PortfolioDashboardClientProps) {
  const [positions, setPositions] = useState(initialPositions);
  const [actions, setActions] = useState(initialActions);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch updated holdings data with live prices
  const fetchHoldings = async () => {
    try {
      setHoldingsLoading(true);
      setHoldingsError(null);

      const response = await fetch(`/api/portfolio/${portfolioId}/positions`);
      if (!response.ok) {
        throw new Error(`Failed to fetch holdings: ${response.statusText}`);
      }

      const data = await response.json();
      setPositions(data.positions || data); // Handle both old and new format
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching holdings:", error);
      setHoldingsError(
        error instanceof Error
          ? error.message
          : "Failed to load holdings with live prices",
      );
    } finally {
      setHoldingsLoading(false);
    }
  };

  // Fetch updated actions data
  const fetchActions = async () => {
    try {
      setActionsLoading(true);
      setActionsError(null);

      const response = await fetch(
        `/api/portfolio/${portfolioId}/actions?limit=10`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch actions: ${response.statusText}`);
      }

      const updatedActions = await response.json();
      setActions(updatedActions);
    } catch (error) {
      console.error("Error fetching actions:", error);
      setActionsError(
        error instanceof Error
          ? error.message
          : "Failed to load trading actions",
      );
    } finally {
      setActionsLoading(false);
    }
  };

  // Retry handlers
  const retryHoldings = () => {
    fetchHoldings();
  };

  const retryActions = () => {
    fetchActions();
  };

  // Automatically fetch live prices when component mounts
  useEffect(() => {
    // Only fetch if we have positions and they're not already loading
    if (positions.length > 0 && !holdingsLoading) {
      fetchHoldings();
    }
  }, []); // Run once on mount

  return (
    <>
      {/* Performance Summary Card with Error Boundary */}
      <PortfolioDashboardErrorBoundary>
        <PortfolioPerformanceSummary
          positions={positions}
          portfolioLeverage={portfolioLeverage}
        />
      </PortfolioDashboardErrorBoundary>

      {/* Holdings Table with Error Boundary and Retry */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Current Holdings
            </h2>
            {lastUpdated && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <button
            onClick={fetchHoldings}
            disabled={holdingsLoading}
            className="flex items-center gap-2 text-sm text-blue-600 transition-colors hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {holdingsLoading ? (
              <>
                <div className="size-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                Updating...
              </>
            ) : (
              <>
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh Prices
              </>
            )}
          </button>
        </div>

        <PortfolioDashboardErrorBoundary
          fallback={({ error, resetError }) => (
            <HoldingsTableErrorFallback
              error={error?.message || "Unknown error"}
              onRetry={resetError}
            />
          )}
        >
          <PortfolioHoldingsTable
            positions={positions}
            loading={holdingsLoading}
            error={holdingsError}
            onRetry={retryHoldings}
            portfolioName={portfolioName}
          />
        </PortfolioDashboardErrorBoundary>
      </div>

      {/* Recent Trades with Error Boundary and Retry */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recent Trades
          </h2>
          {!actionsLoading && !actionsError && (
            <button
              onClick={fetchActions}
              className="text-sm text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Refresh
            </button>
          )}
        </div>

        <PortfolioDashboardErrorBoundary
          fallback={({ error, resetError }) => (
            <RecentActionsErrorFallback
              error={error?.message || "Unknown error"}
              onRetry={resetError}
            />
          )}
        >
          <PortfolioRecentActions
            actions={actions}
            loading={actionsLoading}
            error={actionsError}
            onRetry={retryActions}
            portfolioName={portfolioName}
          />
        </PortfolioDashboardErrorBoundary>
      </div>
    </>
  );
}

/**
 * Simplified client wrapper for cases where API endpoints don't exist yet
 */
export function PortfolioDashboardSimpleClient({
  portfolioName,
  portfolioLeverage = 1.0,
  initialPositions,
  initialActions,
}: {
  portfolioName: string;
  portfolioLeverage?: number;
  initialPositions: PortfolioPositionWithMetrics[];
  initialActions: PortfolioActionWithDetails[];
}) {
  return (
    <>
      {/* Performance Summary Card with Error Boundary */}
      <PortfolioDashboardErrorBoundary>
        <PortfolioPerformanceSummary
          positions={initialPositions}
          portfolioLeverage={portfolioLeverage}
        />
      </PortfolioDashboardErrorBoundary>

      {/* Holdings Table with Error Boundary */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Current Holdings
        </h2>
        <PortfolioDashboardErrorBoundary>
          <PortfolioHoldingsTable
            positions={initialPositions}
            portfolioName={portfolioName}
          />
        </PortfolioDashboardErrorBoundary>
      </div>

      {/* Recent Trades with Error Boundary */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recent Trades
        </h2>
        <PortfolioDashboardErrorBoundary>
          <PortfolioRecentActions
            actions={initialActions}
            portfolioName={portfolioName}
          />
        </PortfolioDashboardErrorBoundary>
      </div>
    </>
  );
}
