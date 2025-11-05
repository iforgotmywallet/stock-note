import { NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { PortfoliosService } from "~/lib/database/portfolios";

export async function GET() {
  try {
    // Get user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get portfolio count for user
    const count = await PortfoliosService.getPortfolioCount(session.user.id);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching portfolio count:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio count" },
      { status: 500 }
    );
  }
}
