"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Clock,
  Gauge,
} from "lucide-react";
import { PerformanceSummarySkeleton } from "~/components/portfolio-dashboard-skeleton";

interface PortfolioPosition {
  id: string;
  ticker: string;
  shares: number; // negative = short
  avg_cost: number;
  last_price?: number | null;
  updated_at: Date;
}

interface PerformanceSummaryProps {
  positions: PortfolioPosition[];
  portfolioLeverage?: number; // e.g., 4.0
  livePrices?: Record<string, number>; // ticker -> live price from WebSocket
  priceTimestamps?: Record<string, number>; // ticker -> timestamp of last update
}

interface PerformanceMetrics {
  totalValue: number; // equity
  totalReturn: number;
  totalReturnPct: number;
  longValue: number;
  shortValue: number;
  unrealizedPnl: number;
  leverageUsedPct: number;
  leveragedCapital: number;
  remainingBuyingPower: number;
  winRate: number;
  lastUpdate: Date;
  positionCount: number;
  cash: number;
}

export function PortfolioPerformanceSummary({
  positions,
  portfolioLeverage = 1.0,
  livePrices,
  priceTimestamps,
}: PerformanceSummaryProps) {
  const STARTING_CAPITAL = 100_000;

  // Determine if we're using live prices
  const usingLivePrices = livePrices && Object.keys(livePrices).length > 0;
  const priceSource: "websocket" | "http" = usingLivePrices
    ? "websocket"
    : "http";

  // Memoize the expensive calculateMetrics function to prevent unnecessary recalculations
  const metrics = useMemo(() => {
    const calculateMetrics = (
      positions: PortfolioPosition[],
      leverage: number,
    ): PerformanceMetrics => {
      let longValue = 0;
      let shortValue = 0;
      let longCost = 0;
      let shortProceeds = 0;
      let unrealizedPnl = 0;
      let wins = 0;
      let lastUpdate: Date | null = null;

      for (const p of positions) {
        // Prefer live prices over stored last_price
        const price = (livePrices && livePrices[p.ticker]) ?? p.last_price ?? 0;
        if (!price || p.shares === 0) continue;
        const abs = Math.abs(p.shares);

        // Use price timestamp if available from WebSocket, otherwise use position updated_at
        let updatedAt: Date;
        if (priceTimestamps && priceTimestamps[p.ticker] !== undefined) {
          updatedAt = new Date(priceTimestamps[p.ticker]!);
        } else {
          updatedAt = new Date(p.updated_at);
        }

        if (
          !isNaN(updatedAt.getTime()) &&
          (!lastUpdate || updatedAt > lastUpdate)
        ) {
          lastUpdate = updatedAt;
        }

        if (p.shares > 0) {
          // Long
          longValue += abs * price;
          longCost += abs * p.avg_cost;
          const pnl = (price - p.avg_cost) * abs;
          unrealizedPnl += pnl;
          if (pnl > 0) wins++;
        } else {
          // Short
          shortValue += abs * price;
          shortProceeds += abs * p.avg_cost;
          const pnl = (p.avg_cost - price) * abs;
          unrealizedPnl += pnl;
          if (pnl > 0) wins++;
        }
      }

      // 🧮 Cash after establishing positions
      const cash = STARTING_CAPITAL - longCost + shortProceeds;

      // 🧮 Equity = cash + longValue - shortValue
      const equity = cash + longValue - shortValue;

      // 🧮 Gross exposure
      const grossExposure = longValue + shortValue;

      // 🧮 Leverage capacity and usage
      const leveragedCapital = equity * leverage;
      const leverageUsedPct =
        leveragedCapital > 0 ? (grossExposure / leveragedCapital) * 100 : 0;
      const remainingBuyingPower = Math.max(
        0,
        leveragedCapital - grossExposure,
      );

      // 🧮 Portfolio returns
      const totalReturn = equity - STARTING_CAPITAL;
      const totalReturnPct = (totalReturn / STARTING_CAPITAL) * 100;

      const activePositions = positions.filter((p) => p.shares !== 0).length;
      const winRate = activePositions ? (wins / activePositions) * 100 : 0;

      return {
        totalValue: equity,
        totalReturn,
        totalReturnPct,
        longValue,
        shortValue,
        unrealizedPnl,
        leverageUsedPct,
        leveragedCapital,
        remainingBuyingPower,
        winRate,
        lastUpdate: lastUpdate ?? new Date(),
        positionCount: activePositions,
        cash,
      };
    };

    return calculateMetrics(positions || [], portfolioLeverage);
  }, [positions, portfolioLeverage, livePrices, priceTimestamps]);

  // 🧾 Formatting helpers (typed)
  const fmtCurrency = (v: number): string =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(v);

  const fmtPct = (v: number): string => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

  const fmtDate = (d: Date): string =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);

  // 🧠 Render
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Performance Summary
        </CardTitle>
        <Badge
          variant={priceSource === "websocket" ? "default" : "outline"}
          className={`text-xs ${priceSource === "websocket" ? "bg-green-600 dark:bg-green-700" : ""}`}
        >
          {priceSource === "websocket" ? (
            <span className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400"></span>
              </span>
              Live
            </span>
          ) : (
            "HTTP Prices"
          )}
        </Badge>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {/* 💰 Total Value */}
          <div className="dark:bg-secondary rounded-lg bg-gray-50 p-4 text-center">
            <div className="mb-1 flex items-center justify-center gap-1">
              <DollarSign className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Total Value
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {fmtCurrency(metrics.totalValue)}
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${
                metrics.unrealizedPnl >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {metrics.unrealizedPnl >= 0 ? "+" : ""}
              {fmtCurrency(metrics.unrealizedPnl)} P&L
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Assets: {fmtCurrency(metrics.longValue + metrics.cash)} | Debt:{" "}
              {fmtCurrency(metrics.shortValue)}
            </p>
          </div>

          {/* 📈 Portfolio Return */}
          <div className="dark:bg-secondary rounded-lg bg-gray-50 p-4 text-center">
            <div className="mb-1 flex items-center justify-center gap-1">
              {metrics.totalReturnPct >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Portfolio Return
              </span>
            </div>
            <p
              className={`text-2xl font-bold ${
                metrics.totalReturnPct >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {fmtPct(metrics.totalReturnPct)}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              vs starting capital $100,000
            </p>
          </div>

          {/* 💵 Buying Power */}
          <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-900/20">
            <div className="mb-1 flex items-center justify-center gap-1">
              <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-600 dark:text-blue-300">
                Buying Power
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {fmtCurrency(metrics.leveragedCapital)}
            </p>
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
              Available: {fmtCurrency(metrics.remainingBuyingPower)} •{" "}
              {portfolioLeverage.toFixed(1)}x leverage
            </p>
          </div>

          {/* 📊 Leverage Used */}
          <div className="dark:bg-secondary rounded-lg bg-gray-50 p-4 text-center">
            <div className="mb-1 flex items-center justify-center gap-1">
              <Gauge className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Leverage Used
              </span>
            </div>
            <p className="text-xl font-bold">
              {metrics.leverageUsedPct.toFixed(1)}%
            </p>
            <Progress value={metrics.leverageUsedPct} className="mt-1 h-2" />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Gross Exposure:{" "}
              {fmtCurrency(metrics.longValue + metrics.shortValue)}
            </p>
          </div>

          {/* 🎯 Win Rate */}
          <div className="dark:bg-secondary rounded-lg bg-gray-50 p-4 text-center">
            <div className="mb-1 flex items-center justify-center gap-1">
              <Target className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Win Rate
              </span>
            </div>
            <p className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {Math.round((metrics.winRate / 100) * metrics.positionCount)} of{" "}
              {metrics.positionCount} positions
            </p>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <Clock className="mr-1 h-4 w-4" />
            <span>Prices updated: {fmtDate(metrics.lastUpdate)}</span>
          </div>
          <div className="flex items-center">
            <span className="text-xs">
              Source: {priceSource === "websocket" ? "🟢 Live" : "🔵 HTTP"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
