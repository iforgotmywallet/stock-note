import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { env } from "~/env";

interface FinnhubQuoteResponse {
  c: number; // Current price
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

/**
 * GET /api/portfolio/prices?tickers=AAPL,MSFT,GOOGL
 * Fetch current stock prices from Finnhub API for multiple tickers
 * Requires authentication to prevent API key abuse
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get("tickers");

    if (!tickersParam) {
      return NextResponse.json(
        { error: "Tickers parameter is required" },
        { status: 400 },
      );
    }

    // Parse comma-separated tickers
    const tickers = tickersParam
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    if (tickers.length === 0) {
      return NextResponse.json(
        { error: "At least one ticker is required" },
        { status: 400 },
      );
    }

    if (tickers.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 tickers allowed per request" },
        { status: 400 },
      );
    }

    // Validate ticker formats
    const invalidTickers = tickers.filter(
      (ticker) => ticker.length > 10 || !/^[A-Z0-9.-]+$/.test(ticker),
    );

    if (invalidTickers.length > 0) {
      return NextResponse.json(
        { error: `Invalid ticker format: ${invalidTickers.join(", ")}` },
        { status: 400 },
      );
    }

    // Fetch prices sequentially with 1 second delay between each request
    // Free tier: 60 calls/minute = 1 call per second max
    const results: Array<{
      ticker: string;
      price: number | null;
      timestamp?: number;
      error: string | null;
    }> = [];

    for (const ticker of tickers) {

      try {
        const finnhubResponse = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${env.FINNHUB_API_KEY}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(5000), // 5 second timeout per request
          },
        );

        if (!finnhubResponse.ok) {
          const errorType =
            finnhubResponse.status === 429 ? "Rate limited" : "Failed to fetch";
          console.warn(
            `Failed to fetch price for ${ticker}:`,
            finnhubResponse.status,
            errorType,
          );
          results.push({ ticker, price: null, error: errorType });
          continue;
        }

        const priceData: FinnhubQuoteResponse = await finnhubResponse.json();

        // Validate the response data
        if (
          typeof priceData.c !== "number" ||
          priceData.c === null ||
          priceData.c === undefined ||
          isNaN(priceData.c) ||
          priceData.c <= 0
        ) {
          console.warn(`Invalid price data for ${ticker}:`, priceData);
          results.push({ ticker, price: null, error: "Invalid price data" });
          continue;
        }

        results.push({
          ticker,
          price: priceData.c,
          timestamp: Date.now(),
          error: null,
        });
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Request failed";
        console.warn(`Error fetching price for ${ticker}:`, errorMsg);
        results.push({ ticker, price: null, error: errorMsg });
      }
    }

    // Build response object with prices keyed by ticker
    const prices: Record<string, number | null> = {};
    const timestamps: Record<string, number> = {};
    const errors: Record<string, string> = {};

    results.forEach((result) => {
      prices[result.ticker] = result.price;
      if (result.timestamp) timestamps[result.ticker] = result.timestamp;
      if (result.error) errors[result.ticker] = result.error;
    });

    return NextResponse.json(
      {
        prices,
        timestamps,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("Error in price API route:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
