/**
 * V2 API Login Endpoint
 * 
 * Authenticates using API key and returns the same response format as v1 login.
 * Supports API key via:
 * - Request body: { "apiKey": "sk_live_..." }
 * - Header: X-API-Key: sk_live_...
 * - Header: Authorization: Bearer sk_live_... (for n8n compatibility)
 * 
 * This endpoint is designed for external system/service integration (e.g., n8n, Zapier).
 */

import { NextRequest } from 'next/server';
import { encode } from 'next-auth/jwt';
import { handleCors } from '@/lib/cors';
import { validateApiKey, ApiKeyData } from '@/lib/systemApiKeyManager';
import { 
  SimpleErrorHandler,
  createValidationError, 
  createUnauthorizedError, 
  createInternalServerError 
} from '@/lib/errors';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Extract API key from request (body, headers)
 * Priority: X-API-Key header > Authorization Bearer > Request body
 */
async function extractApiKey(req: NextRequest): Promise<string | null> {
  // Check X-API-Key header (most common for API integrations)
  const xApiKey = req.headers.get('x-api-key');
  if (xApiKey) {
    return xApiKey;
  }
  
  // Check Authorization header (Bearer token format for n8n compatibility)
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch && bearerMatch[1].startsWith('sk_')) {
      return bearerMatch[1];
    }
  }
  
  // Check request body
  try {
    const body = await req.json();
    if (body.apiKey) {
      return body.apiKey;
    }
  } catch {
    // Body parsing failed, continue
  }
  
  return null;
}

/**
 * Get client IP address from request
 */
function getClientIp(req: NextRequest): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip') 
    || undefined;
}

/**
 * POST /api/v2/auth/login
 * 
 * Authenticate with an API key and receive a JWT token.
 * Response format matches v1 /api/v1/auth/login for compatibility.
 */
export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  
  // Extract API key from request
  const apiKey = await extractApiKey(req);
  
  if (!apiKey) {
    return SimpleErrorHandler.handleApiError(
      req, 
      createValidationError('API key is required. Provide via X-API-Key header, Authorization: Bearer header, or request body.')
    );
  }
  
  // Quick format validation
  if (!apiKey.startsWith('sk_live_') && !apiKey.startsWith('sk_test_')) {
    try {
      await logAudit('WARN', 'Invalid API key format attempted', 'API:V2:Auth:Login', null, { 
        ip: clientIp,
        keyPrefix: apiKey.substring(0, 8) 
      });
    } catch (_) {}
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Invalid API key format'));
  }
  
  // Check NEXTAUTH_SECRET
  if (!process.env.NEXTAUTH_SECRET) {
    return SimpleErrorHandler.handleApiError(
      req, 
      createInternalServerError('Server misconfiguration: NEXTAUTH_SECRET is not set')
    );
  }
  
  try {
    // Validate the API key
    const validation = await validateApiKey(apiKey, clientIp);
    
    if (!validation.valid || !validation.data) {
      try {
        await logAudit('WARN', `Failed v2 API login: ${validation.error}`, 'API:V2:Auth:Login', null, { 
          ip: clientIp,
          error: validation.error 
        });
      } catch (_) {}
      return SimpleErrorHandler.handleApiError(req, createUnauthorizedError(validation.error || 'Invalid API key'));
    }
    
    const keyData: ApiKeyData = validation.data;
    
    // Generate JWT token (same format as v1)
    const isSecure = process.env.NODE_ENV === 'production';
    const salt = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    
    // Build permissions and role (default to full access as roles/perms are removed from DB)
    const modulePermissions = ['*'];
    const role = 'api_user';
    
    const token = await encode({
      token: {
        id: keyData.id,
        email: `api-key-${keyData.keyPrefix}@system`,
        name: `API: ${keyData.name}`,
        role,
        modulePermissions,
        isSystemUser: true,
        apiKeyId: keyData.id,
        // Set expiration to 1 hour from now (or key expiration if sooner)
        exp: calculateTokenExpiration(keyData.expiresAt),
        iat: Math.floor(Date.now() / 1000),
      },
      secret: process.env.NEXTAUTH_SECRET,
      salt,
    });
    
    try {
      await logAudit(
        'AUDIT', 
        `API key "${keyData.name}" authenticated via v2 API`, 
        'API:V2:Auth:Login', 
        null, 
        { keyId: keyData.id, keyPrefix: keyData.keyPrefix, ip: clientIp }
      );
    } catch (_) {}
    
    // Return response matching v1 format
    return SimpleErrorHandler.createSuccessResponse(req, { 
      success: true, 
      token, 
      tokenType: 'JWE',
      expiresIn: 3600, // 1 hour in seconds
      user: { 
        id: keyData.id, 
        email: `api-key-${keyData.keyPrefix}@system`,
        name: `API: ${keyData.name}`, 
        role, 
        modulePermissions,
        isSystemUser: true 
      } 
    }, 200);
    
  } catch (error) {
    console.error('[V2 Auth] Error during authentication:', error);
    try {
      await logAudit('ERROR', `V2 API authentication error: ${(error as Error).message}`, 'API:V2:Auth:Login', null, { ip: clientIp });
    } catch (_) {}
    return SimpleErrorHandler.handleApiError(req, createInternalServerError('Error during authentication'));
  }
}

/**
 * Calculate token expiration timestamp
 * Returns the earlier of: 1 hour from now, or key expiration
 */
function calculateTokenExpiration(keyExpiresAt: Date | null): number {
  const oneHourFromNow = Math.floor(Date.now() / 1000) + (60 * 60);
  
  if (!keyExpiresAt) {
    return oneHourFromNow;
  }
  
  const keyExpiration = Math.floor(new Date(keyExpiresAt).getTime() / 1000);
  return Math.min(oneHourFromNow, keyExpiration);
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
}
