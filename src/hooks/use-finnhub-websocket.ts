'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// TypeScript interfaces for Finnhub trade messages
interface FinnhubTradeData {
  p: number;      // Last price
  s: string;      // Symbol
  t: number;      // Timestamp (ms)
  v: number;      // Volume
}

interface FinnhubTradeMessage {
  type: 'trade';
  data: FinnhubTradeData[];
}

interface FinnhubSubscribeMessage {
  type: 'subscribe' | 'unsubscribe';
  symbol: string;
}

// WebSocket connection state
interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempt: number;
}

// Hook return type
interface UseFinnhubWebSocketReturn {
  prices: Record<string, number>;           // ticker -> last price
  priceTimestamps: Record<string, number>;  // ticker -> timestamp
  connectionState: WebSocketState;
  subscribe: (tickers: string[]) => void;
  unsubscribe: (tickers: string[]) => void;
  reconnect: () => void;
  shouldFallbackToHttp: boolean;            // indicates if HTTP polling should be used
}

interface UseFinnhubWebSocketOptions {
  autoConnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

// Constants
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000; // 1 second
const PRICE_UPDATE_DEBOUNCE_MS = 100; // Debounce price updates to prevent excessive re-renders

// Debounce utility function
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

export function useFinnhubWebSocket(
  tickers: string[],
  options: UseFinnhubWebSocketOptions = {}
): UseFinnhubWebSocketReturn {
  const {
    autoConnect = true,
    maxReconnectAttempts = MAX_RECONNECT_ATTEMPTS,
    reconnectDelay = BASE_RECONNECT_DELAY,
  } = options;

  // WebSocket instance ref
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedTickersRef = useRef<Set<string>>(new Set());
  const reconnectAttemptRef = useRef<number>(0);
  
  // Pending price updates buffer for debouncing
  const pendingPriceUpdatesRef = useRef<{
    prices: Record<string, number>;
    timestamps: Record<string, number>;
  }>({ prices: {}, timestamps: {} });

  // State management
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceTimestamps, setPriceTimestamps] = useState<Record<string, number>>({});
  const [connectionState, setConnectionState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempt: 0,
  });
  const [shouldFallbackToHttp, setShouldFallbackToHttp] = useState(false);

  // Calculate exponential backoff delay
  const calculateReconnectDelay = useCallback((attempt: number): number => {
    return Math.min(reconnectDelay * Math.pow(2, attempt), 30000);
  }, [reconnectDelay]);

  // Debounced function to flush pending price updates to state
  // Using useMemo to ensure the debounced function is stable and doesn't cause stale closures
  const flushPriceUpdates = useMemo(() => {
    return debounce(() => {
      const pending = pendingPriceUpdatesRef.current;
      
      if (Object.keys(pending.prices).length > 0) {
        // Update state with accumulated price updates
        setPrices((prev) => ({ ...prev, ...pending.prices }));
        setPriceTimestamps((prev) => ({ ...prev, ...pending.timestamps }));
        
        // Clear the pending updates buffer
        pendingPriceUpdatesRef.current = { prices: {}, timestamps: {} };
      }
    }, PRICE_UPDATE_DEBOUNCE_MS);
  }, []); // Empty deps array ensures this is created once and stable

  // Use a ref to store the connect function to avoid circular dependencies
  const connectRef = useRef<(() => Promise<void>) | null>(null);

  // Schedule reconnection with exponential backoff
  const scheduleReconnection = useCallback(() => {
    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Check if we've reached max reconnection attempts
    if (reconnectAttemptRef.current >= maxReconnectAttempts) {
      console.warn('[WebSocket] Max reconnection attempts reached, falling back to HTTP polling');
      setShouldFallbackToHttp(true);
      setConnectionState((prev) => ({
        ...prev,
        connected: false,
        connecting: false,
        error: 'Using HTTP polling',
        reconnectAttempt: reconnectAttemptRef.current,
      }));
      return;
    }

    // Calculate delay with exponential backoff
    const delay = calculateReconnectDelay(reconnectAttemptRef.current);
    
    console.log(
      `[WebSocket] Scheduling reconnection in ${delay}ms (attempt ${reconnectAttemptRef.current + 1}/${maxReconnectAttempts})`
    );

    // Update state to show reconnection attempt
    setConnectionState((prev) => ({
      ...prev,
      connecting: true,
      reconnectAttempt: reconnectAttemptRef.current + 1,
    }));

    // Schedule reconnection using the ref to avoid circular dependency
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptRef.current += 1;
      connectRef.current?.();
    }, delay);
  }, [maxReconnectAttempts, calculateReconnectDelay]);

  // Validate trade message with comprehensive checks
  const validateTradeMessage = useCallback((message: unknown): message is FinnhubTradeMessage => {
    // Check if message exists and is an object
    if (!message || typeof message !== 'object') {
      return false;
    }
    
    const msg = message as any;
    
    // Check if message has type field and it's 'trade'
    if (!msg.type || msg.type !== 'trade') {
      return false;
    }
    
    // Check if data field exists and is an array
    if (!Array.isArray(msg.data)) {
      return false;
    }
    
    // Validate each trade data item
    for (const trade of msg.data) {
      // Check if trade is an object with required fields
      if (!trade || typeof trade !== 'object') {
        return false;
      }
      
      // Validate required fields
      if (typeof trade.p !== 'number' || trade.p <= 0) {
        return false;
      }
      
      if (typeof trade.s !== 'string' || trade.s.trim() === '') {
        return false;
      }
      
      if (typeof trade.t !== 'number' || trade.t <= 0) {
        return false;
      }
      
      if (typeof trade.v !== 'number' || trade.v < 0) {
        return false;
      }
    }
    
    return true;
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);

      // Validate message structure and data types
      if (!validateTradeMessage(message)) {
        return;
      }

      // Accumulate price updates in the pending buffer
      message.data.forEach((trade) => {
        pendingPriceUpdatesRef.current.prices[trade.s] = trade.p;
        pendingPriceUpdatesRef.current.timestamps[trade.s] = trade.t;
      });

      // Trigger debounced flush of accumulated price updates
      flushPriceUpdates();
    } catch (error) {
      console.error('[WebSocket] Error processing message:', error);
    }
  }, [flushPriceUpdates, validateTradeMessage]);

  // Subscribe to tickers
  const subscribe = useCallback((tickersToSubscribe: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot subscribe: connection not open');
      return;
    }

    tickersToSubscribe.forEach((ticker) => {
      // Deduplication: only subscribe if not already subscribed
      if (!subscribedTickersRef.current.has(ticker)) {
        const message: FinnhubSubscribeMessage = {
          type: 'subscribe',
          symbol: ticker,
        };
        wsRef.current?.send(JSON.stringify(message));
        subscribedTickersRef.current.add(ticker);
        console.log('[WebSocket] Subscribed to:', ticker);
      }
    });
  }, []);

  // Unsubscribe from tickers
  const unsubscribe = useCallback((tickersToUnsubscribe: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot unsubscribe: connection not open');
      return;
    }

    tickersToUnsubscribe.forEach((ticker) => {
      if (subscribedTickersRef.current.has(ticker)) {
        const message: FinnhubSubscribeMessage = {
          type: 'unsubscribe',
          symbol: ticker,
        };
        wsRef.current?.send(JSON.stringify(message));
        subscribedTickersRef.current.delete(ticker);
        console.log('[WebSocket] Unsubscribed from:', ticker);
      }
    });
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    // Prevent multiple connection attempts
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('[WebSocket] Connection already open or connecting, skipping');
      return;
    }

    console.log('[WebSocket] Initiating connection...');
    setConnectionState((prev) => ({
      ...prev,
      connecting: true,
      error: null,
    }));

    try {
      // Fetch WebSocket token from API endpoint
      const response = await fetch('/api/portfolio/websocket-token');
      
      if (!response.ok) {
        throw new Error('Failed to fetch WebSocket token');
      }

      const { token, wsUrl } = await response.json();
      
      // Establish WebSocket connection
      const ws = new WebSocket(`${wsUrl}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected to Finnhub');
        
        // Reset reconnection counter on successful connection
        reconnectAttemptRef.current = 0;
        setShouldFallbackToHttp(false);
        
        setConnectionState({
          connected: true,
          connecting: false,
          error: null,
          reconnectAttempt: 0,
        });

        // Resubscribe to previously subscribed tickers (for reconnection scenarios)
        const previouslySubscribed = Array.from(subscribedTickersRef.current);
        if (previouslySubscribed.length > 0) {
          console.log('[WebSocket] Resubscribing to tickers after reconnection:', previouslySubscribed);
          // Clear the set and resubscribe (subscribe will add them back)
          subscribedTickersRef.current.clear();
          subscribe(previouslySubscribed);
        } else if (tickers.length > 0) {
          // Initial connection: subscribe to provided tickers
          subscribe(tickers);
        }
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed', { code: event.code, reason: event.reason });
        
        setConnectionState((prev) => ({
          ...prev,
          connected: false,
          connecting: false,
          error: event.reason || 'Connection closed',
        }));

        // Only trigger reconnection if not a normal closure
        if (event.code !== 1000) {
          scheduleReconnection();
        }
      };

    } catch (error) {
      console.error('[WebSocket] Failed to establish connection:', error);
      setConnectionState((prev) => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
      
      // Trigger reconnection on connection failure
      scheduleReconnection();
    }
  }, [tickers, subscribe, handleMessage, scheduleReconnection]);

  // Store connect function in ref for use in scheduleReconnection
  connectRef.current = connect;

  // Manual reconnect function
  const reconnect = useCallback(() => {
    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Reset reconnection counter and state
    reconnectAttemptRef.current = 0;
    setShouldFallbackToHttp(false);
    setConnectionState({
      connected: false,
      connecting: false,
      error: null,
      reconnectAttempt: 0,
    });
    subscribedTickersRef.current.clear();
    
    console.log('[WebSocket] Manual reconnect initiated');
    connect();
  }, [connect]);

  // Initialize connection on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      // Clear any pending reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Clear any pending debounced price updates to prevent memory leaks
      // Note: The debounced function itself will be garbage collected when the component unmounts
      pendingPriceUpdatesRef.current = { prices: {}, timestamps: {} };

      if (wsRef.current) {
        // Unsubscribe from all tickers
        const allTickers = Array.from(subscribedTickersRef.current);
        if (allTickers.length > 0 && wsRef.current.readyState === WebSocket.OPEN) {
          allTickers.forEach((ticker) => {
            const message: FinnhubSubscribeMessage = {
              type: 'unsubscribe',
              symbol: ticker,
            };
            wsRef.current?.send(JSON.stringify(message));
          });
        }

        wsRef.current.close();
        wsRef.current = null;
      }

      subscribedTickersRef.current.clear();
      console.log('[WebSocket] Cleanup complete');
    };
  }, [autoConnect, connect]);

  return {
    prices,
    priceTimestamps,
    connectionState,
    subscribe,
    unsubscribe,
    reconnect,
    shouldFallbackToHttp,
  };
}
