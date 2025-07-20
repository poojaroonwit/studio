import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple HTML sanitizer to prevent XSS attacks
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Remove potentially dangerous tags and attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/<input\b[^>]*>/gi, '')
    .replace(/<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi, '')
    .replace(/<select\b[^<]*(?:(?!<\/select>)<[^<]*)*<\/select>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/<a\b[^>]*href\s*=\s*["'](javascript|vbscript|data):[^"']*["'][^>]*>/gi, '');
}

// Thai text detection utility
export function containsThaiText(text: string): boolean {
  if (!text) return false;
  
  // Thai Unicode range: \u0E00-\u0E7F
  const thaiRegex = /[\u0E00-\u0E7F]/;
  return thaiRegex.test(text);
}

// Get appropriate font class based on text content
export function getFontClass(text: string, defaultClass: string = 'font-sans'): string {
  if (containsThaiText(text)) {
    return 'font-anuphan';
  }
  return 'font-inter';
}

// Get appropriate font family CSS value based on text content
export function getFontFamily(text: string): string {
  if (containsThaiText(text)) {
    return 'var(--font-anuphan), var(--font-inter), Arial, Helvetica, sans-serif';
  }
  return 'var(--font-inter), Arial, Helvetica, sans-serif';
}

/**
 * Safely ensures a value is an array, returning an empty array if it's not
 * This helps prevent "forEach is not a function" errors
 */
export function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Safely executes forEach on a value, ensuring it's an array first
 * This helps prevent "forEach is not a function" errors
 */
export function safeForEach<T>(
  value: T[] | null | undefined, 
  callback: (item: T, index: number, array: T[]) => void
): void {
  const array = ensureArray(value);
  array.forEach(callback);
}

/**
 * Safely executes map on a value, ensuring it's an array first
 * This helps prevent "map is not a function" errors
 */
export function safeMap<T, U>(
  value: T[] | null | undefined, 
  callback: (item: T, index: number, array: T[]) => U
): U[] {
  const array = ensureArray(value);
  return array.map(callback);
}

/**
 * Safely executes filter on a value, ensuring it's an array first
 * This helps prevent "filter is not a function" errors
 */
export function safeFilter<T>(
  value: T[] | null | undefined, 
  callback: (item: T, index: number, array: T[]) => boolean
): T[] {
  const array = ensureArray(value);
  return array.filter(callback);
}
