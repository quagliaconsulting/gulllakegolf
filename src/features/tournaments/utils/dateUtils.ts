// Helper function to format dates consistently
export function formatDate(dateString: string) {
  if (!dateString) return '';
  
  // Create a date object and handle timezone issues
  const date = new Date(dateString);
  
  // Format the date consistently with month/day/year
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC' // Use UTC to avoid timezone shifts
  });
}

// Helper function to format ordinal numbers (1st, 2nd, 3rd, etc.)
export function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

// Helper function to calculate duration in days
export function calculateDurationDays(startDateStr: string, endDateStr: string) {
  if (!startDateStr || !endDateStr) return 0;
  
  try {
    // Parse dates and force noon UTC time to avoid timezone issues
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // Set both to noon UTC
    startDate.setUTCHours(12, 0, 0, 0);
    endDate.setUTCHours(12, 0, 0, 0);
    
    // Calculate difference in days
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  } catch (error) {
    console.error("Error calculating duration:", error);
    return 0;
  }
}