# Design Document: Real-Time Portfolio Price Streaming

## Overview

This design implements a WebSocket-based real-time price streaming system for the portfolio dashboard using Finnhub's WebSocket API. The solution replaces the current HTTP polling mechanism with a persistent WebSocket connection that subscribes to trade data for all tickers in a portfolio, providing live price updates with minimal latency.

The implementation follows a React hooks-based architecture with proper connection management, error handling, and automatic reconnection logic. The design ensures secure API key handling, efficient subscription management, and seamless integration with existing portfolio components.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Portfolio Dashboard                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         PortfolioDashboardClient Component           │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │      useFinnhubWebSocket Hook                  │  │  │
│  │  │  - Connection Management                       │  │  │
│  │  │  - Subscription Management                     │  │  │
│  │  │  - Price State Management                      │  │  │
│  │  │  - Reconnection Logic                          │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                        ↓                              │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │      WebSocket Connection Manager              │  │  │
│  │  │  - Connect/Disconnect                          │  │  │
│  │  │  - Subscribe/Unsubscribe                       │  │  │
│  │  │  - Message Parsing                             │  │  │
│  │  │  - Error Handling                              │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                        ↓                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    PortfolioPerformanceSummary Component             │  │
│  │    - Receives live price updates                     │  │
│  │    - Recalculates metrics in real-time              │  │
│  └──────────────────────────────────────────────────────┘  │
│                        ↓                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    PortfolioHoldingsTable Component                  │  │
│  │    - Displays live prices with indicator             │  │
│  │    - Shows P/L updates in real-time                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        ↕ WebSocket
┌─────────────────────────────────────────────────────────────┐
│              Finnhub WebSocket API                          │
│  wss://ws.finnhub.io?token=<API_KEY>                       │
│                                                             │
│  Messages:                                                  │
│  → Subscribe: {"type":"subscribe","symbol":"AAPL"}         │
│  → Unsubscribe: {"type":"unsubscribe","symbol":"AAPL"}     │
│  ← Trade Data: {"type":"trade","data":[{...}]}            │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Initialization**: `PortfolioDashboardClient` mounts and extracts ticker symbols from positions
2. **Connection**: `useFinnhubWebSocket` hook establishes WebSocket connection
3. **Subscription**: Hook subscribes to all unique tickers in the portfolio
4. **Price Updates**: Incoming trade messages update the price state
5. **UI Refresh**: Child components (PerformanceSummary, HoldingsTable) re-render with new prices
6. **Cleanup**: On unmount or portfolio change, unsubscribe and disconnect

## Components and Interfaces

### 1. Custom Hook: `useFinnhubWebSocket`

**Location**: `src/hooks/use-finnhub-websocket.ts`

**Purpose**: Manages WebSocket connection lifecycle, subscriptions, and price state

**Interface**:
```typescript
interface FinnhubTradeMessage {
  type: 'trade';
  data: Array<{
    p: number;      // Last price
    s: string;      // Symbol
    t: number;      // Timestamp (ms)
    v: number;      // Volume
  }>;
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempt: number;
}

interface UseFinnhubWebSocketReturn {
  prices: Record<string, number>;           // ticker -> last price
  priceTimestamps: Record<string, number>;  // ticker -> timestamp
  connectionState: WebSocketState;
  subscribe: (tickers: string[]) => void;
  unsubscribe: (tickers: string[]) => void;
  reconnect: () => void;
}

function useFinnhubWebSocket(
  tickers: string[],
  options?: {
    autoConnect?: boolean;
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
  }
): UseFinnhubWebSocketReturn
```

**Key Features**:
- Automatic connection management
- Subscription deduplication (only subscribe once per ticker)
- Exponential backoff for reconnection (1s, 2s, 4s, 8s, 16s)
- Graceful degradation after max reconnect attempts
- Message validation and error handling
- Cleanup on unmount

### 2. API Route: `/api/portfolio/websocket-token`

**Location**: `src/app/api/portfolio/websocket-token/route.ts`

**Purpose**: Securely provide Finnhub API token to authenticated clients

**Interface**:
```typescript
// GET /api/portfolio/websocket-token
// Response:
{
  token: string;
  wsUrl: string;  // "wss://ws.finnhub.io"
}
```

**Security**:
- Requires authentication (checks session)
- Returns 401 if not authenticated
- Token is never exposed in client-side code
- Rate limiting to prevent abuse

### 3. Enhanced Component: `PortfolioDashboardClient`

**Location**: `src/components/portfolio-dashboard-client.tsx`

**Changes**:
- Import and use `useFinnhubWebSocket` hook
- Extract unique tickers from positions
- Pass live prices to child components
- Display connection status indicator
- Handle fallback to HTTP polling on connection failure

**New Props for Child Components**:
```typescript
interface PortfolioPerformanceSummaryProps {
  positions: PortfolioPosition[];
  portfolioLeverage?: number;
  livePrices?: Record<string, number>;        // NEW
  priceSource?: 'websocket' | 'http';         // NEW
}

interface PortfolioHoldingsTableProps {
  positions: PortfolioPositionWithMetrics[];
  livePrices?: Record<string, number>;        // NEW
  priceSource?: 'websocket' | 'http';         // NEW
  // ... existing props
}
```

### 4. Connection Status Component

**Location**: `src/components/portfolio-connection-status.tsx`

**Purpose**: Display WebSocket connection status to users

**Interface**:
```typescript
interface ConnectionStatusProps {
  state: WebSocketState;
  onReconnect?: () => void;
}

export function PortfolioConnectionStatus({
  state,
  onReconnect
}: ConnectionStatusProps)
```

**States**:
- **Connected**: Green indicator with "Live" badge
- **Connecting**: Yellow indicator with "Connecting..." text
- **Disconnected**: Red indicator with "Disconnected" and retry button
- **Error**: Red indicator with error message and retry button

## Data Models

### WebSocket Message Types

```typescript
// Incoming trade message from Finnhub
interface FinnhubTradeMessage {
  type: 'trade';
  data: Array<{
    p: number;      // Last price
    s: string;      // Symbol (e.g., "AAPL")
    t: number;      // Unix timestamp in milliseconds
    v: number;      // Volume
  }>;
}

// Outgoing subscription message
interface FinnhubSubscribeMessage {
  type: 'subscribe' | 'unsubscribe';
  symbol: string;
}

// Ping/Pong for connection health
interface FinnhubPingMessage {
  type: 'ping';
}
```

### Price State Management

```typescript
// Price cache with timestamps
interface PriceCache {
  [ticker: string]: {
    price: number;
    timestamp: number;
    source: 'websocket' | 'http';
  };
}

// Position with live price overlay
interface PositionWithLivePrice extends PortfolioPositionWithMetrics {
  live_price?: number;
  live_price_timestamp?: number;
  price_source: 'websocket' | 'http' | 'stored';
}
```

## Error Handling

### Connection Errors

1. **Initial Connection Failure**
   - Display error message in connection status component
   - Attempt reconnection with exponential backoff
   - After 5 failed attempts, fall back to HTTP polling
   - Log error details to console for debugging

2. **Connection Drop During Session**
   - Automatically attempt to reconnect
   - Preserve subscription list for resubscription
   - Display "Reconnecting..." status to user
   - Continue showing last known prices during reconnection

3. **Authentication Errors**
   - Display "Authentication failed" message
   - Do not attempt automatic reconnection
   - Provide manual retry button
   - Log error for admin investigation

### Message Validation Errors

```typescript
function validateTradeMessage(message: unknown): message is FinnhubTradeMessage {
  if (!message || typeof message !== 'object') return false;
  
  const msg = message as any;
  if (msg.type !== 'trade') return false;
  if (!Array.isArray(msg.data)) return false;
  
  return msg.data.every((trade: any) => 
    typeof trade.p === 'number' &&
    typeof trade.s === 'string' &&
    typeof trade.t === 'number' &&
    typeof trade.v === 'number' &&
    trade.p > 0
  );
}
```

### Fallback Strategy

```typescript
// Reconnection logic with exponential backoff
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_DELAY = 1000; // 1 second

function calculateReconnectDelay(attempt: number): number {
  return Math.min(BASE_DELAY * Math.pow(2, attempt), 30000); // Max 30s
}

// After max attempts, fall back to HTTP polling
if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
  console.warn('Max reconnection attempts reached, falling back to HTTP polling');
  startHttpPolling(); // Use existing fetchHoldings mechanism
}
```

## Testing Strategy

### Unit Tests

**File**: `src/hooks/__tests__/use-finnhub-websocket.test.ts`

Test cases:
1. Hook initializes with correct default state
2. Connection establishes successfully
3. Subscription messages are sent correctly
4. Trade messages update price state
5. Invalid messages are rejected
6. Reconnection logic works with exponential backoff
7. Cleanup unsubscribes and closes connection
8. Multiple subscriptions to same ticker are deduplicated

**File**: `src/components/__tests__/portfolio-connection-status.test.tsx`

Test cases:
1. Displays correct status for each connection state
2. Retry button appears when disconnected
3. Retry button calls onReconnect callback
4. Error messages are displayed correctly

### Integration Tests

**File**: `src/components/__tests__/portfolio-dashboard-websocket.test.tsx`

Test cases:
1. Dashboard connects to WebSocket on mount
2. Dashboard subscribes to all portfolio tickers
3. Price updates trigger UI re-renders
4. Performance metrics recalculate with new prices
5. Holdings table shows live price indicator
6. Dashboard unsubscribes on unmount
7. Dashboard handles portfolio changes (unsubscribe old, subscribe new)
8. Fallback to HTTP polling works after connection failures

### Manual Testing Checklist

- [ ] WebSocket connects successfully on dashboard load
- [ ] All portfolio tickers are subscribed
- [ ] Live prices update in real-time (verify with external source)
- [ ] Performance summary recalculates correctly
- [ ] Holdings table shows green "live" indicator
- [ ] Connection status indicator shows correct state
- [ ] Disconnect network and verify reconnection logic
- [ ] Switch between portfolios and verify subscription changes
- [ ] Navigate away and verify connection closes
- [ ] Test with portfolio containing 10+ tickers
- [ ] Test with portfolio containing duplicate tickers
- [ ] Verify no memory leaks after multiple mount/unmount cycles

## Performance Considerations

### Subscription Management

- **Deduplication**: Only subscribe once per unique ticker, even if multiple positions exist
- **Batch Operations**: Subscribe to all tickers in a single batch on connection open
- **Lazy Unsubscribe**: Unsubscribe only when navigating away or portfolio changes

### State Updates

- **Debouncing**: Update UI at most once per 100ms to prevent excessive re-renders
- **Memoization**: Use `useMemo` for expensive calculations (portfolio metrics)
- **Selective Updates**: Only update components that depend on changed prices

```typescript
// Debounced price updates
const debouncedPrices = useMemo(() => {
  return debounce((newPrices: Record<string, number>) => {
    setPrices(newPrices);
  }, 100);
}, []);
```

### Memory Management

- **Connection Cleanup**: Always close WebSocket on unmount
- **Event Listener Cleanup**: Remove all event listeners before closing
- **State Reset**: Clear price cache when disconnecting
- **Ref Usage**: Use refs for WebSocket instance to prevent re-creation

## Security Considerations

### API Token Protection

1. **Server-Side Token Storage**: Finnhub API key stored in `.env` file, never exposed to client
2. **Token Endpoint**: New API route `/api/portfolio/websocket-token` provides token only to authenticated users
3. **Session Validation**: Verify user session before returning token
4. **Rate Limiting**: Limit token requests to prevent abuse

### WebSocket Security

1. **WSS Protocol**: Use secure WebSocket (wss://) for encrypted communication
2. **Origin Validation**: Finnhub validates origin automatically
3. **Message Validation**: Validate all incoming messages before processing
4. **Input Sanitization**: Sanitize ticker symbols before subscribing

### Error Information Disclosure

- Never expose API keys in error messages
- Log detailed errors server-side only
- Show generic error messages to users
- Avoid exposing internal system details

## Implementation Notes

### Environment Variables

Add to `.env` and `.env.example`:
```bash
# Finnhub API (already exists)
FINNHUB_API_KEY="your-finnhub-api-key-here"

# WebSocket configuration (optional)
NEXT_PUBLIC_FINNHUB_WS_URL="wss://ws.finnhub.io"
```

### Dependencies

No new dependencies required. Uses native WebSocket API available in all modern browsers.

### Browser Compatibility

- WebSocket API: Supported in all modern browsers (Chrome 16+, Firefox 11+, Safari 7+, Edge 12+)
- Fallback: HTTP polling for older browsers or connection failures

### Finnhub API Limits

- **Free Tier**: 60 API calls/minute
- **WebSocket**: No explicit rate limit, but recommended to limit subscriptions to 50 symbols
- **Reconnection**: Implement exponential backoff to avoid hitting rate limits

### Migration Strategy

1. **Phase 1**: Implement WebSocket hook and connection status component
2. **Phase 2**: Integrate WebSocket into dashboard with feature flag
3. **Phase 3**: Test with subset of users
4. **Phase 4**: Enable for all users with HTTP fallback
5. **Phase 5**: Monitor performance and error rates
6. **Phase 6**: Deprecate HTTP polling if WebSocket proves stable

## Monitoring and Observability

### Metrics to Track

- WebSocket connection success rate
- Average reconnection time
- Number of price updates per minute
- Fallback to HTTP polling frequency
- Error rates by type (connection, authentication, validation)

### Logging

```typescript
// Connection events
console.log('[WebSocket] Connected to Finnhub');
console.log('[WebSocket] Subscribed to tickers:', tickers);
console.log('[WebSocket] Received price update:', { ticker, price });

// Error events
console.error('[WebSocket] Connection failed:', error);
console.error('[WebSocket] Invalid message received:', message);
console.warn('[WebSocket] Reconnection attempt', attempt, 'of', MAX_ATTEMPTS);
```

### User-Facing Indicators

- Connection status badge (Live/Connecting/Disconnected)
- Last update timestamp
- Price source indicator (WebSocket/HTTP/Stored)
- Error messages with actionable guidance

## Future Enhancements

1. **Multi-Portfolio Support**: Share single WebSocket connection across multiple portfolios
2. **Advanced Metrics**: Track bid/ask spread, volume, and other trade data
3. **Price Alerts**: Notify users when prices cross thresholds
4. **Historical Data**: Store price history for charting
5. **Compression**: Use WebSocket compression for bandwidth optimization
6. **Service Worker**: Maintain connection in background tab
