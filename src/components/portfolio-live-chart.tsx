"use client";

import { useEffect, useState, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
}

interface HistoricalValue {
  date: string; // ISO string
  net_value: number;
  cash_balance?: number;
}

interface LivePortfolioChartProps {
  positions: PortfolioPosition[];
  livePrices: Record<string, number>;
  historicalValues?: HistoricalValue[];
  portfolioLeverage?: number;
  startingEquity?: number;
  isWebSocketConnected?: boolean;
}

interface ChartDataPoint {
  time: string;
  equity: number;
  buyingPower?: number;
  timestamp?: number;
}

const chartConfig = {
  equity: { label: "Equity", color: "#10b981" }, // green
} satisfies ChartConfig;

const TIME_RANGES = ["1D", "1W", "1M", "3M", "1Y", "ALL"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

export function RobinhoodStylePortfolioChart({
  positions,
  livePrices,
  historicalValues = [],
  portfolioLeverage = 1,
  startingEquity = 100000,
  isWebSocketConnected = false,
}: LivePortfolioChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("1D");
  const [liveHistory, setLiveHistory] = useState<ChartDataPoint[]>([]);
  const [sessionStart] = useState(() => Date.now());

  // 🧮 Compute equity for live prices
  const computeEquity = useMemo(() => {
    return (prices: Record<string, number>) => {
      if (!positions.length) return startingEquity;
      let unrealized = 0;
      for (const pos of positions) {
        const price = prices[pos.ticker] ?? pos.avg_cost;
        unrealized += (price - pos.avg_cost) * pos.shares;
      }
      return startingEquity + unrealized;
    };
  }, [positions, startingEquity]);

  // ⏱ Update real-time points (only when 1D)
  useEffect(() => {
    if (selectedRange !== "1D" || !Object.keys(livePrices).length) return;

    const equity = computeEquity(livePrices);
    const now = Date.now();
    const elapsed = Math.floor((now - sessionStart) / 1000);

    setLiveHistory((prev) => [
      ...prev.filter((p) => now - (p.timestamp ?? 0) < 60 * 60 * 1000),
      { time: `${elapsed}s`, equity, timestamp: now },
    ]);
  }, [livePrices, computeEquity, sessionStart, selectedRange]);

  // 🗓 Filter historical values by time range
  const filteredHistory = useMemo(() => {
    if (!historicalValues?.length) return [];

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
        return historicalValues.map((v) => ({
          time: new Date(v.date).toLocaleDateString(),
          equity: v.net_value,
        }));
      default:
        return []; // 1D handled separately (live)
    }

    return historicalValues
      .filter((v) => new Date(v.date) >= cutoff)
      .map((v) => ({
        time: new Date(v.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        equity: v.net_value,
      }));
  }, [selectedRange, historicalValues]);

  // 🎨 Select proper chart dataset
  const chartData =
    selectedRange === "1D"
      ? liveHistory
      : filteredHistory.length
      ? filteredHistory
      : historicalValues.map((v) => ({
          time: new Date(v.date).toLocaleDateString(),
          equity: v.net_value,
        }));

  // 📈 Compute performance change
  const current = chartData[chartData.length - 1];
  const first = chartData[0];
  const diff = current && first ? current.equity - first.equity : 0;
  const pct = first ? (diff / first.equity) * 100 : 0;

  // 📊 Smart Y scaling
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
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-xl font-semibold">
          Portfolio Value
        </CardTitle>
        <CardDescription>
          {current
            ? `$${current.equity.toFixed(2)}`
            : "Loading data..."}{" "}
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

        {/* ⏱ Range Selector */}
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
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillEquity" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-equity)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-equity)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="equity"
                stroke="var(--color-equity)"
                fill="url(#fillEquity)"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
