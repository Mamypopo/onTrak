import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts a user-friendly error message from various error types.
 * @param error The error object (can be anything).
 * @param defaultMessage A fallback message if no specific message can be found.
 * @returns A string representing the error message.
 */
export function getErrorMessage(error: any, defaultMessage = "An unknown error occurred"): string {
  if (!error) {
    return defaultMessage;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return defaultMessage;
}
