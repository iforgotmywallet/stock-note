"use client"

import * as React from "react"
import { IconRefresh } from "@tabler/icons-react"

import { Button } from "~/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { Progress } from "~/components/ui/progress"
import { Spinner } from "~/components/ui/spinner"

export interface ProgressData {
  percentage: number
  populatedColumns: string[]
  totalColumns: number
  lastUpdated: Date
  reportId: string
  cachedAt?: Date
}

interface ProgressPopoverProps {
  reportId: string
  ticker: string
  children: React.ReactNode
  onProgressCheck?: (reportId: string) => Promise<ProgressData>
  maxRetries?: number
  cacheTimeMs?: number
}

export function ProgressPopover({
  reportId,
  ticker,
  children,
  onProgressCheck,
  maxRetries = 3,
  cacheTimeMs = 30000, // 30 seconds cache
}: ProgressPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [progressData, setProgressData] = React.useState<ProgressData | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [retryCount, setRetryCount] = React.useState(0)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  const handleProgressCheck = React.useCallback(async (isRetry = false) => {
    if (!onProgressCheck) return

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    setIsLoading(true)
    setError(null)

    if (isRetry) {
      setRetryCount(prev => prev + 1)
    } else {
      setRetryCount(0)
    }

    try {
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Request timeout - please try again'))
        }, 10000)
        
        // Clear timeout if request is aborted
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId)
        })
      })

      const data = await Promise.race([
        onProgressCheck(reportId),
        timeoutPromise
      ])
      
      // Check if component is still mounted and request wasn't aborted
      if (!signal.aborted) {
        setProgressData({
          ...data,
          cachedAt: new Date()
        })
        setRetryCount(0) // Reset retry count on success
      }
    } catch (err) {
      // Don't update state if request was aborted (component unmounted)
      if (signal.aborted) return

      let errorMessage = 'Unable to fetch progress'
      
      if (err instanceof Error) {
        // Handle specific error types
        if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out - please try again'
        } else if (err.message.includes('fetch') || err.name === 'TypeError') {
          errorMessage = 'Network error - please check your connection'
        } else if (err.message.includes('404')) {
          errorMessage = 'Report not found'
        } else if (err.message.includes('403') || err.message.includes('401')) {
          errorMessage = 'Access denied - please refresh and try again'
        } else if (err.message.includes('500')) {
          errorMessage = 'Server error - please try again later'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
      console.error('Progress fetch error:', err)
    } finally {
      if (!signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [reportId, onProgressCheck])

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open)
    if (open && !isLoading) {
      // Check if we need to fetch fresh data
      const shouldFetch = !progressData || 
        !progressData.cachedAt || 
        (Date.now() - progressData.cachedAt.getTime()) > cacheTimeMs
      
      if (shouldFetch) {
        void handleProgressCheck()
      }
    }
  }, [progressData, isLoading, handleProgressCheck, cacheTimeMs])

  const formatLastUpdated = React.useCallback((date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }, [])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start" sideOffset={8}>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium leading-none">Analysis Progress</h4>
                <p className="text-sm text-muted-foreground">
                  Progress for {ticker}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleProgressCheck()}
                disabled={isLoading}
                title="Refresh progress"
              >
                <IconRefresh className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <Spinner className="size-6" />
                <div className="text-sm text-muted-foreground text-center">
                  Calculating progress...
                  <br />
                  <span className="text-xs">This may take a moment</span>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <div className="size-4 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <div className="size-2 rounded-full bg-destructive" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="text-sm font-medium text-destructive">
                    Progress Unavailable
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {error}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleProgressCheck(true)}
                  className="flex-1"
                  disabled={isLoading || retryCount >= maxRetries}
                >
                  {isLoading ? (
                    <>
                      <Spinner className="size-3 mr-1" />
                      Retrying...
                    </>
                  ) : retryCount >= maxRetries ? (
                    'Max retries reached'
                  ) : (
                    `Try Again ${retryCount > 0 ? `(${retryCount}/${maxRetries})` : ''}`
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          ) : progressData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {Math.round(progressData.percentage)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {progressData.populatedColumns.length} of {progressData.totalColumns} steps complete
                  </span>
                </div>
                <Progress 
                  value={progressData.percentage} 
                  className="h-2"
                />
              </div>
              
              <div className="text-xs text-muted-foreground">
                Last updated: {formatLastUpdated(progressData.lastUpdated)}
              </div>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}