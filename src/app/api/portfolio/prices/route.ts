import { type NextRequest, NextResponse } from "next/server";
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
 * GET /api/portfolio/prices?ticker=AAPL
 * Fetch current stock price from Finnhub API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");

    if (!ticker) {
      return NextResponse.json(
        { error: "Ticker parameter is required" },
        { status: 400 }
      );
    }

    // Validate ticker format (basic validation)
    if (typeof ticker !== "string" || ticker.length > 10 || !/^[A-Z0-9.-]+$/i.test(ticker)) {
      return NextResponse.json(
        { error: "Invalid ticker format" },
        { status: 400 }
      );
    }

    // Fetch price from Finnhub API
    const finnhubResponse = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker.toUpperCase()}&token=${env.FINNHUB_API_KEY}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add timeout and cache control
        next: { revalidate: 60 }, // Cache for 1 minute
      }
    );

    // Check if Finnhub API request was successful
    if (!finnhubResponse.ok) {
      console.error("Finnhub API request failed:", {
        status: finnhubResponse.status,
        statusText: finnhubResponse.statusText,
        ticker,
      });

      let errorMessage = "Failed to fetch stock price";
      if (finnhubResponse.status === 401 || finnhubResponse.status === 403) {
        errorMessage = "API authentication failed";
      } else if (finnhubResponse.status === 429) {
        errorMessage = "Rate limit exceeded";
      } else if (finnhubResponse.status >= 500) {
        errorMessage = "Stock price service temporarily unavailable";
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: finnhubResponse.status }
      );
    }

    // Parse the Finnhub API response
    const priceData: FinnhubQuoteResponse = await finnhubResponse.json();

    // Validate the response data
    if (
      typeof priceData.c !== "number" ||
      priceData.c === null ||
      priceData.c === undefined ||
      isNaN(priceData.c) ||
      priceData.c <= 0
    ) {
      console.error("Invalid price data from Finnhub:", {
        priceData,
        ticker,
      });

      return NextResponse.json(
        { error: "Invalid price data received" },
        { status: 502 }
      );
    }

    // Return the price data
    return NextResponse.json(priceData, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });

  } catch (error) {
    console.error("Error in price API route:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}