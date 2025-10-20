"use server"

import { db } from "~/server/db";
import type { agent_reports } from "@prisma/client";

export interface AgentReportRow {
  id: string;
  ticker: string;
  analysisDate: Date;
  updatedAt: Date;
  recommendation: string;
  status: 'processing' | 'done' | 'failed' | 'NEC';
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
 * Create an optimistic report entry for immediate UI feedback
 */
export async function addOptimisticReport(
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