import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  validateRequest, 
  sanitizeApiInput, 
  validateSessionSecurity,
  validateCsrfToken 
} from '@/lib/security';
import { logAudit } from '@/lib/auditLog';
import { securityConfig } from '@/lib/securityConfig';

/**
 * Get client IP address from request
 */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  // Fallback to connection remote address if available
  const connection = (req as any).connection;
  if (connection && connection.remoteAddress) {
    return connection.remoteAddress;
  }
  
  return 'unknown';
}

/**
 * API Security wrapper for protecting API endpoints
 */

export interface ApiSecurityOptions {
  requireAuth?: boolean;
  requirePermission?: string;
  rateLimit?: boolean;
  validateInput?: boolean;
  logAccess?: boolean;
  allowedMethods?: string[];
}

/**
 * Secure API handler wrapper
 */
export function withApiSecurity(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  options: ApiSecurityOptions = {}
) {
  return async (req: NextRequest, context: any): Promise<NextResponse> => {
    const {
      requireAuth = true,
      requirePermission,
      rateLimit = true,
      validateInput = true,
      logAccess = true,
      allowedMethods = ['GET', 'POST', 'PUT', 'DELETE']
    } = options;

    try {
      // Skip security checks during Next.js production build phase
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return NextResponse.json({ error: 'Service unavailable during build' }, { status: 503 });
      }

      // Additional build-time check: if request object is not properly initialized
      if (!req || !req.method || !req.headers) {
        return NextResponse.json({ error: 'Service unavailable during build' }, { status: 503 });
      }

      // 1. Method validation
      if (!allowedMethods.includes(req.method)) {
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        );
      }

      // 2. Request validation
      let requestValidation;
      try {
        requestValidation = validateRequest(req);
      } catch (error) {
        // During build time, validation might fail
        console.warn('[API SECURITY] Request validation failed during build:', error);
        return NextResponse.json({ error: 'Service unavailable during build' }, { status: 503 });
      }
      
      if (!requestValidation.valid) {
        try {
          await logAudit(
            'WARN',
            `Security violation detected: ${requestValidation.errors.join(', ')}`,
            'API:Security',
            null,
            { 
              ip: getClientIP(req),
              userAgent: req.headers.get('user-agent'),
              url: req.url,
              errors: requestValidation.errors
            }
          );
        } catch (error) {
          // During build time, logging might fail
          console.warn('[API SECURITY] Audit logging failed during build:', error);
        }
        
        return NextResponse.json(
          { error: 'Invalid request', details: requestValidation.errors },
          { status: 400 }
        );
      }

      // 3. Authentication check
      if (requireAuth) {
        let session;
        try {
          session = await getServerSession(authOptions);
        } catch (error) {
          // During build time, session might not be available
          console.warn('[API SECURITY] Session check failed during build:', error);
          return NextResponse.json({ error: 'Service unavailable during build' }, { status: 503 });
        }
        
        if (!session) {
          return NextResponse.json(
            { error: 'Unauthorized', message: 'Authentication required' },
            { status: 401 }
          );
        }

        // 4. Session security validation
        let sessionValidation;
        try {
          sessionValidation = validateSessionSecurity(session);
        } catch (error) {
          // During build time, session validation might fail
          console.warn('[API SECURITY] Session validation failed during build:', error);
          return NextResponse.json({ error: 'Service unavailable during build' }, { status: 503 });
        }
        
        if (!sessionValidation.valid) {
          try {
            await logAudit(
              'WARN',
              `Invalid session detected: ${sessionValidation.errors.join(', ')}`,
              'API:Session',
              session.user?.id,
              { errors: sessionValidation.errors }
            );
          } catch (error) {
            // During build time, logging might fail
            console.warn('[API SECURITY] Audit logging failed during build:', error);
          }
          
          return NextResponse.json(
            { error: 'Invalid session', message: 'Please sign in again' },
            { status: 401 }
          );
        }

        // 5. Permission check
        if (requirePermission) {
          const hasPermission = session.user?.modulePermissions?.includes(requirePermission);
          if (!hasPermission) {
            try {
              await logAudit(
                'WARN',
                `Insufficient permissions for ${requirePermission}`,
                'API:Permission',
                session.user.id,
                { 
                  requiredPermission: requirePermission,
                  userPermissions: session.user.modulePermissions 
                }
              );
            } catch (error) {
              // During build time, logging might fail
              console.warn('[API SECURITY] Audit logging failed during build:', error);
            }
            
            return NextResponse.json(
              { 
                error: 'Forbidden', 
                message: `Insufficient permissions to ${requirePermission.toLowerCase().replace('_', ' ')}` 
              },
              { status: 403 }
            );
          }
        }

        // 6. CSRF protection for state-changing operations
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
          const csrfToken = req.headers.get('x-csrf-token');
          const sessionToken = req.cookies && typeof req.cookies.get === 'function' 
            ? req.cookies.get('next-auth.csrf-token')?.value 
            : undefined;
          
          let csrfValid;
          try {
            csrfValid = validateCsrfToken(csrfToken || '', sessionToken || '');
          } catch (error) {
            // During build time, CSRF validation might fail
            console.warn('[API SECURITY] CSRF validation failed during build:', error);
            return NextResponse.json({ error: 'Service unavailable during build' }, { status: 503 });
          }
          
          if (!csrfValid) {
            try {
              await logAudit(
                'WARN',
                'CSRF token validation failed',
                'API:CSRF',
                session.user.id,
                { method: req.method, url: req.url }
              );
            } catch (error) {
              // During build time, logging might fail
              console.warn('[API SECURITY] Audit logging failed during build:', error);
            }
            
            return NextResponse.json(
              { error: 'CSRF token validation failed' },
              { status: 403 }
            );
          }
        }

        // 7. Input validation and sanitization
        if (validateInput && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
          try {
            const body = await req.json();
            const sanitizedBody = sanitizeApiInput(body);
            
            // Replace the request body with sanitized version
            req.json = () => Promise.resolve(sanitizedBody);
          } catch (error) {
            return NextResponse.json(
              { error: 'Invalid request body' },
              { status: 400 }
            );
          }
        }

        // 8. Access logging
        if (logAccess) {
          try {
            await logAudit(
              'AUDIT',
              `API access: ${req.method} ${req.nextUrl?.pathname || 'unknown'}`,
              'API:Access',
              session.user.id,
              { 
                method: req.method,
                path: req.nextUrl?.pathname || 'unknown',
                query: req.nextUrl?.searchParams ? Object.fromEntries(req.nextUrl.searchParams) : {},
                userAgent: req.headers.get('user-agent'),
                ip: getClientIP(req)
              }
            );
          } catch (error) {
            // During build time, logging might fail
            console.warn('[API SECURITY] Access logging failed during build:', error);
          }
        }
      }

      // 9. Execute the actual handler
      const response = await handler(req, context);

      // 10. Add security headers to response
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

      return response;

    } catch (error) {
      console.error('[API SECURITY] Error in security wrapper:', error);
      
      await logAudit(
        'ERROR',
        `API security wrapper error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'API:Security',
        null,
        { 
          error: error instanceof Error ? error.stack : String(error),
          url: req.url,
          method: req.method
        }
      );

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * File upload security validation
 */
export async function validateFileUploadSecurity(
  req: NextRequest,
  file: { name: string; type: string; size: number }
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check file size
    if (file.size > securityConfig.fileUpload.maxSize) {
      return {
        valid: false,
        error: `File size exceeds limit of ${securityConfig.fileUpload.maxSize / (1024 * 1024)}MB`
      };
    }

    // Check file type
    if (!securityConfig.fileUpload.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not allowed'
      };
    }

    // Check file extension
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!securityConfig.fileUpload.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: 'File extension not allowed'
      };
    }

    // Check for malicious filenames
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      return {
        valid: false,
        error: 'Invalid filename'
      };
    }

    return { valid: true };

  } catch (error) {
    console.error('[FILE UPLOAD SECURITY] Error:', error);
    return {
      valid: false,
      error: 'File validation error'
    };
  }
}

/**
 * API response sanitization
 */
export function sanitizeApiResponse(data: any): any {
  if (typeof data === 'string') {
    return data.replace(/[<>]/g, '');
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeApiResponse(item));
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Remove sensitive fields
      if (securityConfig.audit.sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeApiResponse(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Security headers for API responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  
  if (securityConfig.environment.isProduction) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  return response;
}
