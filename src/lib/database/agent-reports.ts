import { db } from "~/server/db";
import type { agent_reports } from "@prisma/client";

export interface AgentReportRow {
  id: string;
  ticker: string;
  analysisDate: Date;
  recommendation: string;
  status: 'processing' | 'done' | 'failed' | 'NEC';
  published: boolean;
  analystTeams: string[];
  sessionId: string;
  userId: string;
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
          analysis_date: 'desc',
        },
      });

      return reports.map(this.transformAgentReport);
    } catch (error) {
      console.error('Error fetching agent reports:', error);
      throw new Error('Failed to fetch agent reports');
    }
  }

  /**
   * Update the published status of an agent report
   * @param id - Report ID
   * @param published - New published status
   * @returns Promise<void>
   */
  static async updateReportPublished(id: string, published: boolean): Promise<void> {
    try {
      await db.agent_reports.update({
        where: { id },
        data: { 
          published,
          updated_at: new Date(),
        },
      });
    } catch (error) {
      console.error('Error updating report published status:', error);
      throw new Error('Failed to update report published status');
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
      console.error('Error deleting agent report:', error);
      throw new Error('Failed to delete agent report');
    }
  }

  /**
   * Create an optimistic report entry for immediate UI feedback
   * @param ticker - Stock ticker symbol
   * @param userId - User ID
   * @param sessionId - Session ID for the analysis
   * @returns Promise<string> - Created report ID
   */
  static async addOptimisticReport(
    ticker: string, 
    userId: string, 
    sessionId: string
  ): Promise<string> {
    try {
      const report = await db.agent_reports.create({
        data: {
          session_id: sessionId,
          ticker,
          analysis_date: new Date(),
          userId,
          status: 'processing',
          published: false,
        },
      });

      return report.id;
    } catch (error) {
      console.error('Error creating optimistic report:', error);
      throw new Error('Failed to create optimistic report');
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
      recommendation: report.recommendation || '',
      status: report.status as AgentReportRow['status'],
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
    
    if (report.market_analyst_report) teams.push('market');
    if (report.news_analyst_report) teams.push('news');
    if (report.fundamentals_analyst_report) teams.push('fundamentals');
    if (report.social_analyst_report) teams.push('social');
    
    return teams;
  }

  /**
   * Verify user ownership of a report before allowing modifications
   * @param reportId - Report ID
   * @param userId - User ID to verify ownership
   * @returns Promise<boolean> - True if user owns the report
   */
  static async verifyReportOwnership(reportId: string, userId: string): Promise<boolean> {
    try {
      const report = await db.agent_reports.findUnique({
        where: { id: reportId },
        select: { userId: true },
      });

      return report?.userId === userId;
    } catch (error) {
      console.error('Error verifying report ownership:', error);
      return false;
    }
  }
}