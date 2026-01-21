/**
 * System API Keys CRUD Endpoint
 * 
 * Manages system API keys for v2 API authentication.
 * 
 * GET  - List all API keys (masked)
 * POST - Create a new API key (returns full key only once)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { 
  listApiKeys, 
  createApiKey, 
  getAvailablePermissions,
  getAvailableRoles 
} from '@/lib/systemApiKeyManager';
import { 
  SimpleErrorHandler,
  createValidationError, 
  createUnauthorizedError,
  createForbiddenError,
  createInternalServerError 
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * Check if user has permission to manage API keys
 */
async function checkPermission(req: NextRequest): Promise<{ authorized: boolean; userId?: string; error?: Response }> {
  const session = await auth();
  
  if (!session?.user) {
    return { 
      authorized: false, 
      error: SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required')) 
    };
  }
  
  // Only admins can manage API keys
  if (session.user.role !== 'Admin') {
    return { 
      authorized: false, 
      error: SimpleErrorHandler.handleApiError(req, createForbiddenError('Admin access required to manage API keys')) 
    };
  }
  
  return { authorized: true, userId: session.user.id };
}

/**
 * GET /api/settings/system-api-keys
 * 
 * List all API keys with their metadata (keys are masked)
 */
export async function GET(req: NextRequest) {
  const permCheck = await checkPermission(req);
  if (!permCheck.authorized) {
    return permCheck.error;
  }
  
  try {
    const apiKeys = await listApiKeys();
    const permissions = getAvailablePermissions();
    const roles = getAvailableRoles();
    
    return SimpleErrorHandler.createSuccessResponse(req, {
      success: true,
      data: {
        apiKeys: apiKeys.map(key => ({
          ...key,
          // Mask the key prefix for display
          maskedKey: `${key.keyPrefix}...`
        })),
        availablePermissions: permissions,
        availableRoles: roles
      }
    }, 200);
  } catch (error) {
    console.error('[SystemApiKeys] Error listing API keys:', error);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError('Failed to list API keys'));
  }
}

/**
 * POST /api/settings/system-api-keys
 * 
 * Create a new API key
 * 
 * Body:
 * {
 *   "name": "My Integration",
 *   "description": "API key for n8n integration",
 *   "permissions": ["read:candidates", "write:candidates"],
 *   "role": "api_user",
 *   "expiresAt": "2025-12-31T23:59:59Z" | null (never expires)
 * }
 */
export async function POST(req: NextRequest) {
  const permCheck = await checkPermission(req);
  if (!permCheck.authorized) {
    return permCheck.error;
  }
  
  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return SimpleErrorHandler.handleApiError(req, createValidationError('Name is required'));
    }
    
    if (body.name.length > 100) {
      return SimpleErrorHandler.handleApiError(req, createValidationError('Name must be 100 characters or less'));
    }
    
    // Parse expiration date
    let expiresAt: Date | null = null;
    if (body.expiresAt !== undefined && body.expiresAt !== null) {
      expiresAt = new Date(body.expiresAt);
      if (isNaN(expiresAt.getTime())) {
        return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid expiration date format'));
      }
      if (expiresAt <= new Date()) {
        return SimpleErrorHandler.handleApiError(req, createValidationError('Expiration date must be in the future'));
      }
    }
    
    // Validate permissions array
    const permissions = Array.isArray(body.permissions) ? body.permissions : [];
    
    // Create the API key
    const result = await createApiKey({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      permissions,
      role: body.role || 'api_user',
      expiresAt,
      createdById: permCheck.userId
    });
    
    if (!result.success) {
      return SimpleErrorHandler.handleApiError(req, createInternalServerError(result.error || 'Failed to create API key'));
    }
    
    // Return the full API key (only shown once!)
    return SimpleErrorHandler.createSuccessResponse(req, {
      success: true,
      message: 'API key created successfully. Save this key - it will only be shown once!',
      apiKey: result.apiKey, // Full key - save it now!
      data: {
        ...result.data,
        maskedKey: `${result.data?.keyPrefix}...`
      }
    }, 201);
  } catch (error) {
    console.error('[SystemApiKeys] Error creating API key:', error);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError('Failed to create API key'));
  }
}
