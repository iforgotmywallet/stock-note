import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
