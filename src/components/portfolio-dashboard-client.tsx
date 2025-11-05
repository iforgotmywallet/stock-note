"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { PortfolioPerformanceSummary } from "~/components/portfolio-performance-summary";
import { PortfolioHoldingsTable } from "~/components/portfolio-holdings-table";
import { PortfolioRecentActions } from "~/components/portfolio-recent-actions";
import {
  PortfolioDashboardErrorBoundary,
  HoldingsTableErrorFallback,
  RecentActionsErrorFallback,
} from "~/components/portfolio-dashboard-error-boundary";
import { usePortfolioPrices } from "~/hooks/use-portfolio-prices";

import type {
  PortfolioPositionWithMetrics,
  PortfolioActionWithDetails,
} from "~/lib/database/portfolios";
import { RobinhoodStylePortfolioChart } from "./portfolio-live-chart";

interface PortfolioDashboardClientProps {
  portfolioId: string;
  portfolioName: string;
  portfolioLeverage: number;
  portfolioTickers: string[];
  initialPositions: PortfolioPositionWithMetrics[];
  initialActions: PortfolioActionWithDetails[];
  dailyValues?: Array<{
    date: Date;
    net_value: number;
    cash_balance?: number;
    long_value?: number;
    short_value?: number;
  }>;
}

/**
 * Client-side dashboard component with data fetching and retry mechanisms
 */
export function PortfolioDashboardClient({
  portfolioId,
  portfolioName,
  portfolioLeverage,
  portfolioTickers,
  initialPositions,
  initialActions,
  dailyValues = [],
}: PortfolioDashboardClientProps) {
  const [positions, setPositions] = useState(initialPositions);
  const [actions, setActions] = useState(initialActions);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);

  // Extract unique ticker symbols from positions
  const tickers = useMemo(() => {
    const uniqueTickers = new Set<string>();
    positions.forEach((position) => {
      if (position.ticker) {
        uniqueTickers.add(position.ticker);
      }
    });
    return Array.from(uniqueTickers);
  }, [positions]);

  // Use the new hook that switches between WebSocket and HTTP based on market hours
  const {
    prices: livePrices,
    priceTimestamps,
    priceSource,
    isMarketOpen,
  } = usePortfolioPrices({
    tickers,
    enabled: true,
    httpPollingInterval: 1000, // 1 second interval for HTTP polling
  });

  // Track previous portfolio ID for cleanup on portfolio change
  const prevPortfolioIdRef = useRef<string>(portfolioId);

  // Handle portfolio changes - reset positions and actions
  useEffect(() => {
    // Check if portfolio has changed
    if (prevPortfolioIdRef.current !== portfolioId) {
      console.log(
        "[Portfolio Dashboard] Portfolio changed from",
        prevPortfolioIdRef.current,
        "to",
        portfolioId,
      );

      // Update positions to the new portfolio's initial positions
      // This ensures we don't show stale data from the previous portfolio
      setPositions(initialPositions);
      setActions(initialActions);

      // Update ref
      prevPortfolioIdRef.current = portfolioId;
    }
  }, [portfolioId, initialPositions, initialActions]);

  // Merge live prices (WebSocket or HTTP) with positions
  const positionsWithLivePrices = useMemo(() => {
    return positions.map((position) => {
      const livePrice = livePrices[position.ticker];
      
      // Live price available (from WebSocket or HTTP)
      if (livePrice !== undefined) {
        const currentValue = position.shares * livePrice;
        const costBasis = position.shares * position.avg_cost;
        const profitLoss = currentValue - costBasis;
        const profitLossPct =
          costBasis !== 0 ? (profitLoss / Math.abs(costBasis)) * 100 : 0;

        return {
          ...position,
          last_price: livePrice,
          profit_loss: profitLoss,
          profit_loss_pct: profitLossPct,
          price_source: priceSource === 'websocket' ? "live" as const : "delayed" as const,
          price_updated_at: new Date(
            priceTimestamps[position.ticker] || Date.now(),
          ),
        };
      }
      
      // No price update available
      return position;
    });
  }, [positions, livePrices, priceTimestamps, priceSource]);

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

  // Retry handler for actions
  const retryActions = () => {
    fetchActions();
  };

  return (
    <>
      {/* Performance Summary Card with Error Boundary */}
      <PortfolioDashboardErrorBoundary>
        <PortfolioPerformanceSummary
          positions={positionsWithLivePrices}
          portfolioLeverage={portfolioLeverage}
          portfolioTickers={portfolioTickers}
          isWebSocketConnected={priceSource === 'websocket'}
          isMarketOpen={isMarketOpen}
        />
      </PortfolioDashboardErrorBoundary>

      {/* Live Portfolio Chart with Error Boundary */}
      <PortfolioDashboardErrorBoundary>
        <RobinhoodStylePortfolioChart
          positions={positionsWithLivePrices}
          historicalValues={dailyValues.map((v) => ({
            date: v.date.toISOString(),
            net_value: v.net_value,
          }))}
          startingEquity={100000}
          isWebSocketConnected={priceSource === 'websocket'}
        />
      </PortfolioDashboardErrorBoundary>

      {/* Holdings Table with Error Boundary and Retry */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Current Holdings
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isMarketOpen 
                ? `Market Open - Live prices via ${priceSource === 'websocket' ? 'WebSocket' : 'connecting...'}`
                : `Market Closed - Prices via HTTP polling`
              }
            </p>
          </div>
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
            positions={positionsWithLivePrices}
            portfolioName={portfolioName}
            priceSource={priceSource === 'websocket' ? 'websocket' : 'http'}
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
