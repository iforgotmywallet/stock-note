"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";

interface PortfolioDashboardErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface PortfolioDashboardErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Portfolio dashboard specific error boundary component
 */
export class PortfolioDashboardErrorBoundary extends React.Component<
  PortfolioDashboardErrorBoundaryProps,
  PortfolioDashboardErrorBoundaryState
> {
  constructor(props: PortfolioDashboardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(
    error: Error,
  ): PortfolioDashboardErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      "Portfolio dashboard error caught by boundary:",
      error,
      errorInfo,
    );

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            resetError={this.resetError}
          />
        );
      }

      // Default portfolio dashboard error UI
      return (
        <PortfolioDashboardErrorFallback
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Portfolio dashboard specific error fallback component
 */
export function PortfolioDashboardErrorFallback({
  error,
  resetError,
}: {
  error?: Error;
  resetError: () => void;
}) {
  const isPortfolioNotFound =
    error?.message?.includes("not found") ||
    error?.message?.includes("access denied");
  const isDataFetchError =
    error?.message?.includes("fetch") || error?.message?.includes("network");
  const isDatabaseError =
    error?.message?.includes("database") ||
    error?.message?.includes("Database");

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-lg font-semibold text-red-900 dark:text-red-100">
              {isPortfolioNotFound ? "Portfolio Not Found" : "Dashboard Error"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            {isPortfolioNotFound && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  The portfolio you're looking for doesn't exist or you don't
                  have access to it.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Please check the URL or return to your portfolio list.
                </p>
              </div>
            )}

            {isDataFetchError && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Unable to load portfolio data. This might be a temporary
                  network issue.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Please check your internet connection and try again.
                </p>
              </div>
            )}

            {isDatabaseError && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  There was a database connection issue. Our team has been
                  notified.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Please try again in a few moments.
                </p>
              </div>
            )}

            {!isPortfolioNotFound && !isDataFetchError && !isDatabaseError && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  An unexpected error occurred while loading the portfolio
                  dashboard.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Please try refreshing the page or contact support if the
                  problem persists.
                </p>
              </div>
            )}

            {error && process.env.NODE_ENV === "development" && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                  Error Details (Development)
                </summary>
                <pre className="dark:bg-secondary mt-2 max-h-32 overflow-auto rounded bg-gray-100 p-2 text-xs text-gray-800 dark:text-gray-200">
                  {error.message}
                  {error.stack && `\n\n${error.stack.slice(0, 500)}...`}
                </pre>
              </details>
            )}

            <div className="flex flex-wrap justify-center gap-2">
              {!isPortfolioNotFound && (
                <Button
                  onClick={resetError}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              )}

              <Button
                onClick={() => window.location.reload()}
                variant={isPortfolioNotFound ? "outline" : "default"}
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </Button>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Link href="/portfolio">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Portfolios
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Performance summary specific error fallback
 */
export function PerformanceSummaryErrorFallback({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          Performance Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-6 text-center">
          <div className="mb-4 text-red-600 dark:text-red-400">
            <AlertTriangle className="mx-auto mb-2 h-12 w-12" />
            <p className="font-medium">Failed to load performance data</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {error}
            </p>
          </div>
          <Button
            onClick={onRetry}
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Holdings table specific error fallback
 */
export function HoldingsTableErrorFallback({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="dark:bg-secondary rounded-lg bg-white shadow">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Current Holdings
        </h2>
      </div>
      <div className="p-6">
        <div className="py-8 text-center">
          <div className="mb-4 text-red-600 dark:text-red-400">
            <AlertTriangle className="mx-auto mb-2 h-12 w-12" />
            <p className="font-medium">Failed to load holdings data</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {error}
            </p>
          </div>
          <Button
            onClick={onRetry}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Recent actions specific error fallback
 */
export function RecentActionsErrorFallback({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="dark:bg-secondary rounded-lg bg-white shadow">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recent Trades
        </h2>
      </div>
      <div className="p-6">
        <div className="py-8 text-center">
          <div className="mb-4 text-red-600 dark:text-red-400">
            <AlertTriangle className="mx-auto mb-2 h-12 w-12" />
            <p className="font-medium">Failed to load trading actions</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {error}
            </p>
          </div>
          <Button
            onClick={onRetry}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
