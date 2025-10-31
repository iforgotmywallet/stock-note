"use client";

import { useState, useEffect } from "react";
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
}: PerformanceSummaryProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  const STARTING_CAPITAL = 100_000;

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
      const price = p.last_price ?? 0;
      if (!price || p.shares === 0) continue;
      const abs = Math.abs(p.shares);
      const updatedAt = new Date(p.updated_at);
      if (!isNaN(updatedAt.getTime()) && (!lastUpdate || updatedAt > lastUpdate)) {
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
    const remainingBuyingPower = Math.max(0, leveragedCapital - grossExposure);

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

  useEffect(() => {
    const calc = calculateMetrics(positions || [], portfolioLeverage);
    setMetrics(calc);
  }, [positions, portfolioLeverage]);

  if (!metrics) return <PerformanceSummarySkeleton />;

  // 🧾 Formatting helpers (typed)
  const fmtCurrency = (v: number): string =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(v);

  const fmtPct = (v: number): string =>
    `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

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
        <Badge variant="outline" className="text-xs">
          Live Prices
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
            <p className="text-xl font-bold">{metrics.leverageUsedPct.toFixed(1)}%</p>
            <Progress value={metrics.leverageUsedPct} className="h-2 mt-1" />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Gross Exposure: {fmtCurrency(metrics.longValue + metrics.shortValue)}
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

        <div className="mt-2 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          <Clock className="h-4 w-4 mr-1" />
          Data last updated: {fmtDate(metrics.lastUpdate)} | Now:{" "}
          {fmtDate(new Date())}
        </div>
      </CardContent>
    </Card>
  );
}
