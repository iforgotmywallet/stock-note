import { NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { env } from "~/env";

/**
 * GET /api/portfolio/websocket-token
 * Get Finnhub WebSocket token for authenticated users
 * This endpoint ensures only authenticated users can access real-time price data
 */
export async function GET() {
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

    // Return WebSocket connection details
    // Note: Finnhub uses the same API key for both REST and WebSocket
    return NextResponse.json({
      token: env.FINNHUB_API_KEY,
      wsUrl: "wss://ws.finnhub.io",
    }, {
      headers: {
        // Don't cache this endpoint
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error in websocket token API:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
