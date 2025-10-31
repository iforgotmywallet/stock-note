"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { DollarSign } from "lucide-react";

/**
 * Complete dashboard skeleton loader
 */
export function PortfolioDashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-9" />
        <div>
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-32 h-4" />
        </div>
      </div>

      {/* Performance summary skeleton */}
      <PerformanceSummarySkeleton />

      {/* Holdings table skeleton */}
      <div className="space-y-4">
        <Skeleton className="w-32 h-6" />
        <HoldingsTableSkeleton />
      </div>

      {/* Recent actions skeleton */}
      <RecentActionsSkeleton />
    </div>
  );
}

/**
 * Performance summary card skeleton
 */
export function PerformanceSummarySkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Performance Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center p-4 bg-gray-50 dark:bg-secondary rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="w-20 h-4" />
              </div>
              <Skeleton className="w-24 h-8 mx-auto mb-1" />
              <Skeleton className="w-16 h-3 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Holdings table skeleton
 */
export function HoldingsTableSkeleton() {
  return (
    <div className="bg-white dark:bg-secondary rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Ticker', 'Shares', 'Avg Cost', 'Last Price', 'P/L', 'P/L %'].map((header) => (
                <th key={header} className="px-6 py-3 text-left">
                  <Skeleton className="w-16 h-4" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-secondary divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-6 py-4">
                    <Skeleton className={`h-4 ${j === 0 ? 'w-12' : j === 1 ? 'w-16' : 'w-20'}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Recent actions table skeleton
 */
export function RecentActionsSkeleton() {
  return (
    <div className="bg-white dark:bg-secondary rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <Skeleton className="w-32 h-6" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Date', 'Ticker', 'Action', 'Shares', 'Price', 'Note'].map((header) => (
                <th key={header} className="px-6 py-3 text-left">
                  <Skeleton className="w-16 h-4" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-secondary divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-6 py-4">
                    <Skeleton className={`h-4 ${j === 2 ? 'w-12' : j === 5 ? 'w-32' : 'w-20'}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Compact performance summary skeleton for loading states
 */
export function CompactPerformanceSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="text-center p-3 bg-gray-50 dark:bg-secondary rounded-lg">
          <Skeleton className="w-16 h-3 mx-auto mb-2" />
          <Skeleton className="w-20 h-6 mx-auto mb-1" />
          <Skeleton className="w-12 h-3 mx-auto" />
        </div>
      ))}
    </div>
  );
}

/**
 * Minimal table skeleton for quick loading
 */
export function MinimalTableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="w-12 h-4" />
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
      ))}
    </div>
  );
}