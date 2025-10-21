"use client"

import * as React from "react"
import { ReportDataTable, type AgentReportRow } from "~/components/report-data-table";
import AnalysisSearchCard from "~/components/analysis-search-card";

interface MainPageContentProps {
  userId: string
}

export default function MainPageContent({ userId }: MainPageContentProps) {
  const addOptimisticReportRef = React.useRef<
    ((ticker: string, sessionId: string) => Promise<string>) | null
  >(null)
  const updateOptimisticReportRef = React.useRef<
    ((reportId: string, updatedData: Partial<AgentReportRow>) => void) | null
  >(null)

  const handleOptimisticReportAdd = React.useCallback((fn: (ticker: string, sessionId: string) => Promise<string>) => {
    addOptimisticReportRef.current = fn
  }, [])

  const handleOptimisticReportUpdate = React.useCallback((fn: (reportId: string, updatedData: Partial<AgentReportRow>) => void) => {
    updateOptimisticReportRef.current = fn
  }, [])

  const addOptimisticReport = React.useCallback(async (ticker: string, sessionId: string) => {
    if (addOptimisticReportRef.current) {
      return await addOptimisticReportRef.current(ticker, sessionId)
    }
    throw new Error('Add optimistic report function not available')
  }, [])

  const updateOptimisticReport = React.useCallback((reportId: string, updatedData: Partial<AgentReportRow>) => {
    if (updateOptimisticReportRef.current) {
      updateOptimisticReportRef.current(reportId, updatedData)
    }
  }, [])

  return (
    <div>
      <AnalysisSearchCard 
        onOptimisticReportAdd={addOptimisticReport}
      />
      <ReportDataTable 
        userId={userId}
        onOptimisticReportAdd={handleOptimisticReportAdd}
        onOptimisticReportUpdate={handleOptimisticReportUpdate}
      />
    </div>
  );
}