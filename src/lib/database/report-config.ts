/**
 * Configuration mappings for ReportDataTable component
 * Defines status badge configurations and team tag configurations
 */

export interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color: string;
}

export interface TeamConfig {
  label: string;
  color: string;
}

/**
 * Status badge configuration mapping
 * Maps database status values to user-friendly display labels with styling
 */
export const statusConfig: Record<string, StatusConfig> = {
  processing: {
    label: 'In Process',
    variant: 'secondary',
    color: 'blue',
  },
  done: {
    label: 'Done',
    variant: 'default',
    color: 'green',
  },
  failed: {
    label: 'Failed',
    variant: 'destructive',
    color: 'red',
  },
  NEC: {
    label: 'Not Enough Coverage',
    variant: 'outline',
    color: 'gray',
  },
} as const;

/**
 * Team tag configuration mapping
 * Maps analyst team names to display labels and colors
 */
export const teamConfig: Record<string, TeamConfig> = {
  market: {
    label: 'Market',
    color: 'blue',
  },
  news: {
    label: 'News',
    color: 'green',
  },
  fundamentals: {
    label: 'Fundamentals',
    color: 'purple',
  },
  social: {
    label: 'Social',
    color: 'orange',
  },
} as const;

/**
 * Get status display configuration for a given status
 * @param status - Database status value
 * @returns StatusConfig - Configuration object for status display
 */
export function getStatusConfig(status: string): StatusConfig {
  const config = statusConfig[status];
  if (config) {
    return config;
  }
  // Default fallback to processing status
  return {
    label: 'In Process',
    variant: 'secondary',
    color: 'blue',
  };
}

/**
 * Get team display configuration for a given team
 * @param team - Team name
 * @returns TeamConfig - Configuration object for team display
 */
export function getTeamConfig(team: string): TeamConfig {
  return teamConfig[team] ?? { label: team, color: 'gray' };
}

/**
 * Get all available status options
 * @returns Array of status keys
 */
export function getAvailableStatuses(): string[] {
  return Object.keys(statusConfig);
}

/**
 * Get all available team options
 * @returns Array of team keys
 */
export function getAvailableTeams(): string[] {
  return Object.keys(teamConfig);
}

/**
 * Validate if a status is valid
 * @param status - Status to validate
 * @returns boolean - True if status is valid
 */
export function isValidStatus(status: string): boolean {
  return status in statusConfig;
}

/**
 * Validate if a team is valid
 * @param team - Team to validate
 * @returns boolean - True if team is valid
 */
export function isValidTeam(team: string): boolean {
  return team in teamConfig;
}