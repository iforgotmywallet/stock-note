"use client"

import * as React from "react"

import { Button } from "~/components/ui/button"
import { ProgressPopover, type ProgressData } from "~/components/progress-popover"

interface ProgressButtonProps {
  reportId: string
  ticker: string
  className?: string
}

export function ProgressButton({ reportId, ticker, className }: ProgressButtonProps) {
  const handleProgressCheck = React.useCallback(async (reportId: string): Promise<ProgressData> => {
    const response = await fetch(`/api/reports/${reportId}/progress`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Report not found')
      } else if (response.status === 403) {
        throw new Error('Access denied - please refresh and try again')
      } else if (response.status >= 500) {
        throw new Error('Server error - please try again later')
      } else {
        throw new Error(`Failed to fetch progress: ${response.statusText}`)
      }
    }

    const response_data = await response.json()
    
    // Validate the response wrapper structure
    if (!response_data?.success || !response_data.data) {
      throw new Error('Invalid response format received')
    }

    const data = response_data.data
    
    // Validate the progress data structure
    if (!data || typeof data.percentage !== 'number' || !Array.isArray(data.populatedColumns)) {
      throw new Error('Invalid progress data received')
    }

    return {
      percentage: data.percentage,
      populatedColumns: data.populatedColumns,
      totalColumns: data.totalColumns,
      lastUpdated: new Date(data.lastUpdated),
      reportId: data.reportId,
    }
  }, [])

  return (
    <ProgressPopover
      reportId={reportId}
      ticker={ticker}
      onProgressCheck={handleProgressCheck}
    >
      <Button
        variant="outline"
        size="sm"
        className={`text-xs px-3 py-1 h-7 ${className ?? ''}`}
      >
        Check Progress
      </Button>
    </ProgressPopover>
  )
}