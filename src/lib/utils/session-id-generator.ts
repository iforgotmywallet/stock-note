import { createHash, randomUUID } from "crypto";

/**
 * Generate unique session ID using ticker, date, timestamp, and hash code.
 * Format: {ticker}_{date}_{timestamp}_{hashcode}
 * Example: AAPL_2025-09-13_1694612345_a1b2c3d4
 *
 * @param ticker - Stock ticker symbol (e.g., 'AAPL')
 * @param analysisDate - Analysis date in YYYY-MM-DD format
 * @returns Unique session ID string with guaranteed uniqueness
 * @throws Error if ticker or date format is invalid
 */
export function generateSessionId(
  ticker: string,
  analysisDate: string,
): string {
  // Validate inputs
  if (!ticker || typeof ticker !== "string") {
    throw new Error("Ticker must be a non-empty string");
  }

  if (!analysisDate || typeof analysisDate !== "string") {
    throw new Error("Analysis date must be a non-empty string");
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(analysisDate)) {
    throw new Error("Analysis date must be in YYYY-MM-DD format");
  }

  // Validate that it's a real date
  const parsedDate = new Date(analysisDate);
  if (
    isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== analysisDate
  ) {
    throw new Error("Analysis date must be a valid date");
  }

  // Clean ticker (uppercase, alphanumeric only)
  const cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleanTicker) {
    throw new Error("Ticker must contain alphanumeric characters");
  }

  // Get current Unix timestamp
  const timestamp = Math.floor(Date.now() / 1000);

  // Generate hash code for guaranteed uniqueness and race condition prevention
  // Combine ticker, date, timestamp, and a random UUID for maximum uniqueness
  const uuid = randomUUID().replace(/-/g, ""); // Remove hyphens to match Python uuid4().hex
  const uniqueString = `${cleanTicker}_${analysisDate}_${timestamp}_${uuid}`;

  // Create SHA256 hash
  const hashObject = createHash("sha256");
  hashObject.update(uniqueString);

  // Use first 8 characters for brevity
  const hashCode = hashObject.digest("hex").substring(0, 8);

  return `${cleanTicker}_${analysisDate}_${timestamp}_${hashCode}`;
}

/**
 * Validates that a ticker is a non-empty string containing alphanumeric characters
 * @param ticker - The ticker symbol to validate
 * @returns true if valid, false otherwise
 */
export function validateTicker(ticker: string): boolean {
  if (!ticker || typeof ticker !== "string") {
    return false;
  }

  // Clean ticker and check if it has alphanumeric characters
  const cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleanTicker.length > 0;
}

/**
 * Validates that a date follows YYYY-MM-DD format and is a valid date
 * @param date - The date string to validate
 * @returns true if valid, false otherwise
 */
export function validateDate(date: string): boolean {
  if (!date || typeof date !== "string") {
    return false;
  }

  // Check YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  // Validate that it's a real date
  const parsedDate = new Date(date);
  return (
    !isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === date
  );
}

/**
 * Interface for the session ID generator utility
 */
export interface SessionIdGenerator {
  generateSessionId(ticker: string, analysisDate: string): string;
  validateTicker(ticker: string): boolean;
  validateDate(date: string): boolean;
}

/**
 * Session ID generator implementation
 */
export const sessionIdGenerator: SessionIdGenerator = {
  generateSessionId,
  validateTicker,
  validateDate,
};
