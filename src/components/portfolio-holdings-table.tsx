"use client";

import * as React from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  IconTrendingDown,
  IconTrendingUp,
  IconMinus,
  IconArrowUp,
  IconArrowDown,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { EmptyPositionsState } from "~/components/portfolio-empty-states";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";

// Portfolio position type with calculated metrics
export interface PortfolioPositionWithMetrics {
  id: string;
  portfolioId: string;
  ticker: string;
  shares: number;
  avg_cost: number;
  debt_value: number;
  last_price: number | null;
  updated_at: Date;
  profit_loss: number;
  profit_loss_pct: number;
  price_source?: "live" | "stored";
  price_updated_at?: Date;
}

// Format currency values
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Format percentage values
const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

// Get color class for profit/loss values
const getProfitLossColor = (value: number): string => {
  if (value > 0) return "text-green-600 dark:text-green-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
};

// Get icon for profit/loss values
const getProfitLossIcon = (value: number) => {
  if (value > 0) return <IconTrendingUp className="size-4" />;
  if (value < 0) return <IconTrendingDown className="size-4" />;
  return <IconMinus className="size-4" />;
};

// Column definitions for the holdings table
const columns: ColumnDef<PortfolioPositionWithMetrics>[] = [
  {
    accessorKey: "ticker",
    header: ({ column }) => {
      return (
        <button
          className="hover:text-foreground flex items-center gap-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Ticker
          {column.getIsSorted() === "asc" ? (
            <IconArrowUp className="size-4" />
          ) : column.getIsSorted() === "desc" ? (
            <IconArrowDown className="size-4" />
          ) : null}
        </button>
      );
    },
    cell: ({ row }) => {
      const ticker = row.original.ticker;
      return <div className="font-mono font-medium">{ticker}</div>;
    },
    size: 100,
  },
  {
    accessorKey: "shares",
    header: () => <div className="text-right">Shares</div>,
    cell: ({ row }) => {
      const shares = row.original.shares;
      return (
        <div className="text-right">
          {shares.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          })}
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: "avg_cost",
    header: () => <div className="text-right">Avg Cost</div>,
    cell: ({ row }) => {
      const avgCost = row.original.avg_cost;
      return <div className="text-right">{formatCurrency(avgCost)}</div>;
    },
    size: 120,
  },
  {
    accessorKey: "last_price",
    header: () => <div className="text-right">Last Price</div>,
    cell: ({ row }) => {
      const lastPrice = row.original.last_price;
      const priceSource = row.original.price_source;
      const isLive = priceSource === "live";

      return (
        <div className="text-right">
          <div className="flex items-center justify-end gap-1">
            {lastPrice ? formatCurrency(lastPrice) : "—"}
            {priceSource && (
              <div
                className={`size-2 rounded-full ${
                  isLive ? "animate-pulse bg-green-500" : "bg-orange-500"
                }`}
                title={isLive ? "Live price" : "Stored price"}
              />
            )}
          </div>
        </div>
      );
    },
    size: 140,
  },
  {
    accessorKey: "profit_loss",
    header: ({ column }) => {
      return (
        <div className="text-right">
          <button
            className="hover:text-foreground ml-auto flex items-center gap-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            P/L
            {column.getIsSorted() === "asc" ? (
              <IconArrowUp className="size-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconArrowDown className="size-4" />
            ) : null}
          </button>
        </div>
      );
    },
    cell: ({ row }) => {
      const profitLoss = row.original.profit_loss;
      const colorClass = getProfitLossColor(profitLoss);
      const icon = getProfitLossIcon(profitLoss);

      return (
        <div
          className={cn(
            "flex items-center justify-end gap-1 text-right",
            colorClass,
          )}
        >
          {icon}
          {profitLoss >= 0 ? "+" : ""}
          {formatCurrency(profitLoss)}
        </div>
      );
    },
    size: 140,
  },
  {
    accessorKey: "profit_loss_pct",
    header: () => <div className="text-right">P/L %</div>,
    cell: ({ row }) => {
      const profitLossPct = row.original.profit_loss_pct;
      const colorClass = getProfitLossColor(profitLossPct);

      return (
        <div className={cn("text-right font-medium", colorClass)}>
          {profitLossPct >= 0 ? "+" : ""}
          {formatPercentage(profitLossPct)}
        </div>
      );
    },
    size: 100,
  },
];

interface PortfolioHoldingsTableProps {
  positions: PortfolioPositionWithMetrics[];
  className?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  portfolioName?: string;
}

export function PortfolioHoldingsTable({
  positions,
  className,
  loading = false,
  error = null,
  onRetry,
  portfolioName = "Portfolio",
}: PortfolioHoldingsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "ticker", desc: false }, // Default sort by ticker ascending
  ]);

  const table = useReactTable({
    data: positions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  // Loading state
  if (loading) {
    return (
      <div className={cn("rounded-lg border", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Avg Cost</TableHead>
              <TableHead className="text-right">Last Price</TableHead>
              <TableHead className="text-right">P/L</TableHead>
              <TableHead className="text-right">P/L %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("rounded-lg border", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Avg Cost</TableHead>
              <TableHead className="text-right">Last Price</TableHead>
              <TableHead className="text-right">P/L</TableHead>
              <TableHead className="text-right">P/L %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center">
                <div className="flex flex-col items-center gap-3 text-red-600">
                  <IconAlertTriangle className="size-12" />
                  <div className="space-y-1">
                    <div className="font-medium">Failed to load holdings</div>
                    <div className="text-sm text-gray-600">{error}</div>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="mt-2 rounded bg-red-100 px-3 py-1 text-xs text-red-700 transition-colors hover:bg-red-200"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state
  if (positions.length === 0) {
    return <EmptyPositionsState portfolioName={portfolioName} />;
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
