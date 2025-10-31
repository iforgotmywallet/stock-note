import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { PortfoliosService } from "~/lib/database/portfolios";

/**
 * GET /api/portfolio/[portfolioId]/actions?limit=10
 * Fetch portfolio actions with optional limit
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 }
      );
    }

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

    // Get portfolio actions
    const actions = await PortfoliosService.getPortfolioActions(portfolioId, limit);

    return NextResponse.json(actions, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });

  } catch (error) {
    console.error("Error in portfolio actions API:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}