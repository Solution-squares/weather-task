/**
 * Application constants for pagination, refetch intervals, and other static values
 */

// Pagination constants
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  JOBS_PAGE_SIZE: 10,
  WEATHER_PAGE_SIZE: 10,
  ALL_WEATHER_PAGE_SIZE: 100,
  MAX_LIMIT_WEATHER: 100,
  MAX_LIMIT_ALL_WEATHER: 1000,
  MAX_LIMIT_JOBS: 100,
} as const;

// Refetch intervals (in milliseconds)
export const REFETCH_INTERVALS = {
  JOBS: 30000, // 30 seconds
} as const;

// Job refetch delay after creation (in milliseconds)
export const JOB_REFETCH_DELAY = 1000; // 1 second

