import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AgentReportsService } from "~/lib/database/agent-reports";
import { auth } from "~/lib/auth";

interface ReportSearchResult {
  sessionId: string;
  ticker: string;
  analysisDate: Date;
  name: string;
  recommendation: string;
}

interface ReportSearchResponse {
  reports: ReportSearchResult[];
  total: number;
  page: number;
  limit: number;
}

export async function GET(request: NextRequest) {
  try {
    // Get the session from the request
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100); // Max 100 results per page

    // Validate pagination parameters
    if (page < 1) {
      return NextResponse.json(
        { error: "Page must be greater than 0" },
        { status: 400 }
      );
    }

    if (limit < 1) {
      return NextResponse.json(
        { error: "Limit must be greater than 0" },
        { status: 400 }
      );
    }

    // Fetch all user's reports first
    const allReports = await AgentReportsService.getAgentReports(session.user.id);

    // Filter reports based on search query
    let filteredReports = allReports;
    
    if (query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      filteredReports = allReports.filter((report) => {
        // Create searchable text combining ticker, recommendation, and formatted name
        const formattedName = `${report.ticker} ${report.analysisDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`;
        
        const searchableText = [
          report.ticker,
          report.recommendation,
          formattedName,
        ].join(" ").toLowerCase();

        return searchableText.includes(searchTerm);
      });
    }

    // Calculate pagination
    const total = filteredReports.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReports = filteredReports.slice(startIndex, endIndex);

    // Format reports for response
    const formattedReports: ReportSearchResult[] = paginatedReports.map((report) => ({
      sessionId: report.sessionId,
      ticker: report.ticker,
      analysisDate: report.analysisDate,
      name: `${report.ticker} ${report.analysisDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`,
      recommendation: report.recommendation,
    }));

    const response: ReportSearchResponse = {
      reports: formattedReports,
      total,
      page,
      limit,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error searching reports:", error);
    return NextResponse.json(
      { error: "Failed to search reports" },
      { status: 500 }
    );
  }
}