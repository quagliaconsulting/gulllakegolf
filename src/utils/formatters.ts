/**
 * Collection of formatting utility functions
 */

/**
 * Format a date as a short date string (MM/DD/YYYY)
 */
export function formatDate(date: string | Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
}

/**
 * Format a date range between two dates
 */
export function formatDateRange(startDate: string | Date, endDate: string | Date): string {
  if (!startDate || !endDate) return '';
  return `${formatDate(startDate)} to ${formatDate(endDate)}`;
}

/**
 * Format a number to a specified number of decimal places
 */
export function formatNumber(num: number, decimals: number = 0): string {
  if (num === null || num === undefined) return '';
  return Number(num).toFixed(decimals);
}

/**
 * Format a handicap value (typically showing one decimal place)
 */
export function formatHandicap(handicap: number): string {
  if (handicap === null || handicap === undefined) return '';
  return Number(handicap).toFixed(1);
}

/**
 * Return the appropriate CSS class name for the given status
 */
export function getStatusClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'upcoming':
      return 'bg-blue-100 text-blue-800';
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Capitalize the first letter of each word in a string
 */
export function titleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}