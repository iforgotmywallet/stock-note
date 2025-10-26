"use client"

import { useEffect, useState, useCallback, useRef } from "react"

export interface UserCreditsData {
  credits: number
  lastUpdated: Date
}

export interface UseUserCreditsReturn {
  credits: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useUserCredits(userId: string | null): UseUserCreditsReturn {
  const [credits, setCredits] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchCredits = useCallback(async () => {
    if (!userId) {
      setCredits(0)
      setLoading(false)
      setError(null)
      return
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    setLoading(true)
    setError(null)

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

      const fetchPromise = fetch('/api/user/credits', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      })

      const response = await Promise.race([fetchPromise, timeoutPromise])
      
      // Check if component is still mounted and request wasn't aborted
      if (signal.aborted) return

      if (!response.ok) {
        let errorMessage = 'Failed to fetch credits'
        
        if (response.status === 401) {
          errorMessage = 'Authentication required'
        } else if (response.status === 403) {
          errorMessage = 'Access denied'
        } else if (response.status === 404) {
          errorMessage = 'User not found'
        } else if (response.status >= 500) {
          errorMessage = 'Server error - please try again later'
        }
        
        throw new Error(errorMessage)
      }

      const data: UserCreditsData = await response.json()
      
      if (!signal.aborted) {
        setCredits(data.credits)
        setError(null)
      }
    } catch (err) {
      // Don't update state if request was aborted (component unmounted)
      if (signal.aborted) return

      let errorMessage = 'Unable to fetch credits'
      
      if (err instanceof Error) {
        // Handle specific error types
        if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out - please try again'
        } else if (err.message.includes('fetch') || err.name === 'TypeError') {
          errorMessage = 'Network error - please check your connection'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
      console.error('Credits fetch error:', err)
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
    }
  }, [userId])

  const refetch = useCallback(async () => {
    await fetchCredits()
  }, [fetchCredits])

  // Fetch credits on component mount and when userId changes
  useEffect(() => {
    void fetchCredits()
  }, [fetchCredits])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    credits,
    loading,
    error,
    refetch,
  }
}