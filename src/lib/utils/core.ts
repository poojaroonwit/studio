/**
 * Core Utilities
 * Basic utility functions used throughout the application
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  containsThaiText as containsThaiTextShared,
  getFontClass as getFontClassShared,
  getFontFamily as getFontFamilyShared,
} from "../fontUtils";

/** Combine class names with Tailwind merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Detect if text contains Thai characters using the shared typography utility. */
export function containsThaiText(text: string): boolean {
  return containsThaiTextShared(text);
}

/**
 * Get the semantic font class while keeping the legacy optional defaultClass
 * argument compatible for existing callers.
 */
export function getFontClass(text: string, defaultClass: string = 'font-sans'): string {
  if (!text && defaultClass) return defaultClass;
  return getFontClassShared(text);
}

/** Get the single application font family contract. */
export function getFontFamily(text: string): string {
  return getFontFamilyShared(text);
}

/** Safely ensures a value is an array. */
export function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Safely parses JSON text or returns a default value if parsing fails.
 * Existing object values are returned as-is for callers that receive pre-parsed DB driver values.
 */
export function safeJsonParse<T>(jsonValue: unknown, defaultValue: T): T {
  if (jsonValue === null || jsonValue === undefined || jsonValue === '') {
    return defaultValue;
  }

  if (typeof jsonValue === 'object') {
    return jsonValue as T;
  }

  if (typeof jsonValue !== 'string') {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonValue) as T;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
}
