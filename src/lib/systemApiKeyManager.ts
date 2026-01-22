/**
 * System API Key Manager
 * 
 * Handles creation, validation, and management of API keys for v2 API authentication.
 * API keys are stored with SHA-256 hashes for security - the full key is only shown once at creation.
 * 
 * Best practices implemented:
 * - Keys use format: sk_live_<random> for production, sk_test_<random> for development
 * - Only hash is stored in database, prefix shown for identification
 * - Automatic expiration checking
 * - Rate limiting support via usage tracking
 * - Audit logging for all key operations
 */

import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import crypto from 'crypto';

// Key prefix format for API keys
const KEY_PREFIX_PROD = 'sk_live_';
const KEY_PREFIX_DEV = 'sk_test_';

/**
 * Get the appropriate key prefix based on environment
 */
function getKeyPrefix(): string {
  return process.env.NODE_ENV === 'production' ? KEY_PREFIX_PROD : KEY_PREFIX_DEV;
}

/**
 * Generate a cryptographically secure random API key
 * Format: sk_live_<32 random hex characters> (total ~44 chars)
 */
export function generateApiKey(): string {
  const prefix = getKeyPrefix();
  const randomBytes = crypto.randomBytes(24); // 24 bytes = 48 hex chars
  const randomPart = randomBytes.toString('base64url'); // URL-safe base64
  return `${prefix}${randomPart}`;
}

/**
 * Hash an API key using SHA-256
 * @param key - The full API key
 * @returns SHA-256 hash of the key
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Extract the prefix portion of an API key for display
 * @param key - The full API key
 * @returns First 12 characters of the key
 */
export function getKeyDisplayPrefix(key: string): string {
  return key.substring(0, 12);
}

/**
 * Mask an API key for display (show prefix and last 4 chars)
 * @param keyPrefix - The key prefix stored in DB
 * @returns Masked key like "sk_live_abc...xyz1"
 */
export function maskApiKey(keyPrefix: string): string {
  return `${keyPrefix}...`;
}

export interface CreateApiKeyInput {
  name: string;
  description?: string;
  expiresAt?: Date | null; // null = never expires
  createdById?: string;
}

export interface ApiKeyData {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  isActive: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  usageCount: number;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApiKeyResult {
  success: boolean;
  apiKey?: string; // Full key - only returned on creation
  data?: ApiKeyData;
  error?: string;
}

export interface ValidateApiKeyResult {
  valid: boolean;
  data?: ApiKeyData;
  error?: string;
}

/**
 * Create a new API key
 * @param input - Key creation parameters
 * @returns The created key data including the full key (only shown once)
 */
export async function createApiKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const fullKey = generateApiKey();
    const keyHash = hashApiKey(fullKey);
    const keyPrefix = getKeyDisplayPrefix(fullKey);
    
    const result = await client.query(
      `INSERT INTO "SystemApiKey" 
        (name, description, key_prefix, key_hash, is_active, expires_at, created_by_id, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        input.name,
        input.description || null,
        keyPrefix,
        keyHash,
        true,
        input.expiresAt || null,
        input.createdById || null
      ]
    );
    
    const row = result.rows[0];
    const apiKeyData: ApiKeyData = mapRowToApiKeyData(row);
    
    await logAudit(
      'AUDIT',
      `API key "${input.name}" created`,
      'SystemApiKey:Create',
      input.createdById || null,
      { keyId: apiKeyData.id, keyPrefix }
    );
    
    return {
      success: true,
      apiKey: fullKey, // Return full key only on creation
      data: apiKeyData
    };
  } catch (error) {
    console.error('[SystemApiKey] Error creating API key:', error);
    await logAudit(
      'ERROR',
      `Failed to create API key "${input.name}": ${(error as Error).message}`,
      'SystemApiKey:Create',
      input.createdById || null
    );
    return {
      success: false,
      error: 'Failed to create API key'
    };
  } finally {
    client.release();
  }
}

/**
 * Validate an API key and return associated data
 * Also updates usage statistics
 * @param key - The full API key to validate
 * @param ipAddress - Optional IP address of the request
 * @returns Validation result with key data if valid
 */
export async function validateApiKey(
  key: string,
  ipAddress?: string
): Promise<ValidateApiKeyResult> {
  // Quick format validation
  if (!key || (!key.startsWith(KEY_PREFIX_PROD) && !key.startsWith(KEY_PREFIX_DEV))) {
    return { valid: false, error: 'Invalid API key format' };
  }
  
  const keyHash = hashApiKey(key);
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // Find the key by hash
    const result = await client.query(
      `SELECT * FROM "SystemApiKey" WHERE key_hash = $1`,
      [keyHash]
    );
    
    if (result.rows.length === 0) {
      return { valid: false, error: 'API key not found' };
    }
    
    const row = result.rows[0];
    const apiKeyData = mapRowToApiKeyData(row);
    
    // Check if key is active
    if (!apiKeyData.isActive) {
      return { valid: false, error: 'API key is disabled' };
    }
    
    // Check expiration
    if (apiKeyData.expiresAt && new Date(apiKeyData.expiresAt) < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }
    
    // Update usage statistics (fire and forget)
    client.query(
      `UPDATE "SystemApiKey" 
       SET last_used_at = NOW(), 
           last_used_ip = $1, 
           usage_count = usage_count + 1,
           "updatedAt" = NOW()
       WHERE id = $2`,
      [ipAddress || null, apiKeyData.id]
    ).catch((err: any) => console.error('[SystemApiKey] Failed to update usage stats:', err));
    
    return { valid: true, data: apiKeyData };
  } catch (error) {
    console.error('[SystemApiKey] Error validating API key:', error);
    return { valid: false, error: 'Failed to validate API key' };
  } finally {
    client.release();
  }
}

/**
 * List all API keys (without the actual key values)
 * @returns Array of API key data
 */
export async function listApiKeys(): Promise<ApiKeyData[]> {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      `SELECT * FROM "SystemApiKey" ORDER BY "createdAt" DESC`
    );
    
    return result.rows.map(mapRowToApiKeyData);
  } catch (error) {
    console.error('[SystemApiKey] Error listing API keys:', error);
    return [];
  }
}

/**
 * Get a single API key by ID
 * @param id - The API key ID
 * @returns The API key data or null
 */
export async function getApiKeyById(id: string): Promise<ApiKeyData | null> {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      `SELECT * FROM "SystemApiKey" WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return mapRowToApiKeyData(result.rows[0]);
  } catch (error) {
    console.error('[SystemApiKey] Error getting API key:', error);
    return null;
  }
}

/**
 * Update an API key
 * @param id - The API key ID
 * @param updates - Fields to update
 * @param updatedById - User making the update
 * @returns Updated API key data or null
 */
export async function updateApiKey(
  id: string,
  updates: Partial<Pick<ApiKeyData, 'name' | 'description' | 'isActive' | 'expiresAt'>>,
  updatedById?: string
): Promise<ApiKeyData | null> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const setClauses: string[] = ['"updatedAt" = NOW()'];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }
    if (updates.expiresAt !== undefined) {
      setClauses.push(`expires_at = $${paramIndex++}`);
      values.push(updates.expiresAt);
    }
    
    values.push(id);
    
    const result = await client.query(
      `UPDATE "SystemApiKey" SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const apiKeyData = mapRowToApiKeyData(result.rows[0]);
    
    await logAudit(
      'AUDIT',
      `API key "${apiKeyData.name}" updated`,
      'SystemApiKey:Update',
      updatedById || null,
      { keyId: id, updates: Object.keys(updates) }
    );
    
    return apiKeyData;
  } catch (error) {
    console.error('[SystemApiKey] Error updating API key:', error);
    return null;
  } finally {
    client.release();
  }
}

/**
 * Delete an API key permanently
 * @param id - The API key ID
 * @param deletedById - User performing the deletion
 * @returns True if deleted, false otherwise
 */
export async function deleteApiKey(id: string, deletedById?: string): Promise<boolean> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // Get key info for audit log
    const keyResult = await client.query(
      `SELECT name, key_prefix FROM "SystemApiKey" WHERE id = $1`,
      [id]
    );
    
    if (keyResult.rows.length === 0) {
      return false;
    }
    
    const keyName = keyResult.rows[0].name;
    const keyPrefix = keyResult.rows[0].key_prefix;
    
    const result = await client.query(
      `DELETE FROM "SystemApiKey" WHERE id = $1`,
      [id]
    );
    
    if (result.rowCount && result.rowCount > 0) {
      await logAudit(
        'AUDIT',
        `API key "${keyName}" (${keyPrefix}...) deleted`,
        'SystemApiKey:Delete',
        deletedById || null,
        { keyId: id }
      );
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[SystemApiKey] Error deleting API key:', error);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Revoke (disable) an API key
 * @param id - The API key ID
 * @param revokedById - User performing the revocation
 * @returns True if revoked, false otherwise
 */
export async function revokeApiKey(id: string, revokedById?: string): Promise<boolean> {
  const result = await updateApiKey(id, { isActive: false }, revokedById);
  
  if (result) {
    await logAudit(
      'AUDIT',
      `API key "${result.name}" revoked`,
      'SystemApiKey:Revoke',
      revokedById || null,
      { keyId: id }
    );
    return true;
  }
  
  return false;
}

/**
 * Map database row to ApiKeyData interface
 */
function mapRowToApiKeyData(row: any): ApiKeyData {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    keyPrefix: row.key_prefix,
    isActive: row.is_active,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    lastUsedIp: row.last_used_ip,
    usageCount: row.usage_count,
    createdById: row.created_by_id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}


