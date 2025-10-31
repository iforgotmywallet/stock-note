import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { env } from "~/env";

export async function GET(request: NextRequest) {
  try {
    // Get the session from the request
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // Validate authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    // Validate that Finnhub API key is configured
    if (!env.FINNHUB_API_KEY) {
      console.error("FINNHUB_API_KEY is not configured");
      return NextResponse.json(
        { error: "WebSocket service is not configured" },
        { status: 500 }
      );
    }

    // Return WebSocket URL and token
    return NextResponse.json({
      token: env.FINNHUB_API_KEY,
      wsUrl: "wss://ws.finnhub.io",
    });
  } catch (error) {
    console.error("Error fetching WebSocket token:", error);
    return NextResponse.json(
      { error: "Failed to fetch WebSocket token" },
      { status: 500 }
    );
  }
}
