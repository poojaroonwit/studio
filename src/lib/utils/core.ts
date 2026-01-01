/**
 * Core Utilities
 * Basic utility functions used throughout the application
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine class names with Tailwind merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Detect if text contains Thai characters
 */
export function containsThaiText(text: string): boolean {
  if (!text) return false;
  const thaiRegex = /[\u0E00-\u0E7F]/;
  return thaiRegex.test(text);
}

/**
 * Get appropriate font class based on text content
 */
export function getFontClass(text: string, defaultClass: string = 'font-sans'): string {
  if (containsThaiText(text)) {
    return 'font-ibm-plex-sans-thai';
  }
  return 'font-inter';
}

/**
 * Get appropriate font family CSS value based on text content
 */
export function getFontFamily(text: string): string {
  if (containsThaiText(text)) {
    return 'var(--font-family-primary)';
  }
  return 'var(--font-family-secondary)';
}

/**
 * Safely ensures a value is an array
 */
export function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Safely parses JSON string or returns a default value if parsing fails
 */
export function safeJsonParse<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) {
    return defaultValue;
  }
  
  try {
    if (typeof jsonString === 'string') {
      return JSON.parse(jsonString);
    } else if (typeof jsonString === 'object') {
      return jsonString as T;
    }
    return defaultValue;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
}
