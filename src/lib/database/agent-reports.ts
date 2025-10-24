import { db } from "~/server/db";
import type { agent_reports } from "@prisma/client";
import type { StockData } from "~/types/stock-data";

export interface AgentReportRow {
  id: string;
  ticker: string;
  analysisDate: Date;
  recommendation: string;
  status: "queued" | "processing" | "done" | "failed" | "NEC";
  published: boolean;
  analystTeams: string[];
  sessionId: string;
  userId: string;
}

export interface CreateQueuedReportParams {
  sessionId: string;
  ticker: string;
  analysisDate: Date;
  userId: string;
  published: boolean;
  analystTeams: string[];
}

export interface SidebarReportItem {
  sessionId: string;
  ticker: string;
  analysisDate: Date;
  updatedAt: Date;
  recommendation: string;
  status: string;
  name: string;
  url: string;
}

/**
 * Database service for agent reports operations
 */
export class AgentReportsService {
  /**
   * Fetch agent reports for a specific user with non-null recommendations
   * @param userId - User ID to filter reports
   * @returns Promise<AgentReportRow[]> - Array of transformed agent report rows
   */
  static async getAgentReports(userId: string): Promise<AgentReportRow[]> {
    try {
      const reports = await db.agent_reports.findMany({
        where: {
          userId,
          recommendation: {
            not: null,
          },
        },
        orderBy: {
          updated_at: "desc",
        },
      });

      return reports.map((report) => this.transformAgentReport(report));
    } catch (error) {
      console.error("Error fetching agent reports:", error);
      throw new Error("Failed to fetch agent reports");
    }
  }

  /**
   * Update the published status of an agent report
   * @param id - Report ID
   * @param published - New published status
   * @returns Promise<void>
   */
  static async updateReportPublished(
    id: string,
    published: boolean,
  ): Promise<void> {
    try {
      await db.agent_reports.update({
        where: { id },
        data: {
          published,
          updated_at: new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating report published status:", error);
      throw new Error("Failed to update report published status");
    }
  }

  /**
   * Delete an agent report
   * @param id - Report ID
   * @returns Promise<void>
   */
  static async deleteReport(id: string): Promise<void> {
    try {
      await db.agent_reports.delete({
        where: { id },
      });
    } catch (error) {
      console.error("Error deleting agent report:", error);
      throw new Error("Failed to delete agent report");
    }
  }



  /**
   * Transform database record to table row format
   * @param report - Raw agent report from database
   * @returns AgentReportRow - Transformed report data
   */
  private static transformAgentReport(report: agent_reports): AgentReportRow {
    return {
      id: report.id,
      ticker: report.ticker,
      analysisDate: report.analysis_date,
      recommendation: report.recommendation ?? "",
      status: report.status as AgentReportRow["status"],
      published: report.published,
      analystTeams: this.getAnalystTeams(report),
      sessionId: report.session_id,
      userId: report.userId,
    };
  }

  /**
   * Determine which analyst teams contributed to the report
   * @param report - Raw agent report from database
   * @returns string[] - Array of analyst team names
   */
  private static getAnalystTeams(report: agent_reports): string[] {
    const teams: string[] = [];

    if (report.market_analyst_report) teams.push("market");
    if (report.news_analyst_report) teams.push("news");
    if (report.fundamentals_analyst_report) teams.push("fundamentals");
    if (report.social_analyst_report) teams.push("social");

    return teams;
  }

  /**
   * Create a new report with "queued" status immediately
   * @param params - Parameters for creating the queued report
   * @returns Promise<AgentReportRow> - Created report data
   */
  static async createQueuedReport(
    params: CreateQueuedReportParams,
  ): Promise<AgentReportRow> {
    try {
      // Validate input parameters
      if (!params.sessionId || typeof params.sessionId !== "string") {
        throw new Error("Session ID is required and must be a string");
      }

      if (!params.ticker || typeof params.ticker !== "string") {
        throw new Error("Ticker is required and must be a string");
      }

      if (!params.userId || typeof params.userId !== "string") {
        throw new Error("User ID is required and must be a string");
      }

      if (!(params.analysisDate instanceof Date) || isNaN(params.analysisDate.getTime())) {
        throw new Error("Analysis date must be a valid Date object");
      }

      if (!Array.isArray(params.analystTeams)) {
        throw new Error("Analyst teams must be an array");
      }

      const report = await db.agent_reports.create({
        data: {
          session_id: params.sessionId,
          ticker: params.ticker,
          analysis_date: params.analysisDate,
          userId: params.userId,
          published: params.published,
          status: "queued",
        },
      });

      return this.transformAgentReport(report);
    } catch (error) {
      console.error("Error creating queued report:", error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes("unique constraint") || error.message.includes("UNIQUE")) {
          throw new Error("A report with this session ID already exists");
        }
        if (error.message.includes("foreign key") || error.message.includes("FOREIGN")) {
          throw new Error("Invalid user ID provided");
        }
        if (error.message.includes("validation") || error.message.includes("required")) {
          throw new Error(`Validation error: ${error.message}`);
        }
        // Re-throw validation errors as-is
        if (error.message.includes("is required") || error.message.includes("must be")) {
          throw error;
        }
      }
      
      throw new Error("Failed to create queued report - database error");
    }
  }

  /**
   * Update report status using session ID
   * @param sessionId - Session ID of the report to update
   * @param status - New status to set
   * @returns Promise<void>
   */
  static async updateReportStatus(
    sessionId: string,
    status: AgentReportRow["status"],
  ): Promise<void> {
    try {
      await db.agent_reports.update({
        where: { session_id: sessionId },
        data: {
          status,
          updated_at: new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating report status:", error);
      throw new Error("Failed to update report status");
    }
  }

  /**
   * Verify user ownership of a report before allowing modifications
   * @param reportId - Report ID
   * @param userId - User ID to verify ownership
   * @returns Promise<boolean> - True if user owns the report
   */
  static async verifyReportOwnership(
    reportId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const report = await db.agent_reports.findUnique({
        where: { id: reportId },
        select: { userId: true },
      });

      return report?.userId === userId;
    } catch (error) {
      console.error("Error verifying report ownership:", error);
      return false;
    }
  }

  /**
   * Fetch recent reports for sidebar display from recentList table
   * @param userId - User ID to filter reports
   * @param limit - Maximum number of reports to return (default: 10)
   * @returns Promise<SidebarReportItem[]> - Array of recent reports for sidebar
   */
  static async getRecentReportsForSidebar(
    userId: string,
    limit = 10,
  ): Promise<SidebarReportItem[]> {
    try {
      // Query from recentList table joined with agent_reports table
      const recentEntries = await db.recentList.findMany({
        where: {
          userId,
          report: {
            status: "done", // Only show completed reports in sidebar
            recommendation: {
              not: null,
            },
          },
        },
        orderBy: {
          viewedAt: "desc", // Order by most recently viewed
        },
        take: limit,
        include: {
          report: {
            select: {
              session_id: true,
              ticker: true,
              analysis_date: true,
              updated_at: true,
              recommendation: true,
              status: true,
            },
          },
        },
      });

      return recentEntries
        .filter((entry) => entry.report) // Filter out any entries without reports
        .map((entry) => this.transformToSidebarItem(entry.report!));
    } catch (error) {
      console.error("Error fetching recent reports for sidebar:", error);
      throw new Error("Failed to fetch recent reports for sidebar");
    }
  }

  /**
   * Fetch saved reports for sidebar display from savedList table
   * @param userId - User ID to filter reports
   * @param limit - Maximum number of reports to return (default: 10)
   * @returns Promise<SidebarReportItem[]> - Array of saved reports for sidebar
   */
  static async getSavedReportsForSidebar(
    userId: string,
    limit = 10,
  ): Promise<SidebarReportItem[]> {
    try {
      // Query from savedList table joined with agent_reports table
      const savedEntries = await db.savedList.findMany({
        where: {
          userId,
          report: {
            status: "done", // Only show completed reports in sidebar
            recommendation: {
              not: null,
            },
          },
        },
        orderBy: {
          savedAt: "desc", // Order by most recently saved
        },
        take: limit,
        include: {
          report: {
            select: {
              session_id: true,
              ticker: true,
              analysis_date: true,
              updated_at: true,
              recommendation: true,
              status: true,
            },
          },
        },
      });

      return savedEntries
        .filter((entry) => entry.report) // Filter out any entries without reports
        .map((entry) => this.transformToSidebarItem(entry.report!));
    } catch (error) {
      console.error("Error fetching saved reports for sidebar:", error);
      throw new Error("Failed to fetch saved reports for sidebar");
    }
  }

  /**
   * Check if a report exists and is accessible by the user
   * @param sessionId - Session ID of the report
   * @param userId - User ID to verify ownership
   * @returns Promise<{ exists: boolean; published: boolean; owned: boolean }> - Report access status
   */
  static async checkReportAccess(
    sessionId: string,
    userId: string,
  ): Promise<{ exists: boolean; published: boolean; owned: boolean }> {
    try {
      // First check if report exists at all
      const report = await db.agent_reports.findFirst({
        where: {
          session_id: sessionId,
        },
        select: {
          published: true,
          userId: true,
        },
      });

      if (!report) {
        return { exists: false, published: false, owned: false };
      }

      const owned = report.userId === userId;
      return { 
        exists: true, 
        published: report.published, 
        owned 
      };
    } catch (error) {
      console.error("Error checking report access:", error);
      return { exists: false, published: false, owned: false };
    }
  }

  /**
   * Get complete report data by session ID for dashboard display
   * Fetches from recentList table joined with agent_reports table by session ID and user
   * @param sessionId - Session ID of the report
   * @param userId - User ID to verify ownership
   * @returns Promise<StockData | null> - Complete report data or null if not found/not published
   */
  static async getReportBySessionId(
    sessionId: string,
    userId: string,
  ): Promise<StockData | null> {
    try {
      // Query directly from agent_reports table by session_id and userId
      const report = await db.agent_reports.findFirst({
        where: {
          session_id: sessionId,
          userId: userId,
        },
      });

      // If no report found, user doesn't own it, or it's not published
      if (!report || !report.published) {
        return null;
      }

      // Add to recentList for sidebar tracking (upsert to handle duplicates)
      // Only add to recent list if the report status is "done"
      if (report.status === "done") {
        try {
          await db.recentList.upsert({
          where: {
            unique_user_session: {
              userId,
              sessionId,
            },
          },
          update: {
            viewedAt: new Date(),
          },
          create: {
            userId,
            sessionId,
            viewedAt: new Date(),
          },
        });
        } catch (error) {
          // Log but don't fail if recentList update fails
          console.error('Failed to update recent list:', error);
        }
      }

      return this.transformToStockData(report);
    } catch (error) {
      console.error("Error fetching report by session ID:", error);
      throw new Error("Failed to fetch report by session ID");
    }
  }

  /**
   * Verify user ownership of a report by session ID using recentList table
   * @param sessionId - Session ID of the report
   * @param userId - User ID to verify ownership
   * @returns Promise<boolean> - True if user owns the report
   */
  static async verifyReportOwnershipBySessionId(
    sessionId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      // Check if the user has access to this report via recentList
      const recentListEntry = await db.recentList.findUnique({
        where: {
          unique_user_session: {
            userId,
            sessionId,
          },
        },
        select: { userId: true },
      });

      return !!recentListEntry;
    } catch (error) {
      console.error("Error verifying report ownership by session ID:", error);
      return false;
    }
  }

  /**
   * Transform database record to sidebar item format
   * @param report - Raw agent report data from database query
   * @returns SidebarReportItem - Transformed sidebar item
   */
  private static transformToSidebarItem(report: {
    session_id: string;
    ticker: string;
    analysis_date: Date;
    updated_at: Date | null;
    recommendation: string | null;
    status: string;
  }): SidebarReportItem {
    const analysisDate = new Date(report.analysis_date);
    const formattedDate = analysisDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return {
      sessionId: report.session_id,
      ticker: report.ticker,
      analysisDate: report.analysis_date,
      updatedAt: report.updated_at ?? report.analysis_date,
      recommendation: report.recommendation ?? "",
      status: report.status,
      name: `${report.ticker} ${formattedDate}`,
      url: `/document/${report.session_id}`,
    };
  }

  /**
   * Transform database record to StockData format for dashboard
   * @param report - Raw agent report from database
   * @returns StockData - Transformed stock data for dashboard
   */
  private static transformToStockData(report: agent_reports): StockData {
    return {
      session_id: report.session_id,
      ticker: report.ticker,
      date:
        (report.analysis_date?.toISOString() ?? new Date().toISOString()).split(
          "T",
        )[0] ?? "",
      analysis: {
        market_report: report.market_analyst_report ?? "",
        sentiment_report: report.social_analyst_report ?? "",
        news_report: report.news_analyst_report ?? "",
        fundamentals_report: report.fundamentals_analyst_report ?? "",
        investment_debate: {
          bull_analysis: report.bull_researcher_report ?? "",
          bear_analysis: report.bear_researcher_report ?? "",
          judge_decision: report.research_manager_report ?? "",
        },
        risk_assessment: {
          risky_analysis: report.risky_analyst_report ?? "",
          safe_analysis: report.safe_analyst_report ?? "",
          neutral_analysis: report.neutral_analyst_report ?? "",
          judge_decision: report.portfolio_manager_report ?? "",
        },
        trader_plan: report.trader_report ?? "",
        final_recommendation: report.final_analysis ?? "",
        recommendation_type: this.mapRecommendationType(report.recommendation),
      },
    };
  }

  /**
   * Map database recommendation to StockData recommendation type
   * @param recommendation - Raw recommendation from database
   * @returns Mapped recommendation type
   */
  private static mapRecommendationType(
    recommendation: string | null,
  ): StockData["analysis"]["recommendation_type"] {
    if (!recommendation) return "HOLD";

    const rec = recommendation.toUpperCase();
    if (rec.includes("BUY") && rec.includes("HOLD")) return "BUY or HOLD";
    if (rec.includes("SELL") && rec.includes("HOLD")) return "SELL or HOLD";
    if (rec.includes("BUY")) return "BUY";
    if (rec.includes("SELL")) return "SELL";
    return "HOLD";
  }
}
