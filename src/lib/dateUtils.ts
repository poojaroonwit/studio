import { format, parseISO, isValid } from 'date-fns';
import { toZonedTime } from 'date-fns-tz/toZonedTime';
import { fromZonedTime } from 'date-fns-tz/fromZonedTime';

// Default timezone for the application (Thailand)
// Can be overridden by APP_TIMEZONE environment variable
const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Bangkok';

/**
 * Creates a date in the specified timezone and converts it to UTC for database storage
 * @param timezone - The timezone to create the date in (defaults to Asia/Bangkok or APP_TIMEZONE)
 * @returns Date object in UTC
 */
export function createDateInTimezone(timezone: string = DEFAULT_TIMEZONE): Date {
  const now = new Date();
  // For database storage, we want to store the current time as UTC
  // The timezone parameter is used for display purposes later
  return now;
}

/**
 * Converts a UTC date from the database to the user's local timezone for display
 * @param utcDate - The UTC date from the database
 * @param timezone - The timezone to convert to (ignored, uses browser's local timezone)
 * @returns Date object in the user's local timezone
 */
export function convertUtcToTimezone(utcDate: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  // Return the date as-is since the browser will handle timezone conversion
  return date;
}

/**
 * Formats a date for display in the user's local timezone
 * @param date - The date to format
 * @param formatString - The format string (defaults to 'MMM d, yyyy HH:mm')
 * @param timezone - The timezone to display in (ignored, uses browser's local timezone)
 * @returns Formatted date string
 */
export function formatDateInTimezone(
  date: Date | string, 
  formatString: string = 'MMM d, yyyy HH:mm',
  timezone: string = DEFAULT_TIMEZONE
): string {
  const utcDate = typeof date === 'string' ? parseISO(date) : date;
  // Use the browser's local timezone for display instead of forcing a specific timezone
  return format(utcDate, formatString);
}

/**
 * Gets the current timezone offset in hours
 * @param timezone - The timezone to get offset for (defaults to Asia/Bangkok or APP_TIMEZONE)
 * @returns Timezone offset in hours
 */
export function getTimezoneOffset(timezone: string = DEFAULT_TIMEZONE): number {
  const now = new Date();
  const utcDate = toZonedTime(now, timezone);
  const offsetMs = utcDate.getTime() - now.getTime();
  return offsetMs / (1000 * 60 * 60); // Convert to hours
}

/**
 * Gets the current application timezone
 * @returns The current timezone string
 */
export function getApplicationTimezone(): string {
  return DEFAULT_TIMEZONE;
}
