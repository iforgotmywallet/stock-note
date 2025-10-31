# Implementation Plan

- [x] 1. Create WebSocket token API endpoint
  - Create `/api/portfolio/websocket-token/route.ts` that returns Finnhub API token to authenticated users
  - Implement session validation to ensure only authenticated users can access the token
  - Return WebSocket URL and token in response format: `{ token: string, wsUrl: string }`
  - Add error handling for missing API key or authentication failures
  - _Requirements: 5.1, 5.2_

- [x] 2. Implement core WebSocket hook
  - Create `src/hooks/use-finnhub-websocket.ts` with connection management logic
  - Define TypeScript interfaces for Finnhub trade messages and WebSocket state
  - Implement WebSocket connection establishment using token from API endpoint
  - Add connection state tracking (connected, connecting, error, reconnectAttempt)
  - Implement message event listener that parses incoming trade data
  - Create price state management using React state (prices and timestamps maps)
  - Add cleanup logic to close connection and remove listeners on unmount
  - _Requirements: 1.1, 5.4, 5.5_

- [x] 3. Add subscription management to WebSocket hook
  - Implement `subscribe` function that sends subscription messages for ticker array
  - Implement `unsubscribe` function that sends unsubscribe messages for ticker array
  - Add subscription deduplication logic to prevent duplicate subscriptions to same ticker
  - Implement automatic subscription on connection open for provided tickers
  - Add resubscription logic when reconnecting after connection drop
  - _Requirements: 1.2, 4.5_

- [x] 4. Implement reconnection logic with exponential backoff
  - Add reconnection attempt counter and max attempts constant (5)
  - Implement exponential backoff calculation: `Math.min(1000 * 2^attempt, 30000)`
  - Create reconnection function that increments attempt counter and schedules retry
  - Add automatic reconnection trigger on WebSocket close and error events
  - Reset reconnection counter on successful connection
  - Implement fallback indicator when max reconnection attempts reached
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 5. Add message validation and error handling
  - Create `validateTradeMessage` function that checks message structure and data types
  - Validate that price (p) is a positive number before updating state
  - Add error logging for invalid messages without crashing the application
  - Implement try-catch blocks around message parsing and state updates
  - Add validation for required fields: type, data array, p, s, t, v
  - _Requirements: 5.2, 5.3_

- [x] 6. Create connection status indicator component
  - Create `src/components/portfolio-connection-status.tsx` component
  - Display connection state with color-coded indicators (green/yellow/red)
  - Show "Live" badge when connected with green pulse animation
  - Show "Connecting..." text with yellow indicator during connection
  - Show "Disconnected" with red indicator and retry button when disconnected
  - Display error messages when connection fails with actionable guidance
  - Add reconnect button that calls the reconnect callback function
  - _Requirements: 2.3, 2.4_

- [x] 7. Integrate WebSocket hook into PortfolioDashboardClient
  - Import and initialize `useFinnhubWebSocket` hook in PortfolioDashboardClient component
  - Extract unique ticker symbols from positions array
  - Pass tickers array to WebSocket hook for automatic subscription
  - Store live prices from WebSocket in component state
  - Merge live prices with position data before passing to child components
  - Add connection status component to dashboard header
  - Implement cleanup to unsubscribe when component unmounts
  - _Requirements: 1.1, 1.2, 1.5, 4.3_

- [x] 8. Update PortfolioPerformanceSummary to use live prices
  - Add optional `livePrices` prop to component interface
  - Modify price lookup logic to prefer live prices over stored last_price
  - Update price source indicator to show "websocket" when using live data
  - Ensure metrics recalculate when live prices change
  - Add timestamp display showing when prices were last updated
  - _Requirements: 1.3, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 9. Update PortfolioHoldingsTable to display live prices
  - Add optional `livePrices` prop to component interface
  - Modify last_price column to use live prices when available
  - Update price source indicator dot to show green pulse for WebSocket prices
  - Add tooltip to price indicator explaining "Live" vs "Stored" price sources
  - Ensure P/L calculations use live prices for accurate real-time metrics
  - _Requirements: 1.3, 3.1, 3.5_

- [x] 10. Implement portfolio change handling
  - Add useEffect that watches for portfolioId changes in PortfolioDashboardClient
  - Unsubscribe from previous portfolio's tickers when portfolioId changes
  - Extract new tickers from new portfolio positions
  - Subscribe to new portfolio's tickers after unsubscribing from old ones
  - Clear price state when switching portfolios to avoid stale data
  - _Requirements: 4.1, 4.2_

- [x] 11. Add HTTP polling fallback mechanism
  - Detect when WebSocket reconnection attempts exceed maximum (5 attempts)
  - Implement fallback to existing `fetchHoldings` HTTP polling mechanism
  - Display fallback status in connection indicator ("Using HTTP polling")
  - Add manual "Try WebSocket Again" button in connection status component
  - Log fallback event for monitoring and debugging purposes
  - _Requirements: 2.5_

- [x] 12. Implement debouncing for price updates
  - Add debounce utility function with 100ms delay for price state updates
  - Wrap price state setter with debounce to prevent excessive re-renders
  - Use useMemo for expensive portfolio metric calculations
  - Ensure debounced updates don't cause stale closures or memory leaks
  - _Requirements: 3.5_

- [ ]\* 13. Add comprehensive error logging
  - Log WebSocket connection events (connected, disconnected, error)
  - Log subscription and unsubscription events with ticker lists
  - Log price update events with ticker and price for debugging
  - Log validation errors for invalid messages with message details
  - Log reconnection attempts with attempt number and delay
  - Add error context (portfolioId, tickers) to all error logs
  - _Requirements: 5.3_

- [ ]\* 14. Write unit tests for WebSocket hook
  - Test hook initialization with correct default state
  - Test connection establishment and state updates
  - Test subscription message sending for ticker arrays
  - Test trade message parsing and price state updates
  - Test message validation rejects invalid messages
  - Test reconnection logic with exponential backoff timing
  - Test cleanup unsubscribes and closes connection properly
  - Test subscription deduplication for duplicate tickers
  - _Requirements: 5.4, 5.5_

- [ ]\* 15. Write integration tests for dashboard WebSocket integration
  - Test dashboard connects to WebSocket on mount
  - Test dashboard subscribes to all portfolio tickers
  - Test price updates trigger performance summary recalculation
  - Test holdings table displays live price indicator
  - Test dashboard unsubscribes and disconnects on unmount
  - Test portfolio change unsubscribes old and subscribes new tickers
  - Test fallback to HTTP polling after max reconnection attempts
  - Test connection status component displays correct states
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 4.1, 4.2, 4.3_
