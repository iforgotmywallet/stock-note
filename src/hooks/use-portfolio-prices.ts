'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useFinnhubWebSocket } from './use-finnhub-websocket';
import { isMarketHours } from '~/lib/utils/market-hours';

interface UsePortfolioPricesOptions {
  tickers: string[];
  enabled?: boolean;
  httpPollingInterval?: number; // in milliseconds, default 1000 (1 second)
}

interface UsePortfolioPricesReturn {
  prices: Record<string, number>;
  priceTimestamps: Record<string, number>;
  priceSource: 'websocket' | 'http' | 'none';
  isLoading: boolean;
  error: string | null;
  isMarketOpen: boolean;
}

/**
 * Hook that automatically switches between WebSocket (during market hours)
 * and HTTP polling (outside market hours) for stock price updates
 */
export function usePortfolioPrices({
  tickers,
  enabled = true,
  httpPollingInterval = 1000,
}: UsePortfolioPricesOptions): UsePortfolioPricesReturn {
  const [isMarketOpen, setIsMarketOpen] = useState(isMarketHours());
  const [httpPrices, setHttpPrices] = useState<Record<string, number>>({});
  const [httpTimestamps, setHttpTimestamps] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  // WebSocket hook (only active during market hours)
  const {
    prices: wsPrices,
    priceTimestamps: wsTimestamps,
    connectionState,
  } = useFinnhubWebSocket(tickers, {
    autoConnect: enabled && isMarketOpen,
  });

  // Check market hours periodically (every minute)
  useEffect(() => {
    const checkMarketHours = () => {
      const marketOpen = isMarketHours();
      setIsMarketOpen(marketOpen);
    };

    // Check immediately
    checkMarketHours();

    // Check every minute
    const interval = setInterval(checkMarketHours, 60000);

    return () => clearInterval(interval);
  }, []);

  // HTTP polling function
  const fetchPricesViaHttp = useCallback(async () => {
    if (!enabled || tickers.length === 0 || isMarketOpen) {
      return;
    }

    // Prevent fetching too frequently
    const now = Date.now();
    if (now - lastFetchTimeRef.current < httpPollingInterval) {
      return;
    }

    lastFetchTimeRef.current = now;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/portfolio/prices?tickers=${tickers.join(',')}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.prices) {
        const validPrices: Record<string, number> = {};
        const validTimestamps: Record<string, number> = {};

        Object.entries(data.prices).forEach(([ticker, price]) => {
          if (typeof price === 'number' && price > 0) {
            validPrices[ticker] = price;
            validTimestamps[ticker] = data.timestamps?.[ticker] || Date.now();
          }
        });

        setHttpPrices(validPrices);
        setHttpTimestamps(validTimestamps);
      }

      if (data.errors && Object.keys(data.errors).length > 0) {
        console.warn('[HTTP Polling] Some tickers failed:', data.errors);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch prices';
      console.error('[HTTP Polling] Error:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, tickers, isMarketOpen, httpPollingInterval]);

  // Set up HTTP polling when market is closed
  useEffect(() => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Only poll via HTTP when market is closed
    if (!enabled || isMarketOpen || tickers.length === 0) {
      return;
    }

    console.log('[Portfolio Prices] Market closed, starting HTTP polling');

    // Fetch immediately
    fetchPricesViaHttp();

    // Set up polling interval
    pollingIntervalRef.current = setInterval(
      fetchPricesViaHttp,
      httpPollingInterval
    );

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [enabled, isMarketOpen, tickers, httpPollingInterval, fetchPricesViaHttp]);

  // Determine which price source to use
  const priceSource: 'websocket' | 'http' | 'none' = isMarketOpen
    ? connectionState.connected
      ? 'websocket'
      : 'none'
    : Object.keys(httpPrices).length > 0
    ? 'http'
    : 'none';

  // Return appropriate prices based on market hours
  const prices = isMarketOpen ? wsPrices : httpPrices;
  const priceTimestamps = isMarketOpen ? wsTimestamps : httpTimestamps;

  return {
    prices,
    priceTimestamps,
    priceSource,
    isLoading,
    error,
    isMarketOpen,
  };
}
