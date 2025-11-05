import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { PortfoliosService } from "~/lib/database/portfolios";
import { env } from "~/env";
import type { PortfolioPositionWithMetrics } from "~/lib/database/portfolios";

interface FinnhubQuoteResponse {
  c: number; // Current price
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

/**
 * Fetch live price from Finnhub API with error handling
 */
async function fetchLivePrice(ticker: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker.toUpperCase()}&token=${env.FINNHUB_API_KEY}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Short timeout for live price fetching
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch live price for ${ticker}: ${response.status}`);
      return null;
    }

    const priceData: FinnhubQuoteResponse = await response.json();

    // Validate price data
    if (
      typeof priceData.c !== "number" ||
      priceData.c === null ||
      priceData.c === undefined ||
      isNaN(priceData.c) ||
      priceData.c <= 0
    ) {
      console.warn(`Invalid price data for ${ticker}:`, priceData);
      return null;
    }

    return priceData.c;
  } catch (error) {
    console.warn(`Error fetching live price for ${ticker}:`, error);
    return null;
  }
}

/**
 * Calculate P&L with live or fallback price
 */
function calculateProfitLoss(
  shares: number,
  avgCost: number,
  currentPrice: number
): { profit_loss: number; profit_loss_pct: number } {
  let profit_loss = 0;
  let profit_loss_pct = 0;

  if (shares !== 0 && currentPrice > 0) {
    if (shares > 0) {
      // Long position: profit when price goes up
      const currentValue = shares * currentPrice;
      const costBasis = shares * avgCost;
      profit_loss = currentValue - costBasis;
      profit_loss_pct = costBasis > 0 ? (profit_loss / costBasis) * 100 : 0;
    } else {
      // Short position: profit when price goes down
      const shares_abs = Math.abs(shares);
      const currentValue = shares_abs * currentPrice;
      const costBasis = shares_abs * avgCost;
      profit_loss = costBasis - currentValue; // Inverted for short positions
      profit_loss_pct = costBasis > 0 ? (profit_loss / costBasis) * 100 : 0;
    }
  }

  return { profit_loss, profit_loss_pct };
}

/**
 * GET /api/portfolio/[portfolioId]/positions
 * Fetch portfolio positions with live prices and updated P&L calculations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { portfolioId: string } }
) {
  try {
    // Get user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { portfolioId } = params;

    // Verify portfolio ownership
    const isOwner = await PortfoliosService.verifyPortfolioOwnership(
      portfolioId,
      session.user.id
    );

    if (!isOwner) {
      return NextResponse.json(
        { error: "Portfolio not found or access denied" },
        { status: 404 }
      );
    }

    // Get positions with stored prices
    const positions = await PortfoliosService.getPortfolioPositions(portfolioId);

    // Get unique tickers for batch price fetching
    const uniqueTickers = [...new Set(positions.map(p => p.ticker))];

    // Fetch live prices for all tickers in parallel
    const livePricePromises = uniqueTickers.map(async (ticker) => {
      const livePrice = await fetchLivePrice(ticker);
      return { ticker, livePrice };
    });

    const livePriceResults = await Promise.all(livePricePromises);
    const livePriceMap = new Map(
      livePriceResults.map(({ ticker, livePrice }) => [ticker, livePrice])
    );

    // Update positions with live prices and recalculate P&L
    const updatedPositions: PortfolioPositionWithMetrics[] = positions.map((position) => {
      const livePrice = livePriceMap.get(position.ticker);
      
      // Use live price if available, otherwise fall back to stored price
      const currentPrice = livePrice ?? position.last_price ?? 0;
      
      // Recalculate P&L with current price
      const { profit_loss, profit_loss_pct } = calculateProfitLoss(
        position.shares,
        position.avg_cost,
        currentPrice
      );

      return {
        ...position,
        last_price: currentPrice, // Update with live price
        profit_loss,
        profit_loss_pct,
        // Add metadata about price source
        price_source: livePrice ? ('live' as const) : ('http' as const),
        price_updated_at: livePrice ? new Date() : position.updated_at,
      };
    });

    return NextResponse.json({
      positions: updatedPositions,
    }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });

  } catch (error) {
    console.error("Error in portfolio positions API:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}