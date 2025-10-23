import { NextRequest, NextResponse } from "next/server";
import { AgentReportsService } from "~/lib/database/agent-reports";
import { auth } from "~/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Get the session from the request
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Fetch the full report content
    const reportData = await AgentReportsService.getReportBySessionId(
      sessionId,
      session.user.id
    );

    if (!reportData) {
      return NextResponse.json(
        { error: "Report not found or not accessible" },
        { status: 404 }
      );
    }

    // Format report content for OpenAI context usage
    const formattedContent = formatReportForContext(reportData);

    return NextResponse.json({
      sessionId: reportData.session_id,
      content: formattedContent,
    });
  } catch (error) {
    console.error("Error fetching report content:", error);
    return NextResponse.json(
      { error: "Failed to fetch report content" },
      { status: 500 }
    );
  }
}

/**
 * Format report data into a structured text format for OpenAI context
 */
function formatReportForContext(reportData: any): string {
  const sections = [];

  // Basic info
  sections.push(`Stock Analysis Report for ${reportData.ticker}`);
  sections.push(`Analysis Date: ${reportData.date}`);
  sections.push(`Final Recommendation: ${reportData.analysis.recommendation_type}`);
  sections.push("");

  // Market Analysis
  if (reportData.analysis.market_report) {
    sections.push("=== MARKET ANALYSIS ===");
    sections.push(reportData.analysis.market_report);
    sections.push("");
  }

  // News Analysis
  if (reportData.analysis.news_report) {
    sections.push("=== NEWS ANALYSIS ===");
    sections.push(reportData.analysis.news_report);
    sections.push("");
  }

  // Fundamentals Analysis
  if (reportData.analysis.fundamentals_report) {
    sections.push("=== FUNDAMENTALS ANALYSIS ===");
    sections.push(reportData.analysis.fundamentals_report);
    sections.push("");
  }

  // Social Sentiment
  if (reportData.analysis.sentiment_report) {
    sections.push("=== SOCIAL SENTIMENT ANALYSIS ===");
    sections.push(reportData.analysis.sentiment_report);
    sections.push("");
  }

  // Investment Debate
  if (reportData.analysis.investment_debate) {
    sections.push("=== INVESTMENT DEBATE ===");
    if (reportData.analysis.investment_debate.bull_analysis) {
      sections.push("Bull Case:");
      sections.push(reportData.analysis.investment_debate.bull_analysis);
      sections.push("");
    }
    if (reportData.analysis.investment_debate.bear_analysis) {
      sections.push("Bear Case:");
      sections.push(reportData.analysis.investment_debate.bear_analysis);
      sections.push("");
    }
    if (reportData.analysis.investment_debate.judge_decision) {
      sections.push("Investment Decision:");
      sections.push(reportData.analysis.investment_debate.judge_decision);
      sections.push("");
    }
  }

  // Risk Assessment
  if (reportData.analysis.risk_assessment) {
    sections.push("=== RISK ASSESSMENT ===");
    if (reportData.analysis.risk_assessment.risky_analysis) {
      sections.push("High Risk Analysis:");
      sections.push(reportData.analysis.risk_assessment.risky_analysis);
      sections.push("");
    }
    if (reportData.analysis.risk_assessment.safe_analysis) {
      sections.push("Conservative Analysis:");
      sections.push(reportData.analysis.risk_assessment.safe_analysis);
      sections.push("");
    }
    if (reportData.analysis.risk_assessment.neutral_analysis) {
      sections.push("Balanced Analysis:");
      sections.push(reportData.analysis.risk_assessment.neutral_analysis);
      sections.push("");
    }
    if (reportData.analysis.risk_assessment.judge_decision) {
      sections.push("Risk Assessment Decision:");
      sections.push(reportData.analysis.risk_assessment.judge_decision);
      sections.push("");
    }
  }

  // Trader Plan
  if (reportData.analysis.trader_plan) {
    sections.push("=== TRADING PLAN ===");
    sections.push(reportData.analysis.trader_plan);
    sections.push("");
  }

  // Final Analysis
  if (reportData.analysis.final_recommendation) {
    sections.push("=== FINAL ANALYSIS ===");
    sections.push(reportData.analysis.final_recommendation);
  }

  return sections.join("\n");
}