import { NextRequest } from 'next/server';
import sanitizeHtmlLib from 'sanitize-html';
import validator from 'validator';

/**
 * Security utilities for input validation and sanitization
 */

// XSS Protection
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  return sanitizeHtmlLib(input, {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
    allowedAttributes: {}
  });
}

// Rich HTML Sanitization (for email templates, descriptions, etc.)
export function sanitizeRichHtml(input: string): string {
  if (typeof input !== 'string') return '';
  return sanitizeHtmlLib(input, {
    allowedTags: [
      'div', 'span', 'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'strike',
      'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'ul', 'ol', 'li',
      'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'pre', 'code'
    ],
    allowedAttributes: {
      '*': [
        'style', 'class', 'id', 'href', 'target', 'src', 'alt', 'title',
        'width', 'height', 'align', 'valign', 'colspan', 'rowspan',
        'border', 'cellpadding', 'cellspacing'
      ],
      'a': ['href', 'name', 'target'],
      'img': ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading']
    },
    // Allows mailto: and tel: protocols in addition to http/https
    allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'tel', 'data'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data']
    },
    allowProtocolRelative: true
  });
}

export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

// NOTE: SQL injection protection is handled by Prisma's parameterized queries
// This function was removed as it was overly aggressive and could break legitimate queries
// Prisma automatically sanitizes all queries using parameterized statements

// Path Traversal Protection
export function sanitizePath(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/\/\//g, '/') // Remove double slashes
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
    .trim();
}

// Email validation
export function validateEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  return validator.isEmail(email) && email.length <= 254;
}

// Password validation
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof password !== 'string') {
    errors.push('Password must be a string');
    return { valid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }

  return { valid: errors.length === 0, errors };
}

// UUID validation
export function validateUuid(uuid: string): boolean {
  if (typeof uuid !== 'string') return false;
  // Use regex pattern to validate UUID format (more permissive than validator.isUUID)
  // This allows system UUIDs like 00000000-0000-0000-0000-000000000001
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// File upload validation
export async function validateFileUpload(
  filename: string,
  mimetype: string,
  size: number
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Check file size using standardized limit
  const { securityConfig } = await import('@/lib/securityConfig');
  const maxSize = securityConfig.fileUpload.maxSize; // 10MB for documents
  if (size > maxSize) {
    errors.push(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
  }

  // Check filename
  const sanitizedFilename = sanitizePath(filename);
  if (sanitizedFilename !== filename) {
    errors.push('Invalid filename');
  }

  // Check file extension
  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.txt', '.rtf',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp',
    '.xlsx', '.xls', '.csv'
  ];

  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    errors.push('File type not allowed');
  }

  // Check MIME type
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ];

  if (!allowedMimeTypes.includes(mimetype)) {
    errors.push('MIME type not allowed');
  }

  return { valid: errors.length === 0, errors };
}

// Request validation
export function validateRequest(req: NextRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-originating-ip',
    'x-remote-ip',
    'x-remote-addr'
  ];

  for (const header of suspiciousHeaders) {
    if (req.headers.get(header)) {
      errors.push(`Suspicious header detected: ${header}`);
    }
  }

  // Check User-Agent
  const userAgent = req.headers.get('user-agent');
  if (!userAgent || userAgent.length > 500) {
    errors.push('Invalid or missing User-Agent');
  }

  // Check for SQL injection patterns in URL
  const url = req.url.toLowerCase();
  const sqlPatterns = [
    'union select', 'drop table', 'delete from', 'insert into',
    'update set', 'create table', 'alter table', 'exec(',
    'execute(', 'sp_', 'xp_', '0x', 'char(', 'ascii('
  ];

  for (const pattern of sqlPatterns) {
    if (url.includes(pattern)) {
      errors.push('Potential SQL injection detected');
      break;
    }
  }

  // Check for XSS patterns in URL
  const xssPatterns = [
    '<script', 'javascript:', 'onload=', 'onerror=', 'onclick=',
    'onmouseover=', 'onfocus=', 'onblur=', 'onchange=',
    'onkeydown=', 'onkeyup=', 'onkeypress=', 'onmousedown=',
    'onmouseup=', 'onmousemove=', 'onmouseout=', 'onmouseenter=',
    'onmouseleave=', 'oncontextmenu=', 'ondblclick=', 'oninput=',
    'oninvalid=', 'onreset=', 'onselect=', 'onsubmit='
  ];

  for (const pattern of xssPatterns) {
    if (url.includes(pattern)) {
      errors.push('Potential XSS attack detected');
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitizes a URL to prevent XSS (e.g., javascript: URIs).
 * Allows http, https, mailto, tel, and relative paths.
 * Returns an empty string if the URL is invalid or unsafe.
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';

  // Allow relative paths
  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('?')) {
    return url;
  }

  // Check for safe protocols
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
  try {
    const parsedUrl = new URL(url);
    if (safeProtocols.includes(parsedUrl.protocol)) {
      return url;
    }
  } catch (e) {
    // If it's not a valid URL but doesn't start with / # ?, it might be unsafe (e.g., "javascript:...")
    // However, some relative paths might not parse with new URL() if base is not provided.
    // We already handled obvious relative paths above.
    // If it's something like "www.google.com" without protocol, it's ambiguous.
    // But typically we expect full URLs or relative paths.

    // Strict check for dangerous protocols that could execute code
    const dangerousProtocols = ['javascript:', 'vbscript:', 'data:text/html'];
    const lowerUrl = url.trim().toLowerCase();
    if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
      return '';
    }

    // If it looks like a domain but no protocol, we might want to allow it or prepend https://
    // For now, let's be strict and return empty if it doesn't match safe criteria
    return '';
  }

  return '';
}

// Input sanitization for API requests
export function sanitizeApiInput(input: any): any {
  if (typeof input === 'string') {
    return sanitizeText(input);
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeApiInput(item));
  }

  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = sanitizeText(key);
      sanitized[sanitizedKey] = sanitizeApiInput(value);
    }
    return sanitized;
  }

  return input;
}

// CSRF token validation
export function validateCsrfToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false;
  return token === sessionToken;
}

// Session security validation
export function validateSessionSecurity(session: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!session) {
    errors.push('No session found');
    return { valid: false, errors };
  }

  if (!session.user) {
    errors.push('No user in session');
    return { valid: false, errors };
  }

  if (!session.user.id) {
    errors.push('No user ID in session');
    return { valid: false, errors };
  }

  if (!validateUuid(session.user.id)) {
    errors.push('Invalid user ID format');
    return { valid: false, errors };
  }

  // Check session age (max 30 days)
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  if (session.expires && new Date(session.expires).getTime() - Date.now() > maxAge) {
    errors.push('Session expired');
    return { valid: false, errors };
  }

  return { valid: errors.length === 0, errors };
}
