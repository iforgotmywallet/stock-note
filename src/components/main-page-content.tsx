"use client"

import { useCallback, useRef } from "react"
import { ReportDataTable } from "~/components/report-data-table";
import AnalysisSearchCard from "~/components/analysis-search-card";

interface MainPageContentProps {
  userId: string
}

export default function MainPageContent({ userId }: MainPageContentProps) {
  const refreshTableRef = useRef<(() => Promise<void>) | null>(null)

  const handleRefreshReady = useCallback((refreshFn: () => Promise<void>) => {
    refreshTableRef.current = refreshFn
  }, [])

  const handleAnalysisComplete = useCallback(async () => {
    // Add a small delay to ensure database transaction is committed
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Refresh the main table when analysis is started (to show new row)
    if (refreshTableRef.current) {
      await refreshTableRef.current()
    }
  }, [])

  return (
    <div>
      <AnalysisSearchCard 
        onAnalysisComplete={handleAnalysisComplete}
      />
      <ReportDataTable 
        userId={userId}
        onRefreshReady={handleRefreshReady}
      />
    </div>
  );
}