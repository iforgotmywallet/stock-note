"use server"

import { db } from "~/server/db";
import type { agent_reports } from "@prisma/client";

export interface AgentReportRow {
  id: string;
  ticker: string;
  analysisDate: Date;
  updatedAt: Date;
  recommendation: string;
  status: 'queued' | 'processing' | 'done' | 'failed' | 'NEC';
  published: boolean;
  analystTeams: string[];
  sessionId: string;
  userId: string;
}

/**
 * Transform database record to table row format
 */
function transformAgentReport(report: agent_reports): AgentReportRow {
  return {
    id: report.id,
    ticker: report.ticker,
    analysisDate: report.analysis_date,
    updatedAt: report.updated_at ?? report.created_at ?? new Date(),
    recommendation: report.recommendation ?? '',
    status: report.status as AgentReportRow['status'],
    published: report.published,
    analystTeams: getAnalystTeams(report),
    sessionId: report.session_id,
    userId: report.userId,
  };
}

/**
 * Determine which analyst teams contributed to the report
 */
function getAnalystTeams(report: agent_reports): string[] {
  const teams: string[] = [];
  
  if (report.market_analyst_report) teams.push('market');
  if (report.news_analyst_report) teams.push('news');
  if (report.fundamentals_analyst_report) teams.push('fundamentals');
  if (report.social_analyst_report) teams.push('social');
  
  return teams;
}

/**
 * Fetch agent reports for a specific user (including processing reports)
 */
export async function getAgentReports(userId: string): Promise<AgentReportRow[]> {
  try {
    const reports = await db.agent_reports.findMany({
      where: {
        userId,
      },
      orderBy: [
        {
          updated_at: 'desc',
        },
        {
          analysis_date: 'desc',
        },
      ],
    });

    return reports.map(transformAgentReport);
  } catch (error) {
    console.error('Error fetching agent reports:', error);
    throw new Error('Failed to fetch agent reports');
  }
}

/**
 * Update the published status of an agent report
 */
export async function updateReportPublished(id: string, published: boolean): Promise<void> {
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
 */
export async function deleteReport(id: string): Promise<void> {
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
 * Verify user ownership of a report before allowing modifications
 */
export async function verifyReportOwnership(reportId: string, userId: string): Promise<boolean> {
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

/**
 * Bulk delete multiple agent reports
 */
export async function bulkDeleteReports(
  reportIds: string[], 
  userId: string
): Promise<{ deleted: number; failed: string[] }> {
  if (!reportIds.length) {
    return { deleted: 0, failed: [] };
  }

  try {
    // First verify user owns all reports
    const reports = await db.agent_reports.findMany({
      where: {
        id: { in: reportIds },
      },
      select: { id: true, userId: true },
    });

    // Filter out reports the user doesn't own
    const ownedReportIds = reports
      .filter(report => report.userId === userId)
      .map(report => report.id);

    const unauthorizedIds = reportIds.filter(id => !ownedReportIds.includes(id));

    if (ownedReportIds.length === 0) {
      return { deleted: 0, failed: reportIds };
    }

    // Delete owned reports (cascading deletes will handle related records)
    const deleteResult = await db.agent_reports.deleteMany({
      where: {
        id: { in: ownedReportIds },
        userId, // Additional safety check
      },
    });

    return {
      deleted: deleteResult.count,
      failed: unauthorizedIds,
    };
  } catch (error) {
    console.error('Error in bulk delete reports:', error);
    throw new Error('Failed to delete reports');
  }
}

/**
 * Bulk save multiple reports to saved list
 */
export async function bulkSaveReports(
  sessionIds: string[], 
  userId: string
): Promise<{ saved: number; skipped: number }> {
  if (!sessionIds.length) {
    return { saved: 0, skipped: 0 };
  }

  try {
    // First verify all session IDs belong to reports owned by the user
    const reports = await db.agent_reports.findMany({
      where: {
        session_id: { in: sessionIds },
        userId,
      },
      select: { session_id: true },
    });

    const validSessionIds = reports.map(report => report.session_id);
    const invalidCount = sessionIds.length - validSessionIds.length;

    if (validSessionIds.length === 0) {
      return { saved: 0, skipped: sessionIds.length };
    }

    // Check which sessions are already saved
    const existingSaved = await db.savedList.findMany({
      where: {
        userId,
        sessionId: { in: validSessionIds },
      },
      select: { sessionId: true },
    });

    const existingSessionIds = existingSaved.map(saved => saved.sessionId);
    const newSessionIds = validSessionIds.filter(id => !existingSessionIds.includes(id));

    if (newSessionIds.length === 0) {
      return { saved: 0, skipped: sessionIds.length };
    }

    // Create new saved list entries
    const savedListEntries = newSessionIds.map(sessionId => ({
      userId,
      sessionId,
      savedAt: new Date(),
    }));

    await db.savedList.createMany({
      data: savedListEntries,
      skipDuplicates: true,
    });

    return {
      saved: newSessionIds.length,
      skipped: existingSessionIds.length + invalidCount,
    };
  } catch (error) {
    console.error('Error in bulk save reports:', error);
    throw new Error('Failed to save reports');
  }
}