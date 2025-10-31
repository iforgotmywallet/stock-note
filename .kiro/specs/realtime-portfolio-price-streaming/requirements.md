# Requirements Document

## Introduction

This feature implements real-time price streaming for the portfolio dashboard using Finnhub WebSocket API. The system will subscribe to trade data for all tickers in a user's portfolio and update the UI with live price changes, replacing the current HTTP polling mechanism with a WebSocket-based streaming solution.

## Glossary

- **Portfolio Dashboard**: The UI component displaying portfolio holdings, performance metrics, and recent actions
- **Finnhub WebSocket**: The WebSocket API provided by Finnhub for real-time market data streaming
- **Trade Message**: A WebSocket message containing trade data with price, symbol, timestamp, and volume
- **Price Stream**: Continuous flow of price updates received via WebSocket connection
- **Ticker Symbol**: A unique identifier for a stock or security (e.g., "AAPL", "TSLA")
- **WebSocket Client**: The browser-side component managing the WebSocket connection
- **Last Price**: The most recent trade price (field "p" in Finnhub trade messages)

## Requirements

### Requirement 1

**User Story:** As a portfolio owner, I want to see real-time price updates for my holdings, so that I can monitor my portfolio value without manually refreshing the page

#### Acceptance Criteria

1. WHEN the Portfolio Dashboard loads, THE WebSocket Client SHALL establish a connection to Finnhub WebSocket API using the API token from environment variables
2. WHEN the WebSocket connection opens, THE WebSocket Client SHALL subscribe to trade data for all ticker symbols present in the portfolio
3. WHEN a trade message is received for a subscribed ticker, THE Portfolio Dashboard SHALL update the displayed current price with the "p" field value from the message
4. WHEN the portfolio value changes due to price updates, THE Portfolio Dashboard SHALL recalculate and display the updated total portfolio value
5. WHEN the Portfolio Dashboard unmounts, THE WebSocket Client SHALL unsubscribe from all ticker symbols and close the connection

### Requirement 2

**User Story:** As a portfolio owner, I want the system to handle connection issues gracefully, so that temporary network problems don't break my dashboard experience

#### Acceptance Criteria

1. IF the WebSocket connection fails to establish, THEN THE Portfolio Dashboard SHALL display an error indicator and attempt to reconnect with exponential backoff
2. IF the WebSocket connection drops unexpectedly, THEN THE WebSocket Client SHALL automatically attempt to reconnect and resubscribe to all tickers
3. WHILE the WebSocket is disconnected, THE Portfolio Dashboard SHALL display a connection status indicator showing "disconnected" or "reconnecting"
4. WHEN the WebSocket reconnects successfully, THE Portfolio Dashboard SHALL remove the error indicator and resume displaying real-time updates
5. IF reconnection fails after 5 attempts, THEN THE Portfolio Dashboard SHALL fall back to HTTP polling for price data

### Requirement 3

**User Story:** As a portfolio owner, I want accurate performance metrics based on real-time prices, so that I can make informed investment decisions

#### Acceptance Criteria

1. WHEN a new price is received via WebSocket, THE Portfolio Dashboard SHALL recalculate the position value as (shares × current price)
2. WHEN position values change, THE Portfolio Dashboard SHALL recalculate total portfolio value as the sum of all position values
3. WHEN portfolio value changes, THE Portfolio Dashboard SHALL recalculate gain/loss metrics comparing current value to cost basis
4. WHEN portfolio value changes, THE Portfolio Dashboard SHALL update percentage change calculations with precision to 2 decimal places
5. THE Portfolio Dashboard SHALL update all dependent UI components (performance summary, holdings table) within 100 milliseconds of receiving a price update

### Requirement 4

**User Story:** As a portfolio owner with multiple portfolios, I want the system to manage WebSocket subscriptions efficiently, so that switching between portfolios is seamless

#### Acceptance Criteria

1. WHEN the user navigates to a different portfolio, THE WebSocket Client SHALL unsubscribe from the previous portfolio's tickers
2. WHEN the user navigates to a different portfolio, THE WebSocket Client SHALL subscribe to the new portfolio's tickers
3. WHEN the user navigates away from the portfolio page, THE WebSocket Client SHALL close the connection and clean up all subscriptions
4. THE WebSocket Client SHALL maintain only one active connection per browser session
5. WHEN multiple positions share the same ticker symbol, THE WebSocket Client SHALL subscribe to that ticker only once

### Requirement 5

**User Story:** As a developer, I want the WebSocket implementation to be secure and maintainable, so that the system is reliable and easy to update

#### Acceptance Criteria

1. THE WebSocket Client SHALL retrieve the Finnhub API token from environment variables without exposing it in client-side code
2. THE WebSocket Client SHALL validate incoming trade messages to ensure they contain required fields (p, s, t, v) before processing
3. THE WebSocket Client SHALL log connection events and errors to the console for debugging purposes
4. THE Portfolio Dashboard SHALL handle WebSocket state using React hooks to ensure proper cleanup and prevent memory leaks
5. THE WebSocket implementation SHALL be encapsulated in a reusable custom hook that can be used by other components
