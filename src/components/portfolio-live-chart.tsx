"use client";

import { useEffect, useState, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Button } from "~/components/ui/button";

interface PortfolioPosition {
  ticker: string;
  shares: number;
  avg_cost: number;
}

interface HistoricalValue {
  date: string; // ISO date string
  net_value: number;
  cash_balance?: number;
  long_value?: number;
  short_value?: number;
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
  buyingPower: number;
  timestamp?: number;
}

const chartConfig = {
  equity: { label: "Equity", color: "#10b981" },
  buyingPower: { label: "Buying Power", color: "#3b82f6" },
} satisfies ChartConfig;

export function LivePortfolioChart({
  positions,
  livePrices,
  historicalValues = [],
  portfolioLeverage = 1.0,
  startingEquity = 100000,
  isWebSocketConnected = false,
}: LivePortfolioChartProps) {
  const [history, setHistory] = useState<ChartDataPoint[]>([]);
  const [sessionStart] = useState(() => Date.now());
  const [isOpen, setIsOpen] = useState(false);

  // 🧮 Compute equity & buying power dynamically (live)
  const computePortfolioValues = useMemo(() => {
    return (prices: Record<string, number>) => {
      if (positions.length === 0)
        return { equity: startingEquity, buyingPower: startingEquity };

      let unrealizedPnl = 0;
      let longExposure = 0;
      let shortExposure = 0;

      for (const pos of positions) {
        const price = prices[pos.ticker] ?? pos.avg_cost;
        if (pos.shares > 0) {
          unrealizedPnl += (price - pos.avg_cost) * pos.shares;
          longExposure += pos.shares * price;
        } else if (pos.shares < 0) {
          const abs = Math.abs(pos.shares);
          unrealizedPnl += (pos.avg_cost - price) * abs;
          shortExposure += abs * price;
        }
      }

      const equity = startingEquity + unrealizedPnl;
      const grossExposure = longExposure + shortExposure;
      const buyingPower =
        Math.max(equity * portfolioLeverage - grossExposure, 0) +
        startingEquity * 0.05;

      return { equity, buyingPower };
    };
  }, [positions, startingEquity, portfolioLeverage]);

  // 🕓 Initialize with historical daily values
  useEffect(() => {
    if (!historicalValues.length) return;

    const formattedHistory = historicalValues.map((v) => ({
      time: new Date(v.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      equity: v.net_value,
      buyingPower: v.cash_balance ?? v.net_value * 0.2,
    }));

    setHistory(formattedHistory);
  }, [historicalValues]);

  // 🔄 Update live every WebSocket tick
  useEffect(() => {
    if (!Object.keys(livePrices).length) return;

    const { equity, buyingPower } = computePortfolioValues(livePrices);
    const now = Date.now();
    const elapsed = Math.floor((now - sessionStart) / 1000);

    setHistory((prev) => [
      ...prev,
      {
        time: `${elapsed}s`,
        equity,
        buyingPower,
        timestamp: now,
      },
    ]);
  }, [livePrices, computePortfolioValues, sessionStart]);

  // 📊 Smart Y scaling
  const yAxisDomain = useMemo(() => {
    if (!history.length) return ["auto", "auto"];
    const values = history.map((h) => h.equity);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return [min - range * 0.05, max + range * 0.05];
  }, [history]);

  const current = history[history.length - 1];
  const first = history[0];
  const change = useMemo(() => {
    if (!first || !current) return { diff: 0, pct: 0 };
    const diff = current.equity - first.equity;
    const pct = (diff / first.equity) * 100;
    return { diff, pct };
  }, [history]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle className="flex items-center gap-2">
              Portfolio Performance
              {portfolioLeverage > 1 && (
                <span className="text-muted-foreground text-sm font-normal">
                  ({portfolioLeverage}× leverage)
                </span>
              )}
              {isWebSocketConnected && (
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              )}
            </CardTitle>
            <CardDescription>
              {current
                ? `$${current.equity.toFixed(2)}`
                : "Waiting for portfolio data..."}{" "}
              {change.diff !== 0 && (
                <span
                  className={`ml-2 font-semibold ${
                    change.diff >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {change.diff >= 0 ? "+" : ""}${change.diff.toFixed(2)} (
                  {change.pct.toFixed(2)}%)
                </span>
              )}
            </CardDescription>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            {!history.length ? (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                Loading chart...
              </div>
            ) : (
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px] w-full"
              >
                <AreaChart data={history}>
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
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient
                      id="fillBuyingPower"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-buyingPower)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-buyingPower)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    domain={yAxisDomain}
                    tickFormatter={(v) => `$${v.toFixed(0)}`}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
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
                    dataKey="buyingPower"
                    type="monotone"
                    fill="url(#fillBuyingPower)"
                    stroke="var(--color-buyingPower)"
                    fillOpacity={0.25}
                  />
                  <Area
                    dataKey="equity"
                    type="monotone"
                    fill="url(#fillEquity)"
                    stroke="var(--color-equity)"
                    fillOpacity={0.25}
                  />
                  <ChartLegend content={<ChartLegendContent className="mt-4" />} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
