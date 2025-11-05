"use client";

import { useEffect, useState, useMemo } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "~/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";

interface PortfolioPosition {
  ticker: string;
  shares: number;
  avg_cost: number;
  last_price?: number | null;
}

interface HistoricalValue {
  date: string; // ISO string
  net_value: number;
}

interface LivePortfolioChartProps {
  positions: PortfolioPosition[];
  historicalValues?: HistoricalValue[];
  startingEquity?: number;
  isWebSocketConnected?: boolean;
}

interface ChartDataPoint {
  time: string;
  equity: number;
  timestamp?: number;
}

const chartConfig = {
  equity: { label: "Equity", color: "#10b981" },
} satisfies ChartConfig;

const TIME_RANGES = ["1D", "1W", "1M", "3M", "1Y", "ALL"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

export function RobinhoodStylePortfolioChart({
  positions,
  historicalValues = [],
  startingEquity = 100000,
  isWebSocketConnected = false,
}: LivePortfolioChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("1D");
  const [liveDataPoints, setLiveDataPoints] = useState<ChartDataPoint[]>([]);

  // Compute current equity from positions (matches summary calculation)
  const computeEquity = useMemo(() => {
    if (!positions.length) return startingEquity;
    
    let longValue = 0;
    let shortValue = 0;
    let longCost = 0;
    let shortProceeds = 0;

    for (const pos of positions) {
      const price = pos.last_price ?? pos.avg_cost;
      if (!price || pos.shares === 0) continue;
      
      const abs = Math.abs(pos.shares);
      
      if (pos.shares > 0) {
        // Long position
        longValue += abs * price;
        longCost += abs * pos.avg_cost;
      } else {
        // Short position
        shortValue += abs * price;
        shortProceeds += abs * pos.avg_cost;
      }
    }

    // Cash after establishing positions
    const cash = startingEquity - longCost + shortProceeds;
    
    // Equity = cash + longValue - shortValue
    return cash + longValue - shortValue;
  }, [positions, startingEquity]);

  // Get today's starting value from historical data
  const todayStartValue = useMemo(() => {
    if (!historicalValues.length) return startingEquity;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find most recent historical value (should be yesterday or earlier)
    const sortedValues = [...historicalValues].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return sortedValues[0]?.net_value ?? startingEquity;
  }, [historicalValues, startingEquity]);

  // Update live data points when positions change (1D only)
  useEffect(() => {
    if (selectedRange !== "1D" || !isWebSocketConnected) {
      return;
    }

    const equity = computeEquity;
    const now = Date.now();
    const time = new Date(now).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    setLiveDataPoints((prev) => {
      // Keep only last hour of data
      const filtered = prev.filter(
        (p) => now - (p.timestamp ?? 0) < 60 * 60 * 1000,
      );

      // Add new point
      return [...filtered, { time, equity, timestamp: now }];
    });
  }, [positions, computeEquity, selectedRange, isWebSocketConnected]);

  // Filter historical data by selected time range
  const chartData = useMemo(() => {
    if (selectedRange === "1D") {
      // For 1D: show live WebSocket data if available, otherwise show today's historical value
      if (isWebSocketConnected && liveDataPoints.length > 0) {
        return liveDataPoints;
      }

      // Fallback: show today's starting value as a single point
      return [
        {
          time: "Market Open",
          equity: todayStartValue,
        },
      ];
    }

    // For other ranges: filter historical daily values
    if (!historicalValues.length) return [];

    const now = new Date();
    const cutoff = new Date();

    switch (selectedRange) {
      case "1W":
        cutoff.setDate(now.getDate() - 7);
        break;
      case "1M":
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case "3M":
        cutoff.setMonth(now.getMonth() - 3);
        break;
      case "1Y":
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
      case "ALL":
        cutoff.setFullYear(2000); // Show all data
        break;
    }

    const filtered = historicalValues
      .filter((v) => new Date(v.date) >= cutoff)
      .map((v) => ({
        time: new Date(v.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        equity: v.net_value,
      }));

    // If no data in the selected range, show all available data
    if (filtered.length === 0 && historicalValues.length > 0) {
      return historicalValues.map((v) => ({
        time: new Date(v.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        equity: v.net_value,
      }));
    }

    return filtered;
  }, [
    selectedRange,
    historicalValues,
    liveDataPoints,
    isWebSocketConnected,
    todayStartValue,
  ]);

  // Calculate performance metrics
  const current = chartData[chartData.length - 1];
  const first = chartData[0];
  const diff = current && first ? current.equity - first.equity : 0;
  const pct = first && first.equity !== 0 ? (diff / first.equity) * 100 : 0;

  // Smart Y-axis scaling
  const yDomain = useMemo(() => {
    if (!chartData.length) return ["auto", "auto"];
    const vals = chartData.map((p) => p.equity);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    return [min - range * 0.05, max + range * 0.05];
  }, [chartData]);

  return (
    <Card className="pt-0">
      <CardHeader className="border-b pt-6 pb-4">
        <CardTitle className="text-xl font-semibold">Portfolio Value</CardTitle>
        <CardDescription>
          {current ? `$${current.equity.toFixed(2)}` : "Loading data..."}{" "}
          {diff !== 0 && (
            <span
              className={`ml-2 font-semibold ${
                diff >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {diff >= 0 ? "+" : ""}${diff.toFixed(2)} ({pct.toFixed(2)}%)
            </span>
          )}
        </CardDescription>

        {/* Time Range Selector */}
        <div className="mt-4 flex items-center gap-2">
          {TIME_RANGES.map((range) => (
            <Button
              key={range}
              variant={range === selectedRange ? "default" : "outline"}
              size="sm"
              className="rounded-full px-3 text-xs font-medium"
              onClick={() => setSelectedRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="px-2 pt-6 sm:px-6">
        {!chartData.length ? (
          <div className="text-muted-foreground flex h-[250px] items-center justify-center">
            Loading chart...
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <LineChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
              />
              <YAxis domain={yDomain} hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(v) => `Time: ${v}`}
                    indicator="dot"
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="equity"
                stroke="var(--color-equity)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
