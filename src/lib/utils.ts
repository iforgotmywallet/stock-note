import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract hash portion from session ID
 * Format: TICKER_DATE_TIMESTAMP_HASH -> HASH
 *
 * @param sessionId - The session ID string to extract hash from
 * @returns The hash portion of the session ID, or the full sessionId if extraction fails
 *
 * @example
 * extractHashFromSessionId("AAPL_2025-09-13_1694612345_a1b2c3d4") // returns "a1b2c3d4"
 * extractHashFromSessionId("malformed") // returns "malformed"
 * extractHashFromSessionId("") // returns ""
 */
export function extractHashFromSessionId(sessionId: string): string {
  // Handle edge cases
  if (!sessionId || typeof sessionId !== "string") {
    return sessionId || "";
  }

  // Split by underscore and get the last part
  const parts = sessionId.split("_");

  // If we have at least 4 parts (ticker, date, timestamp, hash), return the hash
  // Otherwise, return the full sessionId as fallback
  if (parts.length >= 4) {
    const hash = parts[parts.length - 1];
    // Ensure the hash part is not empty
    return hash || sessionId;
  }

  // Fallback: return the full sessionId if format doesn't match expected pattern
  return sessionId;
}

/**
 * Extract local time from session ID timestamp
 * Format: TICKER_DATE_TIMESTAMP_HASH -> converts TIMESTAMP to local Date
 *
 * @param sessionId - The session ID string to extract timestamp from
 * @returns Date object in local time, or null if extraction fails
 *
 * @example
 * extractLocalTimeFromSessionId("AAPL_2025-09-13_1694612345_a1b2c3d4") // returns Date object
 * extractLocalTimeFromSessionId("malformed") // returns null
 * extractLocalTimeFromSessionId("") // returns null
 */
export function extractLocalTimeFromSessionId(sessionId: string): Date | null {
  // Handle edge cases
  if (!sessionId || typeof sessionId !== "string") {
    return null;
  }

  // Split by underscore to get parts
  const parts = sessionId.split("_");

  // If we have at least 4 parts (ticker, date, timestamp, hash), extract timestamp
  if (parts.length >= 4) {
    const timestampStr = parts[2]; // Third part should be the timestamp

    // Ensure timestampStr exists and is not empty
    if (!timestampStr) {
      return null;
    }

    // Validate that it's a valid number
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || timestamp <= 0) {
      return null;
    }

    // Convert Unix timestamp to Date (assuming it's in seconds, multiply by 1000 for milliseconds)
    // If timestamp is already in milliseconds (13+ digits), use as-is
    const timestampMs =
      timestampStr.length >= 13 ? timestamp : timestamp * 1000;

    try {
      const date = new Date(timestampMs);
      // Validate the date is valid
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch (error) {
      return null;
    }
  }

  return null;
}

/**
 * Calculate effective allocation per ticker, normalizing if total exceeds 100%
 *
 * @param allocation - The desired allocation per ticker (0.1 = 10%)
 * @param tickersCount - Number of tickers in the portfolio
 * @param allowLeverage - Whether to allow total allocation > 100%
 * @returns The effective allocation per ticker
 *
 * @example
 * getEffectiveAllocation(0.2, 3, false) // returns 0.067 (6.7% each, normalized from 60% total)
 * getEffectiveAllocation(0.1, 5, false) // returns 0.1 (10% each, 50% total is fine)
 * getEffectiveAllocation(0.3, 4, true) // returns 0.3 (30% each, 120% total allowed)
 */
export function getEffectiveAllocation(
  allocation: number,
  tickersCount: number,
  allowLeverage = false,
) {
  const total = allocation * tickersCount;
  if (allowLeverage || total <= 1) return allocation;
  // normalize if over 100%
  return allocation / total;
}
