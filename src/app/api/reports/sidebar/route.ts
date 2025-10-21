import { NextRequest, NextResponse } from "next/server";
import { AgentReportsService } from "~/lib/database/agent-reports";
import { auth } from "~/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Get the session from the request
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    // Fetch sidebar reports for the authenticated user
    const reports = await AgentReportsService.getRecentReportsForSidebar(
      session.user.id,
      limit,
    );

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error fetching sidebar reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the session from the request
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    // Update the viewedAt timestamp for the report to move it to top
    // This is handled by the getReportBySessionId method which updates viewedAt
    await AgentReportsService.getReportBySessionId(sessionId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating report access:", error);
    return NextResponse.json(
      { error: "Failed to update report access" },
      { status: 500 },
    );
  }
}
