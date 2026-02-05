/**
 * System API Key Individual Operations Endpoint
 * 
 * Handles single API key operations:
 * GET    - Get API key details
 * PATCH  - Update API key (name, description, permissions, isActive)
 * DELETE - Permanently delete API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { 
  getApiKeyById, 
  updateApiKey, 
  deleteApiKey,
  revokeApiKey 
} from '@/lib/systemApiKeyManager';
import { 
  SimpleErrorHandler,
  createValidationError, 
  createUnauthorizedError,
  createForbiddenError,
  createNotFoundError,
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
 * GET /api/settings/system-api-keys/[id]
 * 
 * Get a single API key's details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permCheck = await checkPermission(req);
  if (!permCheck.authorized) {
    return permCheck.error;
  }
  
  const { id } = await params;
  
  try {
    const apiKey = await getApiKeyById(id);
    
    if (!apiKey) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('API key not found'));
    }
    
    return SimpleErrorHandler.createSuccessResponse(req, {
      success: true,
      data: {
        ...apiKey,
        maskedKey: `${apiKey.keyPrefix}...`
      }
    }, 200);
  } catch (error) {
    console.error('[SystemApiKeys] Error getting API key:', error);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError('Failed to get API key'));
  }
}

/**
 * PATCH /api/settings/system-api-keys/[id]
 * 
 * Update an API key
 * 
 * Body:
 * {
 *   "name": "Updated Name",
 *   "description": "Updated description",
 *   "permissions": ["read:applicants"],
 *   "role": "api_user",
 *   "isActive": true,
 *   "expiresAt": "2025-12-31T23:59:59Z" | null
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permCheck = await checkPermission(req);
  if (!permCheck.authorized) {
    return permCheck.error;
  }
  
  const { id } = await params;
  
  try {
    // Check if API key exists
    const existing = await getApiKeyById(id);
    if (!existing) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('API key not found'));
    }
    
    const body = await req.json();
    const updates: any = {};
    
    // Validate and set updates
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return SimpleErrorHandler.handleApiError(req, createValidationError('Name cannot be empty'));
      }
      if (body.name.length > 100) {
        return SimpleErrorHandler.handleApiError(req, createValidationError('Name must be 100 characters or less'));
      }
      updates.name = body.name.trim();
    }
    
    if (body.description !== undefined) {
      updates.description = body.description?.trim() || null;
    }
    
    if (body.isActive !== undefined) {
      updates.isActive = Boolean(body.isActive);
    }
    
    if (body.expiresAt !== undefined) {
      if (body.expiresAt === null) {
        updates.expiresAt = null;
      } else {
        const expiresAt = new Date(body.expiresAt);
        if (isNaN(expiresAt.getTime())) {
          return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid expiration date format'));
        }
        updates.expiresAt = expiresAt;
      }
    }
    
    // No updates provided
    if (Object.keys(updates).length === 0) {
      return SimpleErrorHandler.handleApiError(req, createValidationError('No valid updates provided'));
    }
    
    const updated = await updateApiKey(id, updates, permCheck.userId);
    
    if (!updated) {
      return SimpleErrorHandler.handleApiError(req, createInternalServerError('Failed to update API key'));
    }
    
    return SimpleErrorHandler.createSuccessResponse(req, {
      success: true,
      message: 'API key updated successfully',
      data: {
        ...updated,
        maskedKey: `${updated.keyPrefix}...`
      }
    }, 200);
  } catch (error) {
    console.error('[SystemApiKeys] Error updating API key:', error);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError('Failed to update API key'));
  }
}

/**
 * DELETE /api/settings/system-api-keys/[id]
 * 
 * Permanently delete an API key
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permCheck = await checkPermission(req);
  if (!permCheck.authorized) {
    return permCheck.error;
  }
  
  const { id } = await params;
  
  try {
    const deleted = await deleteApiKey(id, permCheck.userId);
    
    if (!deleted) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('API key not found'));
    }
    
    return SimpleErrorHandler.createSuccessResponse(req, {
      success: true,
      message: 'API key deleted successfully'
    }, 200);
  } catch (error) {
    console.error('[SystemApiKeys] Error deleting API key:', error);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError('Failed to delete API key'));
  }
}
