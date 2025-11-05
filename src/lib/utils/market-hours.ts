/**
 * Utility functions for checking market hours and determining price fetching strategy
 */

/**
 * Check if current time is within US market hours (9:30 AM - 4:00 PM EST)
 * @returns true if within market hours, false otherwise
 */
export function isMarketHours(): boolean {
  const now = new Date();
  
  // Convert current time to EST/EDT
  const estTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  
  const hours = estTime.getHours();
  const minutes = estTime.getMinutes();
  const day = estTime.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Check if it's a weekday (Monday-Friday)
  if (day === 0 || day === 6) {
    return false;
  }
  
  // Convert time to minutes since midnight for easier comparison
  const currentMinutes = hours * 60 + minutes;
  const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM
  const marketCloseMinutes = 16 * 60; // 4:00 PM
  
  return currentMinutes >= marketOpenMinutes && currentMinutes < marketCloseMinutes;
}

/**
 * Get the next market open time
 * @returns Date object representing the next market open
 */
export function getNextMarketOpen(): Date {
  const now = new Date();
  const estTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  
  const nextOpen = new Date(estTime);
  nextOpen.setHours(9, 30, 0, 0);
  
  // If market already opened today or it's after market close, move to next day
  if (estTime.getHours() >= 16 || (estTime.getHours() === 9 && estTime.getMinutes() >= 30)) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }
  
  // Skip weekends
  while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }
  
  return nextOpen;
}

/**
 * Get the next market close time
 * @returns Date object representing the next market close
 */
export function getNextMarketClose(): Date {
  const now = new Date();
  const estTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  
  const nextClose = new Date(estTime);
  nextClose.setHours(16, 0, 0, 0);
  
  // If market already closed today, move to next day
  if (estTime.getHours() >= 16) {
    nextClose.setDate(nextClose.getDate() + 1);
    
    // Skip weekends
    while (nextClose.getDay() === 0 || nextClose.getDay() === 6) {
      nextClose.setDate(nextClose.getDate() + 1);
    }
  }
  
  return nextClose;
}
