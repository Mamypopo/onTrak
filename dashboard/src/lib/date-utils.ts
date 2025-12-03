import { formatDistanceToNow } from "date-fns";

/**
 * Safely parse a date string to Date object
 * Returns null if the date is invalid or null/undefined
 * 
 * @param dateString - Date string to parse (can be null or undefined)
 * @returns Date object or null if invalid
 * 
 * @example
 * safeParseDate("2024-01-01T00:00:00Z") // Date object
 * safeParseDate(null) // null
 * safeParseDate("invalid") // null
 */
export function safeParseDate(dateString: string | null | undefined | Date): Date | null {
  // If already a Date object, return it if valid
  if (dateString instanceof Date) {
    return isNaN(dateString.getTime()) ? null : dateString;
  }
  
  if (!dateString) return null;
  
  // Handle both ISO string and timestamp number
  let date: Date;
  if (typeof dateString === 'number') {
    date = new Date(dateString);
  } else if (typeof dateString === 'string') {
    // Try parsing as ISO string first
    date = new Date(dateString);
    // If that fails, try as timestamp string
    if (isNaN(date.getTime()) && /^\d+$/.test(dateString)) {
      date = new Date(Number(dateString));
    }
  } else {
    return null;
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date value:', dateString, typeof dateString);
    return null;
  }
  
  return date;
}

/**
 * Safely format distance to now with fallback
 * Returns a fallback string if the date is invalid
 * 
 * @param dateString - Date string to format (can be null or undefined)
 * @param options - Options for formatDistanceToNow (optional)
 * @param fallback - Fallback text when date is invalid (default: "ไม่ทราบ")
 * @returns Formatted date string or fallback
 * 
 * @example
 * safeFormatDistanceToNow("2024-01-01T00:00:00Z") // "2 days ago"
 * safeFormatDistanceToNow(null) // "ไม่ทราบ"
 * safeFormatDistanceToNow("invalid", undefined, "N/A") // "N/A"
 */
export function safeFormatDistanceToNow(
  dateString: string | number | null | undefined | Date,
  options?: { addSuffix?: boolean },
  fallback: string = "ไม่ทราบ"
): string {
  const date = safeParseDate(dateString);
  
  if (!date) {
    return fallback;
  }
  
  try {
    return formatDistanceToNow(date, options);
  } catch (error) {
    console.warn("Error formatting date:", error);
    return fallback;
  }
}

