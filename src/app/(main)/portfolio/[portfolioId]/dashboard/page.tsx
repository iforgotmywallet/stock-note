import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import { PortfoliosService } from "~/lib/database/portfolios";

import { BackButton } from "~/components/back-button";
import { RefreshButton } from "~/components/refresh-button";
import { 
  PortfolioDashboardErrorBoundary, 
  PortfolioDashboardErrorFallback 
} from "~/components/portfolio-dashboard-error-boundary";
import { PortfolioDashboardSkeleton } from "~/components/portfolio-dashboard-skeleton";
import { PortfolioDashboardClient } from "~/components/portfolio-dashboard-client";
import type { 
  PortfolioWithTickers, 
  PortfolioPositionWithMetrics, 
  PortfolioActionWithDetails
} from "~/lib/database/portfolios";

// Force dynamic rendering since we need user session and real-time data
export const dynamic = "force-dynamic";

interface PageProps {
  params: {
    portfolioId: string;
  };
}

interface DashboardData {
  portfolio: PortfolioWithTickers;
  positions: PortfolioPositionWithMetrics[];
  actions: PortfolioActionWithDetails[];
  dailyValues: Array<{
    date: Date;
    net_value: number;
    cash_balance: number | null;
    long_value: number | null;
    short_value: number | null;
  }>;
}

/**
 * Fetch all dashboard data with proper error handling
 */
async function getDashboardData(portfolioId: string, userId: string): Promise<DashboardData> {
  try {
    // Verify portfolio ownership first
    const isOwner = await PortfoliosService.verifyPortfolioOwnership(portfolioId, userId);
    if (!isOwner) {
      throw new Error("Portfolio not found or access denied");
    }

    // Fetch portfolio details
    const portfolio = await PortfoliosService.getPortfolioById(portfolioId, userId);
    if (!portfolio) {
      throw new Error("Portfolio not found");
    }

    // Fetch all dashboard data in parallel for better performance
    const [positions, actions, dailyValues] = await Promise.all([
      PortfoliosService.getPortfolioPositions(portfolioId),
      PortfoliosService.getPortfolioActions(portfolioId, 10),
      PortfoliosService.getPortfolioDailyValues(portfolioId),
    ]);

    return {
      portfolio,
      positions,
      actions,
      dailyValues,
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error;
  }
}

/**
 * Dashboard content component with error boundaries
 */
function DashboardContent({ data }: { data: DashboardData }) {
  const { portfolio, positions, actions, dailyValues } = data;

  return (
    <PortfolioDashboardErrorBoundary>
      <div className="container mx-auto px-4 py-2 space-y-6">
        {/* Header with back button, portfolio name, and refresh button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton 
              href="/portfolio" 
              label="Back"
              useBrowserHistory={true}
            />
            <div>
              <h1 className="text-2xl font-bold">{portfolio.name}</h1>
              {portfolio.description && (
                <p className="text-sm text-muted-foreground">{portfolio.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-muted-foreground">
                  {portfolio.tickers.length} tickers • {portfolio.allocation_per_ticker * 100}% allocation • {portfolio.leverage}x leverage
                </span>
              </div>
            </div>
          </div>
          <RefreshButton 
            label="Refresh Data"
            variant="outline"
            size="sm"
          />
        </div>

        {/* Dashboard Components with Error Boundaries and Loading States */}
        <PortfolioDashboardClient 
          portfolioId={portfolio.id}
          portfolioName={portfolio.name}
          portfolioLeverage={portfolio.leverage}
          portfolioTickers={portfolio.tickers.map(t => t.ticker)}
          initialPositions={positions}
          initialActions={actions}
          dailyValues={dailyValues}
        />
      </div>
    </PortfolioDashboardErrorBoundary>
  );
}

/**
 * Loading component for dashboard
 */
function DashboardLoading() {
  return <PortfolioDashboardSkeleton />;
}

/**
 * Error component for dashboard
 */
function DashboardError({ error }: { error: string }) {
  return (
    <PortfolioDashboardErrorFallback 
      error={new Error(error)} 
      resetError={() => window.location.reload()} 
    />
  );
}

/**
 * Main portfolio dashboard page component
 */
export default async function PortfolioDashboardPage({ params }: PageProps) {
  // Get user session and redirect if not authenticated
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  try {
    // Fetch dashboard data
    const dashboardData = await getDashboardData(params.portfolioId, session.user.id);

    return (
      <Suspense fallback={<DashboardLoading />}>
        <DashboardContent data={dashboardData} />
      </Suspense>
    );
  } catch (error) {
    console.error("Portfolio dashboard error:", error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes("not found") || error.message.includes("access denied")) {
        notFound();
      }
      
      return <DashboardError error={error.message} />;
    }

    return <DashboardError error="An unexpected error occurred while loading the dashboard." />;
  }
}