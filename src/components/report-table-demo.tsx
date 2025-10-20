"use client"

import * as React from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { ReportDataTable, type AgentReportRow } from "~/components/report-data-table"

interface ReportTableDemoProps {
  userId: string
}

export function ReportTableDemo({ userId }: ReportTableDemoProps) {
  const [ticker, setTicker] = React.useState("")
  const [addOptimisticReport, setAddOptimisticReport] = React.useState<
    ((ticker: string, sessionId: string) => Promise<string>) | null
  >(null)
  const [updateOptimisticReport, setUpdateOptimisticReport] = React.useState<
    ((reportId: string, updatedData: Partial<AgentReportRow>) => void) | null
  >(null)

  const handleStartAnalysis = async () => {
    if (!ticker.trim() || !addOptimisticReport) return

    try {
      // Generate a mock session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Add optimistic report (this will trigger the animation)
      const reportId = await addOptimisticReport(ticker.toUpperCase(), sessionId)
      
      // Clear the input
      setTicker("")
      
      // Simulate analysis completion after 3 seconds
      setTimeout(() => {
        if (updateOptimisticReport) {
          updateOptimisticReport(reportId, {
            status: 'done',
            recommendation: 'BUY',
            analystTeams: ['market', 'fundamentals']
          })
        }
      }, 3000)
      
    } catch (error) {
      console.error('Failed to start analysis:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Enter ticker symbol (e.g., AAPL)"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void handleStartAnalysis()
            }
          }}
          className="max-w-xs"
        />
        <Button 
          onClick={handleStartAnalysis}
          disabled={!ticker.trim() || !addOptimisticReport}
        >
          Start Analysis
        </Button>
      </div>
      
      <ReportDataTable
        userId={userId}
        onOptimisticReportAdd={setAddOptimisticReport}
        onOptimisticReportUpdate={setUpdateOptimisticReport}
      />
    </div>
  )
}