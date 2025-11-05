# Market Hours Price Switching Implementation

## Overview
Implemented automatic switching between WebSocket (live) and HTTP polling based on US market hours (9:30 AM - 4:00 PM EST, Monday-Friday).

## Changes Made

### 1. Market Hours Utility (`src/lib/utils/market-hours.ts`)
- `isMarketHours()`: Checks if current time is within market hours (9:30 AM - 4:00 PM EST, weekdays only)
- `getNextMarketOpen()`: Returns the next market open time
- `getNextMarketClose()`: Returns the next market close time
- Handles timezone conversion to EST/EDT
- Excludes weekends (Saturday/Sunday)

### 2. Portfolio Prices Hook (`src/hooks/use-portfolio-prices.ts`)
New custom hook that manages price fetching strategy:
- **During Market Hours (9:30 AM - 4:00 PM EST)**: Uses WebSocket for real-time prices
- **Outside Market Hours**: Uses HTTP polling with 1-second intervals
- Automatically checks market hours every minute
- Returns unified interface with prices, timestamps, and source information
- Handles loading states and errors

### 3. Portfolio Dashboard Client (`src/components/portfolio-dashboard-client.tsx`)
Updated to use the new `usePortfolioPrices` hook:
- Replaced direct `useFinnhubWebSocket` usage with `usePortfolioPrices`
- Simplified portfolio change handling (removed WebSocket subscription management)
- Added market status display in UI ("Market Open - Live prices" vs "Market Closed - Prices via HTTP polling")
- Passes `isMarketOpen` prop to child components

### 4. Performance Summary (`src/components/portfolio-performance-summary.tsx`)
- Added `isMarketOpen` prop
- Updated badge to show "Market Closed" when market is closed
- Shows "Connecting..." when market is open but WebSocket not yet connected

### 5. Type Definitions
Updated `PortfolioPositionWithMetrics` in:
- `src/lib/database/portfolios.ts`
- `src/components/portfolio-holdings-table.tsx`
- Changed `price_source` from `'live'` to `'live' | 'delayed'` to support both sources

## Behavior

### Market Hours (Mon-Fri 9:30 AM - 4:00 PM EST)
- WebSocket connection established automatically
- Real-time price updates via Finnhub WebSocket
- Badge shows "Live" with green pulsing indicator
- Price source: "websocket"

### Outside Market Hours
- HTTP polling every 1 second
- Fetches prices via `/api/portfolio/prices` endpoint
- Badge shows "Market Closed"
- Price source: "http"
- Respects rate limits (1 second between requests)

## Testing
Current time: Wednesday, November 5, 2025, 9:52 AM EST
Market status: OPEN ✅
Expected behavior: Using WebSocket for live prices

## Benefits
1. **Efficient Resource Usage**: Only uses WebSocket during market hours when real-time data matters
2. **Continuous Updates**: HTTP polling ensures prices are updated even when market is closed
3. **Automatic Switching**: No manual intervention needed, switches based on time
4. **User Transparency**: Clear indication of price source and market status
5. **Rate Limit Friendly**: HTTP polling respects API rate limits with 1-second intervals
