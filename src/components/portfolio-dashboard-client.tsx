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
import { useFinnhubWebSocket } from "~/hooks/use-finnhub-websocket";

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
    shouldFallbackToHttp,
  } = useFinnhubWebSocket(tickers);

  // Track previous portfolio ID and tickers for cleanup on portfolio change
  const prevPortfolioIdRef = useRef<string>(portfolioId);
  const prevTickersRef = useRef<string[]>(tickers);

  // Handle portfolio changes - unsubscribe from old tickers and subscribe to new ones
  useEffect(() => {
    // Check if portfolio has changed
    if (prevPortfolioIdRef.current !== portfolioId) {
      console.log(
        "[Portfolio Dashboard] Portfolio changed from",
        prevPortfolioIdRef.current,
        "to",
        portfolioId,
      );

      // Get previous tickers
      const oldTickers = prevTickersRef.current;

      // Unsubscribe from previous portfolio's tickers
      if (oldTickers.length > 0 && connectionState.connected) {
        console.log(
          "[Portfolio Dashboard] Unsubscribing from old tickers:",
          oldTickers,
        );
        unsubscribe(oldTickers);
      }

      // Update positions to the new portfolio's initial positions
      // This ensures we don't show stale data from the previous portfolio
      setPositions(initialPositions);
      setActions(initialActions);

      // Subscribe to new portfolio's tickers
      if (tickers.length > 0 && connectionState.connected) {
        console.log(
          "[Portfolio Dashboard] Subscribing to new tickers:",
          tickers,
        );
        subscribe(tickers);
      }

      // Update refs
      prevPortfolioIdRef.current = portfolioId;
      prevTickersRef.current = tickers;
    } else if (
      prevTickersRef.current.length !== tickers.length ||
      !prevTickersRef.current.every(
        (ticker, index) => ticker === tickers[index],
      )
    ) {
      // Tickers changed within the same portfolio (e.g., positions added/removed)
      const oldTickers = prevTickersRef.current;
      const newTickers = tickers;

      // Find tickers to unsubscribe (in old but not in new)
      const tickersToUnsubscribe = oldTickers.filter(
        (ticker) => !newTickers.includes(ticker),
      );

      // Find tickers to subscribe (in new but not in old)
      const tickersToSubscribe = newTickers.filter(
        (ticker) => !oldTickers.includes(ticker),
      );

      if (tickersToUnsubscribe.length > 0 && connectionState.connected) {
        console.log(
          "[Portfolio Dashboard] Unsubscribing from removed tickers:",
          tickersToUnsubscribe,
        );
        unsubscribe(tickersToUnsubscribe);
      }

      if (tickersToSubscribe.length > 0 && connectionState.connected) {
        console.log(
          "[Portfolio Dashboard] Subscribing to new tickers:",
          tickersToSubscribe,
        );
        subscribe(tickersToSubscribe);
      }

      // Update ticker ref
      prevTickersRef.current = tickers;
    }
  }, [portfolioId, tickers, connectionState.connected, subscribe, unsubscribe, initialPositions, initialActions]);

  // Merge live prices with position data
  const positionsWithLivePrices = useMemo(() => {
    return positions.map((position) => {
      const livePrice = livePrices[position.ticker];
      if (livePrice !== undefined) {
        // Calculate updated metrics with live price
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
          price_source: "live" as const,
          price_updated_at: new Date(
            priceTimestamps[position.ticker] || Date.now(),
          ),
        };
      }
      return position;
    });
  }, [positions, livePrices, priceTimestamps]);

  // Fetch updated prices from Finnhub HTTP API (Fallback 1)
  const fetchLivePricesHTTP = async () => {
    if (tickers.length === 0) return;

    try {
      const tickersParam = tickers.join(",");
      const response = await fetch(
        `/api/portfolio/prices?tickers=${tickersParam}`,
      );

      if (!response.ok) {
        console.warn(
          "Failed to fetch live prices via HTTP:",
          response.statusText,
        );
        return;
      }

      const data = await response.json();

      // Check if we got rate limited
      const rateLimitedCount = data.errors
        ? Object.values(data.errors).filter(
            (err: any) => err === "Rate limited",
          ).length
        : 0;

      if (rateLimitedCount > 0) {
        console.warn(
          `Rate limited for ${rateLimitedCount} tickers - keeping existing prices`,
        );
      }

      // Update positions with HTTP-fetched prices
      if (data.prices) {
        let updatedCount = 0;

        setPositions((prev) =>
          prev.map((position) => {
            const httpPrice = data.prices[position.ticker];

            if (httpPrice && httpPrice > 0) {
              updatedCount++;
              // Recalculate P&L with HTTP price
              const currentValue = position.shares * httpPrice;
              const costBasis = position.shares * position.avg_cost;
              const profitLoss = currentValue - costBasis;
              const profitLossPct =
                costBasis !== 0 ? (profitLoss / Math.abs(costBasis)) * 100 : 0;

              return {
                ...position,
                last_price: httpPrice,
                profit_loss: profitLoss,
                profit_loss_pct: profitLossPct,
                updated_at: new Date(),
              };
            }

            // Fallback 2: Keep existing last_price from database
            return position;
          }),
        );

        if (updatedCount > 0) {
          setLastUpdated(new Date());
          console.log(
            `Updated ${updatedCount}/${tickers.length} prices via HTTP`,
          );
        }
      }
    } catch (error) {
      console.error("Error fetching live prices via HTTP:", error);
      // Silently fail - positions will use Fallback 2 (database last_price)
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

  // Retry handler for actions
  const retryActions = () => {
    fetchActions();
  };

  // HTTP polling fallback when WebSocket fails (Fallback 1)
  useEffect(() => {
    if (!shouldFallbackToHttp) {
      return;
    }

    // Check if we're during market hours (9:30 AM - 4:00 PM ET, Mon-Fri)
    const isMarketHours = () => {
      const now = new Date();
      const et = new Date(
        now.toLocaleString("en-US", { timeZone: "America/New_York" }),
      );
      const day = et.getDay(); // 0 = Sunday, 6 = Saturday
      const hour = et.getHours();
      const minute = et.getMinutes();
      const timeInMinutes = hour * 60 + minute;

      // Market hours: Mon-Fri, 9:30 AM - 4:00 PM ET
      const isWeekday = day >= 1 && day <= 5;
      const marketOpen = 9 * 60 + 30; // 9:30 AM
      const marketClose = 16 * 60; // 4:00 PM

      return (
        isWeekday && timeInMinutes >= marketOpen && timeInMinutes < marketClose
      );
    };

    if (!isMarketHours()) {
      console.log(
        "[Portfolio Dashboard] Outside market hours - using database prices only",
      );
      return; // Don't poll outside market hours
    }

    console.log(
      "[Portfolio Dashboard] Falling back to HTTP polling for price updates",
    );

    // Start polling every 60 seconds to avoid rate limits
    const pollInterval = setInterval(() => {
      if (isMarketHours()) {
        console.log(
          "[Portfolio Dashboard] HTTP polling: fetching updated prices",
        );
        fetchLivePricesHTTP();
      } else {
        console.log("[Portfolio Dashboard] Market closed - skipping HTTP poll");
      }
    }, 60000); // 60 seconds

    // Initial fetch when fallback is triggered
    fetchLivePricesHTTP();

    // Cleanup interval on unmount or when WebSocket reconnects
    return () => {
      console.log("[Portfolio Dashboard] Stopping HTTP polling");
      clearInterval(pollInterval);
    };
  }, [shouldFallbackToHttp, portfolioId, tickers]);

  return (
    <>
      {/* Performance Summary Card with Error Boundary */}
      <PortfolioDashboardErrorBoundary>
        <PortfolioPerformanceSummary
          positions={positionsWithLivePrices}
          portfolioLeverage={portfolioLeverage}
          portfolioTickers={portfolioTickers}
          livePrices={livePrices}
          priceTimestamps={priceTimestamps}
          isWebSocketConnected={connectionState.connected}
        />
      </PortfolioDashboardErrorBoundary>

      {/* Live Portfolio Chart with Error Boundary */}
      <PortfolioDashboardErrorBoundary>
        <RobinhoodStylePortfolioChart
          positions={positions}
          livePrices={livePrices}
          historicalValues={dailyValues.map((v) => ({
            date: v.date.toISOString(),
            net_value: v.net_value,
          }))}
          startingEquity={100000}
          isWebSocketConnected={connectionState.connected}
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
            livePrices={livePrices}
            priceSource={
              connectionState.connected && Object.keys(livePrices).length > 0
                ? "websocket"
                : "http"
            }
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
