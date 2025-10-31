import { type NextRequest, NextResponse } from "next/server";
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

    // Fetch user's available reports
    const reports = await AgentReportsService.getAgentReports(session.user.id);

    // Format reports for chat interface
    const formattedReports = reports.map((report) => ({
      sessionId: report.sessionId,
      ticker: report.ticker,
      analysisDate: report.analysisDate,
      name: `${report.ticker} ${report.analysisDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`,
      recommendation: report.recommendation,
    }));

    return NextResponse.json({ reports: formattedReports });
  } catch (error) {
    console.error("Error fetching reports for chat:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 },
    );
  }
}