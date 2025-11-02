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

interface LivePortfolioChartProps {
  positions: PortfolioPosition[];
  livePrices: Record<string, number>;
  portfolioLeverage?: number;
  startingEquity?: number;
  isWebSocketConnected?: boolean;
  initialPrices?: Record<string, number>; // Database prices for initial display
}

interface ChartDataPoint {
  time: string;
  equity: number;
  buyingPower: number;
  timestamp: number;
}

const chartConfig = {
  equity: {
    label: "Equity",
    color: "#10b981", // green
  },
  buyingPower: {
    label: "Buying Power",
    color: "#3b82f6", // blue
  },
} satisfies ChartConfig;

export function LivePortfolioChart({
  positions,
  livePrices,
  portfolioLeverage = 1.0,
  startingEquity = 100000,
  isWebSocketConnected = false,
  initialPrices,
}: LivePortfolioChartProps) {
  const [history, setHistory] = useState<ChartDataPoint[]>([]);
  const [sessionStart] = useState(() => Date.now());
  const [isOpen, setIsOpen] = useState(false); // Default to collapsed
  const [hasInitialized, setHasInitialized] = useState(false);

  // 🧮 Compute equity & buying power dynamically
  const computePortfolioValues = useMemo(() => {
    return (prices: Record<string, number>) => {
      // If no positions, return default values
      if (positions.length === 0) {
        const defaultEquity = 100000;
        const defaultBuyingPower = defaultEquity * portfolioLeverage;
        return { equity: defaultEquity, buyingPower: defaultBuyingPower };
      }

      let unrealizedPnl = 0;
      let longExposure = 0;
      let shortExposure = 0;

      for (const pos of positions) {
        const price = prices[pos.ticker] ?? pos.avg_cost;
        if (pos.shares > 0) {
          unrealizedPnl += (price - pos.avg_cost) * pos.shares;
          longExposure += pos.shares * price;
        } else if (pos.shares < 0) {
          const absShares = Math.abs(pos.shares);
          unrealizedPnl += (pos.avg_cost - price) * absShares;
          shortExposure += absShares * price;
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

  // 🎬 Initialize chart with database prices on mount
  useEffect(() => {
    if (hasInitialized) return;
    
    // If no positions, initialize immediately with default values
    if (positions.length === 0) {
      const { equity, buyingPower } = computePortfolioValues({});
      const now = Date.now();

      setHistory([
        {
          time: "0s",
          equity,
          buyingPower,
          timestamp: now,
        },
      ]);
      
      setHasInitialized(true);
      console.log('[LiveChart] Initialized with default values (no positions)');
      return;
    }
    
    // Use initial prices from database if available
    const pricesToUse = initialPrices && Object.keys(initialPrices).length > 0 
      ? initialPrices 
      : Object.keys(livePrices).length > 0 
        ? livePrices 
        : null;

    if (!pricesToUse) return;

    const { equity, buyingPower } = computePortfolioValues(pricesToUse);
    const now = Date.now();

    setHistory([
      {
        time: "0s",
        equity,
        buyingPower,
        timestamp: now,
      },
    ]);
    
    setHasInitialized(true);
    console.log('[LiveChart] Initialized with', Object.keys(pricesToUse).length > 0 && Object.keys(livePrices).length === 0 ? 'database' : 'live', 'prices');
  }, [hasInitialized, initialPrices, livePrices, computePortfolioValues, positions.length]);

  // 🕒 Update chart data when live prices change (websocket updates)
  useEffect(() => {
    // Skip if not initialized yet or no live prices
    if (!hasInitialized || Object.keys(livePrices).length === 0) return;

    const { equity, buyingPower } = computePortfolioValues(livePrices);
    const now = Date.now();
    const secondsElapsed = Math.floor((now - sessionStart) / 1000);

    setHistory((prev) => {
      const filtered = prev.filter((p) => now - p.timestamp < 60000); // keep 60s
      return [
        ...filtered,
        {
          time: `${secondsElapsed}s`,
          equity,
          buyingPower,
          timestamp: now,
        },
      ];
    });
  }, [livePrices, computePortfolioValues, sessionStart, hasInitialized]);

  // 📊 Smart Y-axis scaling
  const yAxisDomain = useMemo(() => {
    if (history.length === 0) return ["auto", "auto"];

    const recent = history.slice(-30);
    const values = recent.map((d) => d.equity);
    if (values.length === 0) return ["auto", "auto"];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const last = values[values.length - 1] ?? min;

    // Tiny movement (<0.2%) — zoom in tightly
    if (max - min < last * 0.002) {
      const range = last * 0.002;
      return [last - range, last + range];
    }

    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [history]);

  // 🧾 Value change summary
  const current = history[history.length - 1];
  const first = history[0];
  const valueChange = useMemo(() => {
    if (!first || !current) return { amount: 0, pct: 0 };
    const diff = current.equity - first.equity;
    const pct = (diff / first.equity) * 100;
    return { amount: diff, pct };
  }, [history]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle className="flex items-center gap-2">
              {isWebSocketConnected && Object.keys(livePrices).length > 0 ? "Live Portfolio Value" : "Portfolio Value"}
              {portfolioLeverage > 1 && (
                <span className="text-muted-foreground text-sm font-normal">
                  ({portfolioLeverage}× leverage)
                </span>
              )}
              {isWebSocketConnected && Object.keys(livePrices).length > 0 && (
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" title="Live updates active" />
              )}
            </CardTitle>

            <CardDescription>
              {current?.equity
                ? `$${current.equity.toFixed(2)}`
                : "Waiting for live data..."}
              {history.length >= 2 && (
                <span
                  className={`ml-2 font-semibold ${
                    valueChange.amount >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {valueChange.amount >= 0 ? "+" : ""}$
                  {valueChange.amount.toFixed(2)} ({valueChange.pct.toFixed(2)}
                  %)
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
              <span className="sr-only">Toggle chart</span>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            {history.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <div className="mb-2 h-8 w-8 mx-auto animate-spin rounded-full border-4 border-muted border-t-primary" />
                  <p className="text-sm">Loading portfolio data...</p>
                  <p className="mt-1 text-xs">
                    Initializing chart with current prices
                  </p>
                </div>
              </div>
            ) : (
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px] w-full"
              >
                <AreaChart data={history}>
                  <defs>
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
                  </defs>

                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                  />
                  <YAxis domain={yAxisDomain} hide />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(v) => `Time: ${v}`}
                        indicator="dot"
                      />
                    }
                  />
                  {/* 🟦 Buying Power */}
                  <Area
                    dataKey="buyingPower"
                    type="monotone"
                    fill="url(#fillBuyingPower)"
                    stroke="var(--color-buyingPower)"
                    fillOpacity={0.3}
                  />
                  {/* 🟩 Equity */}
                  <Area
                    dataKey="equity"
                    type="monotone"
                    fill="url(#fillEquity)"
                    stroke="var(--color-equity)"
                    fillOpacity={0.3}
                  />
                  <ChartLegend
                    content={<ChartLegendContent className="mt-4" />}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
