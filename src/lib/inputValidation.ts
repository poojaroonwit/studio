import { NextRequest } from 'next/server';
import { z } from 'zod';

/**
 * Security-focused input validation utilities
 */

// Common validation schemas
export const commonSchemas = {
  uuid: z.string().uuid('Invalid UUID format'),
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Name contains invalid characters'),
  text: z.string().max(1000, 'Text too long'),
  longText: z.string().max(10000, 'Text too long'),
  url: z.string().url('Invalid URL format').max(2048, 'URL too long'),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format'),
  date: z.string().datetime('Invalid date format'),
  positiveInt: z.number().int().positive('Must be a positive integer'),
  nonNegativeInt: z.number().int().min(0, 'Must be non-negative'),
  boolean: z.boolean(),
  json: z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid JSON format')
};

// Sanitization functions
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could break SQL
    .replace(/[;]/g, '') // Remove semicolons
    .replace(/[--]/g, '') // Remove SQL comment markers
    .replace(/[\/\*]/g, '') // Remove SQL comment markers
    .substring(0, 1000); // Limit length
}

export function sanitizeFileName(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid characters
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .substring(0, 255); // Limit length
}

export function sanitizeSearchQuery(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>'";]/g, '') // Remove potentially dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 500); // Limit length
}

// Validation middleware
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return {
      success: false,
      errors: ['Invalid input format']
    };
  }
}

// Request parameter validation
export function validateSearchParams(
  searchParams: URLSearchParams,
  allowedParams: string[]
): Record<string, string> {
  const validated: Record<string, string> = {};
  
  for (const [key, value] of searchParams.entries()) {
    if (allowedParams.includes(key) && typeof value === 'string') {
      validated[key] = sanitizeString(value);
    }
  }
  
  return validated;
}

// File upload validation
export const fileUploadSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().max(50 * 1024 * 1024), // 50MB max
  type: z.string().regex(/^(application\/pdf|image\/(jpeg|jpg|png|gif)|text\/plain|application\/(msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document))$/, 'Invalid file type')
});

// API request validation
export function validateApiRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; errors: string[]; status: number }> {
  return new Promise(async (resolve) => {
    try {
      const contentType = request.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        resolve({
          success: false,
          errors: ['Content-Type must be application/json'],
          status: 400
        });
        return;
      }
      
      const body = await request.json();
      const validation = validateRequest(schema, body);
      
      if (validation.success) {
        resolve({ success: true, data: validation.data });
      } else {
        resolve({
          success: false,
          errors: validation.errors,
          status: 400
        });
      }
    } catch (error) {
      resolve({
        success: false,
        errors: ['Invalid JSON in request body'],
        status: 400
      });
    }
  });
}

// Rate limiting validation
export function validateRateLimit(
  request: NextRequest,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  // This would integrate with your existing rate limiting system
  // For now, return true - implement with Redis or similar
  return true;
}

// SQL injection prevention helpers
export function escapeSqlIdentifier(identifier: string): string {
  // Only allow alphanumeric characters and underscores
  return identifier.replace(/[^a-zA-Z0-9_]/g, '');
}

export function escapeSqlValue(value: string): string {
  // This should be handled by parameterized queries, but as a backup:
  return value.replace(/'/g, "''"); // Escape single quotes
}

// XSS prevention
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// CSRF token validation (if needed)
export function validateCsrfToken(request: NextRequest, token: string): boolean {
  const csrfToken = request.headers.get('x-csrf-token');
  return csrfToken === token;
}
