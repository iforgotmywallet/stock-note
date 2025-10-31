/**
 * Shared ticker utilities for ticker selection and data handling
 */

export interface TickerOption {
  ticker: string;
  name: string;
  displayName: string;
}

export interface FilteredTickerResults {
  popular: TickerOption[];
  others: TickerOption[];
}

// Popular tickers to show in a separate section
export const popularTickers = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "NFLX", "PYPL", "ADBE"
];

/**
 * Clean up ticker names by removing common suffixes
 */
export const cleanTickerName = (name: string): string => {
  if (!name) return name;
  
  // Split by " - " and take only the first part (company name)
  const parts = name.split(' - ');
  return parts[0] || name;
};

/**
 * Load ticker data from the public JSON file
 */
export const loadTickerData = async (): Promise<Record<string, string>> => {
  try {
    const response = await fetch("/tickers_to_names.json");
    const data = await response.json() as Record<string, string>;
    return data;
  } catch (error) {
    console.error("Failed to load ticker data:", error);
    return {};
  }
};

/**
 * Create ticker options with cleaned and truncated names
 */
export const createTickerOptions = (tickerData: Record<string, string>): TickerOption[] => {
  return Object.entries(tickerData).map(([ticker, name]) => {
    const cleanedName = cleanTickerName(name);
    const truncatedName = cleanedName.length > 50 ? `${cleanedName.substring(0, 50)}...` : cleanedName;
    return {
      ticker,
      name: cleanedName,
      displayName: `${ticker} - ${truncatedName}`
    };
  });
};

/**
 * Filter ticker options based on search query with relevance sorting
 */
export const filterTickerOptions = (
  tickerOptions: TickerOption[],
  searchQuery: string,
  tickerData: Record<string, string>,
  maxResults = 50
): FilteredTickerResults => {
  if (!searchQuery.trim()) {
    // When no search, show popular tickers + limited recent options
    const popularOptions = popularTickers
      .filter(ticker => tickerData[ticker])
      .map(ticker => ({
        ticker,
        name: tickerData[ticker] || '',
        displayName: `${ticker} - ${tickerData[ticker] || ''}`
      }));
    
    const otherOptions = tickerOptions
      .filter(option => !popularTickers.includes(option.ticker))
      .slice(0, 20); // Limit to first 20 when no search
    
    return { popular: popularOptions, others: otherOptions };
  }

  const query = searchQuery.toLowerCase();
  const matchingOptions = tickerOptions.filter(option => 
    option.ticker.toLowerCase().includes(query) || 
    option.name.toLowerCase().includes(query)
  );

  // Sort matches by relevance: exact ticker match > ticker starts with > name contains
  const sortedMatches = matchingOptions.sort((a, b) => {
    const aTickerLower = a.ticker.toLowerCase();
    const bTickerLower = b.ticker.toLowerCase();
    const aNameLower = a.name.toLowerCase();
    const bNameLower = b.name.toLowerCase();

    // Exact ticker match gets highest priority
    if (aTickerLower === query && bTickerLower !== query) return -1;
    if (bTickerLower === query && aTickerLower !== query) return 1;

    // Ticker starts with query gets second priority
    if (aTickerLower.startsWith(query) && !bTickerLower.startsWith(query)) return -1;
    if (bTickerLower.startsWith(query) && !aTickerLower.startsWith(query)) return 1;

    // Name starts with query gets third priority
    if (aNameLower.startsWith(query) && !bNameLower.startsWith(query)) return -1;
    if (bNameLower.startsWith(query) && !aNameLower.startsWith(query)) return 1;

    // Default alphabetical sort by ticker
    return aTickerLower.localeCompare(bTickerLower);
  });

  // Separate popular from others in search results
  const popularMatches = sortedMatches.filter(option => 
    popularTickers.includes(option.ticker)
  );
  
  const otherMatches = sortedMatches
    .filter(option => !popularTickers.includes(option.ticker))
    .slice(0, maxResults); // Limit search results

  return { popular: popularMatches, others: otherMatches };
};

/**
 * Truncate ticker name for display purposes
 */
export const truncateTickerName = (name: string, maxLength = 40): string => {
  if (!name) return name;
  return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
};

/**
 * Format ticker display with name truncation
 */
export const formatTickerDisplay = (ticker: string, name: string, maxNameLength = 25): string => {
  if (!name) return ticker;
  const truncatedName = truncateTickerName(name, maxNameLength);
  return `${ticker} - ${truncatedName}`;
};