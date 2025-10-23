"use server";

import { inngest } from "~/inngest/client";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { generateSessionId } from "~/lib/utils/session-id-generator";
import { AgentReportsService } from "~/lib/database/agent-reports";

interface QueueAnalysisParams {
  ticker: string;
  date: string;
  analysts: string[];
  published: boolean;
}

interface QueueAnalysisResult {
  success: boolean;
  message: string;
  sessionId?: string;
  reportId?: string;
  eventId?: string;
  error?: string;
}

export async function queueAnalysisReport(params: QueueAnalysisParams): Promise<QueueAnalysisResult> {
  try {
    // Validate input parameters
    if (!params.ticker || typeof params.ticker !== "string") {
      return {
        success: false,
        message: "Invalid ticker symbol provided",
        error: "Ticker must be a non-empty string",
      };
    }

    if (!params.date || typeof params.date !== "string") {
      return {
        success: false,
        message: "Invalid analysis date provided",
        error: "Date must be a non-empty string in YYYY-MM-DD format",
      };
    }

    if (!Array.isArray(params.analysts) || params.analysts.length === 0) {
      return {
        success: false,
        message: "At least one analyst must be selected",
        error: "Analysts array must contain at least one analyst",
      };
    }

    // Get the current user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      redirect("/auth/sign-in");
    }

    // Generate unique session ID with proper error handling
    let sessionId: string;
    try {
      sessionId = generateSessionId(params.ticker, params.date);
    } catch (sessionError) {
      return {
        success: false,
        message: "Failed to generate session ID",
        error: sessionError instanceof Error ? sessionError.message : "Invalid ticker or date format",
      };
    }

    // Create database record immediately with "queued" status
    let report;
    try {
      report = await AgentReportsService.createQueuedReport({
        sessionId,
        ticker: params.ticker,
        analysisDate: new Date(params.date),
        userId: session.user.id,
        published: params.published,
        analystTeams: params.analysts,
      });
      
      console.log("Created report with status:", report.status, "for session:", sessionId);
    } catch (dbError) {
      return {
        success: false,
        message: "Failed to create analysis record",
        error: dbError instanceof Error ? dbError.message : "Database operation failed",
      };
    }

    // Only send Inngest event after successful database creation
    let result;
    try {
      result = await inngest.send({
        name: "generate-analysis-event",
        data: {
          sessionId, // Include session ID in the event data
          ticker: params.ticker,
          date: params.date,
          analysts: params.analysts,
          userId: session.user.id,
          published: params.published,
        },
      });
    } catch (inngestError) {
      // If Inngest fails, we should update the report status to failed
      try {
        await AgentReportsService.updateReportStatus(sessionId, "failed");
      } catch (updateError) {
        console.error("Failed to update report status after Inngest failure:", updateError);
      }
      
      return {
        success: false,
        message: "Failed to queue analysis for processing",
        error: inngestError instanceof Error ? inngestError.message : "Event queue service unavailable",
      };
    }

    return {
      success: true,
      message: "Analysis queued successfully",
      sessionId,
      reportId: report.id,
      eventId: result.ids[0],
    };
  } catch (error) {
    console.error("Unexpected error in queueAnalysisReport:", error);
    return {
      success: false,
      message: "An unexpected error occurred",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
