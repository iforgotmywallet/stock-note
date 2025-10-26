import { db } from "~/server/db";
import type { agent_reports } from "@prisma/client";

export interface ProgressData {
  percentage: number;
  populatedColumns: string[];
  totalColumns: number;
  lastUpdated: Date;
  reportId: string;
}

/**
 * Service for calculating and tracking report analysis progress
 */
export class ProgressCalculationService {
  /**
   * Analysis columns to track for progress calculation
   * Based on requirements 3.4: market_analyst_report, news_analyst_report, fundamentals_analyst_report,
   * social_analyst_report, bull_researcher_report, bear_researcher_report, research_manager_report,
   * trader_report, risky_analyst_report, neutral_analyst_report, safe_analyst_report,
   * portfolio_manager_report, final_analysis, recommendation
   */
  private static readonly TRACKABLE_COLUMNS = [
    "market_analyst_report",
    "news_analyst_report",
    "fundamentals_analyst_report",
    "social_analyst_report",
    "bull_researcher_report",
    "bear_researcher_report",
    "research_manager_report",
    "trader_report",
    "risky_analyst_report",
    "neutral_analyst_report",
    "safe_analyst_report",
    "portfolio_manager_report",
    "final_analysis",
    "recommendation",
  ] as const;

  /**
   * Calculate progress for a given report
   * @param report - Agent report data from database
   * @returns ProgressData - Calculated progress information
   */
  static calculateProgress(report: agent_reports): ProgressData {
    try {
      // Special case: If status is "done", ensure progress is 100%
      // This handles edge cases where all columns are populated but calculation might be slightly off
      if (report.status === "done") {
        return {
          percentage: 100,
          populatedColumns: [...this.TRACKABLE_COLUMNS],
          totalColumns: this.TRACKABLE_COLUMNS.length,
          lastUpdated: report.updated_at || new Date(),
          reportId: report.id,
        };
      }

      // Count populated columns
      const populatedColumns = this.TRACKABLE_COLUMNS.filter((column) => {
        const value = report[column];
        return value !== null && value !== undefined && value.trim() !== "";
      });

      // Calculate percentage based on requirement 3.5: (populated_columns / total_trackable_columns) * 100
      const percentage = Math.round(
        (populatedColumns.length / this.TRACKABLE_COLUMNS.length) * 100,
      );

      return {
        percentage,
        populatedColumns: [...populatedColumns],
        totalColumns: this.TRACKABLE_COLUMNS.length,
        lastUpdated: report.updated_at || new Date(),
        reportId: report.id,
      };
    } catch (error) {
      console.error("Error calculating progress for report:", report.id, error);
      throw new Error("Failed to calculate report progress");
    }
  }

  /**
   * Fetch report data and calculate progress
   * @param reportId - Report ID to fetch and calculate progress for
   * @returns Promise<ProgressData> - Progress data for the report
   */
  static async getReportProgress(reportId: string): Promise<ProgressData> {
    try {
      const report = await db.agent_reports.findUnique({
        where: { id: reportId },
      });

      if (!report) {
        throw new Error(`Report with ID ${reportId} not found`);
      }

      return this.calculateProgress(report);
    } catch (error) {
      console.error("Error fetching report progress:", error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to fetch report progress");
    }
  }

  /**
   * Fetch report progress with user ownership verification
   * @param reportId - Report ID to fetch progress for
   * @param userId - User ID to verify ownership
   * @returns Promise<ProgressData> - Progress data for the report
   */
  static async getReportProgressForUser(
    reportId: string,
    userId: string,
  ): Promise<ProgressData> {
    try {
      const report = await db.agent_reports.findUnique({
        where: {
          id: reportId,
          userId: userId, // Ensure user owns the report
        },
      });

      if (!report) {
        throw new Error(
          `Report with ID ${reportId} not found or access denied`,
        );
      }

      return this.calculateProgress(report);
    } catch (error) {
      console.error("Error fetching report progress for user:", error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to fetch report progress");
    }
  }

  /**
   * Get progress for multiple reports efficiently
   * @param reportIds - Array of report IDs
   * @param userId - User ID to verify ownership (optional)
   * @returns Promise<Map<string, ProgressData>> - Map of report ID to progress data
   */
  static async getBatchReportProgress(
    reportIds: string[],
    userId?: string,
  ): Promise<Map<string, ProgressData>> {
    try {
      const whereClause = userId
        ? { id: { in: reportIds }, userId }
        : { id: { in: reportIds } };

      const reports = await db.agent_reports.findMany({
        where: whereClause,
      });

      const progressMap = new Map<string, ProgressData>();

      for (const report of reports) {
        try {
          const progress = this.calculateProgress(report);
          progressMap.set(report.id, progress);
        } catch (error) {
          console.error(
            `Error calculating progress for report ${report.id}:`,
            error,
          );
          // Continue processing other reports even if one fails
        }
      }

      return progressMap;
    } catch (error) {
      console.error("Error fetching batch report progress:", error);
      throw new Error("Failed to fetch batch report progress");
    }
  }

  /**
   * Check if a report should show progress button
   * Based on requirement 1.1: null recommendation AND status is "processing"
   * @param report - Agent report data
   * @returns boolean - True if progress button should be shown
   */
  static shouldShowProgressButton(report: agent_reports): boolean {
    return !report.recommendation && report.status === "processing";
  }
}
