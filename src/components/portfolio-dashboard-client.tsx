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
import { PortfolioConnectionStatus } from "~/components/portfolio-connection-status";
import { useFinnhubWebSocket } from "~/hooks/use-finnhub-websocket";

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

  // Extract unique ticker symbols from positions for WebSocket subscription
  const tickers = useMemo(() => {
    const uniqueTickers = new Set<string>();
    positions.forEach((position) => {
      if (position.ticker) {
        uniqueTickers.add(position.ticker);
      }
    });
    return Array.from(uniqueTickers);
  }, [positions]);

  // Initialize WebSocket connection for real-time price updates
  const {
    prices: livePrices,
    priceTimestamps,
    connectionState,
    subscribe,
    unsubscribe,
    reconnect,
    shouldFallbackToHttp,
  } = useFinnhubWebSocket(tickers);

  // Track previous portfolio ID and tickers for cleanup on portfolio change
  const prevPortfolioIdRef = useRef<string>(portfolioId);
  const prevTickersRef = useRef<string[]>(tickers);

  // Handle portfolio changes - unsubscribe from old tickers and subscribe to new ones
  useEffect(() => {
    // Check if portfolio has changed
    if (prevPortfolioIdRef.current !== portfolioId) {
      console.log('[Portfolio Dashboard] Portfolio changed from', prevPortfolioIdRef.current, 'to', portfolioId);
      
      // Get previous tickers
      const oldTickers = prevTickersRef.current;
      
      // Unsubscribe from previous portfolio's tickers
      if (oldTickers.length > 0 && connectionState.connected) {
        console.log('[Portfolio Dashboard] Unsubscribing from old tickers:', oldTickers);
        unsubscribe(oldTickers);
      }
      
      // Update positions to the new portfolio's initial positions
      // This ensures we don't show stale data from the previous portfolio
      setPositions(initialPositions);
      setActions(initialActions);
      
      // Subscribe to new portfolio's tickers
      if (tickers.length > 0 && connectionState.connected) {
        console.log('[Portfolio Dashboard] Subscribing to new tickers:', tickers);
        subscribe(tickers);
      }
      
      // Update refs
      prevPortfolioIdRef.current = portfolioId;
      prevTickersRef.current = tickers;
    } else if (prevTickersRef.current.length !== tickers.length || 
               !prevTickersRef.current.every((ticker, index) => ticker === tickers[index])) {
      // Tickers changed within the same portfolio (e.g., positions added/removed)
      const oldTickers = prevTickersRef.current;
      const newTickers = tickers;
      
      // Find tickers to unsubscribe (in old but not in new)
      const tickersToUnsubscribe = oldTickers.filter(ticker => !newTickers.includes(ticker));
      
      // Find tickers to subscribe (in new but not in old)
      const tickersToSubscribe = newTickers.filter(ticker => !oldTickers.includes(ticker));
      
      if (tickersToUnsubscribe.length > 0 && connectionState.connected) {
        console.log('[Portfolio Dashboard] Unsubscribing from removed tickers:', tickersToUnsubscribe);
        unsubscribe(tickersToUnsubscribe);
      }
      
      if (tickersToSubscribe.length > 0 && connectionState.connected) {
        console.log('[Portfolio Dashboard] Subscribing to new tickers:', tickersToSubscribe);
        subscribe(tickersToSubscribe);
      }
      
      // Update ticker ref
      prevTickersRef.current = tickers;
    }
  }, [portfolioId, tickers, connectionState.connected, subscribe, unsubscribe]);

  // Merge live prices with position data
  const positionsWithLivePrices = useMemo(() => {
    return positions.map((position) => {
      const livePrice = livePrices[position.ticker];
      if (livePrice !== undefined) {
        // Calculate updated metrics with live price
        const currentValue = position.shares * livePrice;
        const costBasis = position.shares * position.avg_cost;
        const profitLoss = currentValue - costBasis;
        const profitLossPct = costBasis !== 0 ? (profitLoss / Math.abs(costBasis)) * 100 : 0;

        return {
          ...position,
          last_price: livePrice,
          profit_loss: profitLoss,
          profit_loss_pct: profitLossPct,
          price_source: 'live' as const,
          price_updated_at: new Date(priceTimestamps[position.ticker] || Date.now()),
        };
      }
      return position;
    });
  }, [positions, livePrices, priceTimestamps]);

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

  // HTTP polling fallback when WebSocket fails
  useEffect(() => {
    if (!shouldFallbackToHttp) {
      return;
    }

    console.log('[Portfolio Dashboard] Falling back to HTTP polling for price updates');

    // Start polling every 30 seconds
    const pollInterval = setInterval(() => {
      console.log('[Portfolio Dashboard] HTTP polling: fetching updated prices');
      fetchHoldings();
    }, 30000); // 30 seconds

    // Initial fetch when fallback is triggered
    fetchHoldings();

    // Cleanup interval on unmount or when WebSocket reconnects
    return () => {
      console.log('[Portfolio Dashboard] Stopping HTTP polling');
      clearInterval(pollInterval);
    };
  }, [shouldFallbackToHttp, portfolioId]);

  return (
    <>
      {/* Performance Summary Card with Error Boundary */}
      <PortfolioDashboardErrorBoundary>
        <PortfolioPerformanceSummary
          positions={positionsWithLivePrices}
          portfolioLeverage={portfolioLeverage}
          livePrices={livePrices}
          priceTimestamps={priceTimestamps}
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
          <div className="flex items-center gap-3">
            {/* WebSocket Connection Status */}
            <PortfolioConnectionStatus
              state={connectionState}
              onReconnect={reconnect}
              usingHttpFallback={shouldFallbackToHttp}
            />
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
            loading={holdingsLoading}
            error={holdingsError}
            onRetry={retryHoldings}
            portfolioName={portfolioName}
            livePrices={livePrices}
            priceSource={connectionState.connected ? "websocket" : "http"}
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
