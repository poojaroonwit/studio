import { type ClassValue, clsx } from "clsx"
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
 * Safely parses JSON string or returns a default value if parsing fails
 * @param jsonString - The JSON string to parse
 * @param defaultValue - The default value to return if parsing fails
 * @returns The parsed object or the default value
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
    console.error('Raw JSON string:', jsonString);
    return defaultValue;
  }
}

export { formatScoreWithGrade } from './scoreUtils';

// Safe array utilities to prevent "filter is not a function" errors
export function safeArray<T>(input: T[] | null | undefined | any): T[] {
  if (Array.isArray(input)) {
    return input;
  }
  return [];
}

export function safeFilter<T>(
  array: T[] | null | undefined | any, 
  predicate: (value: unknown, index: number, array: unknown[]) => boolean
): T[] {
  const safeArrayValue = safeArray(array);
  return safeArrayValue.filter(predicate) as T[];
}

export function safeMap<T, U>(
  array: T[] | null | undefined | any, 
  mapper: (value: unknown, index: number, array: unknown[]) => U
): U[] {
  const safeArrayValue = safeArray(array);
  return safeArrayValue.map(mapper);
}

export function safeFind<T>(
  array: T[] | null | undefined | any, 
  predicate: (value: T, index: number, array: T[]) => boolean
): T | undefined {
  const safeArrayValue = Array.isArray(array) ? array : [];
  return safeArrayValue.find(predicate);
}

export function safeSome<T>(
  array: T[] | null | undefined | any, 
  predicate: (value: T, index: number, array: T[]) => boolean
): boolean {
  const safeArrayValue = Array.isArray(array) ? array : [];
  return safeArrayValue.some(predicate);
}

export function safeEvery<T>(
  array: T[] | null | undefined | any, 
  predicate: (value: T, index: number, array: T[]) => boolean
): boolean {
  const safeArrayValue = Array.isArray(array) ? array : [];
  return safeArrayValue.every(predicate);
}

export function safeLength(array: any[] | null | undefined | any): number {
  return Array.isArray(array) ? array.length : 0;
}

export function safeSlice<T>(
  array: T[] | null | undefined | any, 
  start?: number, 
  end?: number
): T[] {
  const safeArrayValue = Array.isArray(array) ? array : [];
  return safeArrayValue.slice(start, end);
}
