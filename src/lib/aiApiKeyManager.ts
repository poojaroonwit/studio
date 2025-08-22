import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';

export interface ApiKeyConfig {
  key: string;
  priority: number;
  isActive: boolean;
  lastUsed?: Date;
  lastError?: string;
  errorCount: number;
}

export interface ApiKeyResult {
  success: boolean;
  apiKey?: string;
  error?: string;
  keyIndex?: number;
  attempts: number;
}

/**
 * Get all AI API keys from system settings, ordered by priority
 */
export async function getApiKeys(): Promise<ApiKeyConfig[]> {
  const client = await getPool().connect();
  try {
    // Get all API key settings
    const result = await client.query(`
      SELECT key, value, "updatedAt" 
      FROM "SystemSetting" 
      WHERE key LIKE 'geminiApiKey%' 
      ORDER BY key
    `);
    
    const apiKeys: ApiKeyConfig[] = [];
    
    // Parse the results
    for (const row of result.rows) {
      if (row.key === 'geminiApiKey') {
        // Legacy single key format
        apiKeys.push({
          key: row.value,
          priority: 1,
          isActive: true,
          errorCount: 0
        });
      } else if (row.key.startsWith('geminiApiKey_')) {
        // New multi-key format: geminiApiKey_1, geminiApiKey_2, etc.
        const priority = parseInt(row.key.split('_')[1]);
        if (!isNaN(priority)) {
          apiKeys.push({
            key: row.value,
            priority,
            isActive: true,
            errorCount: 0
          });
        }
      }
    }
    
    // Sort by priority (lower number = higher priority)
    return apiKeys.sort((a, b) => a.priority - b.priority);
  } finally {
    client.release();
  }
}

/**
 * Get the next available API key for use
 */
export async function getNextApiKey(): Promise<string | null> {
  const apiKeys = await getApiKeys();
  
  // Filter active keys and sort by priority
  const activeKeys = apiKeys
    .filter(key => key.isActive)
    .sort((a, b) => a.priority - b.priority);
  
  if (activeKeys.length === 0) {
    // Fallback to environment variable
    return process.env.GOOGLE_API_KEY || null;
  }
  
  return activeKeys[0].key;
}

/**
 * Mark an API key as having an error
 */
export async function markApiKeyError(apiKey: string, error: string): Promise<void> {
  const client = await getPool().connect();
  try {
    // Find which key this is
    const result = await client.query(`
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key LIKE 'geminiApiKey%' AND value = $1
    `, [apiKey]);
    
    if (result.rows.length > 0) {
      const settingKey = result.rows[0].key;
      const errorKey = `${settingKey}_error`;
      const errorCountKey = `${settingKey}_errorCount`;
      const lastErrorKey = `${settingKey}_lastError`;
      
      // Update error count
      await client.query(`
        INSERT INTO "SystemSetting" (key, value, "updatedAt")
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = (COALESCE(CAST("SystemSetting".value AS INTEGER), 0) + 1)::TEXT,
          "updatedAt" = NOW()
      `, [errorCountKey, '1']);
      
      // Update last error
      await client.query(`
        INSERT INTO "SystemSetting" (key, value, "updatedAt")
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          "updatedAt" = NOW()
      `, [lastErrorKey, error]);
      
      // Log the error
      await logAudit('WARN', `API key error: ${error}`, 'AI:ApiKeyError', null, {
        apiKey: apiKey.substring(0, 10) + '...',
        settingKey
      });
    }
  } finally {
    client.release();
  }
}

/**
 * Mark an API key as successful
 */
export async function markApiKeySuccess(apiKey: string): Promise<void> {
  const client = await getPool().connect();
  try {
    // Find which key this is
    const result = await client.query(`
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key LIKE 'geminiApiKey%' AND value = $1
    `, [apiKey]);
    
    if (result.rows.length > 0) {
      const settingKey = result.rows[0].key;
      const lastUsedKey = `${settingKey}_lastUsed`;
      
      // Update last used timestamp
      await client.query(`
        INSERT INTO "SystemSetting" (key, value, "updatedAt")
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          "updatedAt" = NOW()
      `, [lastUsedKey, new Date().toISOString()]);
    }
  } finally {
    client.release();
  }
}

/**
 * Execute an AI operation with automatic API key fallback
 */
export async function executeWithApiKeyFallback<T>(
  operation: (apiKey: string) => Promise<T>,
  context: string = 'AI Operation'
): Promise<ApiKeyResult & { data?: T }> {
  const apiKeys = await getApiKeys();
  const envApiKey = process.env.GOOGLE_API_KEY;
  
  // Create a combined list of all available keys
  const allKeys: Array<{ key: string; source: string; priority: number }> = [];
  
  // Add database keys
  apiKeys.forEach(apiKey => {
    if (apiKey.isActive) {
      allKeys.push({
        key: apiKey.key,
        source: `DB_${apiKey.priority}`,
        priority: apiKey.priority
      });
    }
  });
  
  // Add environment key as fallback
  if (envApiKey) {
    allKeys.push({
      key: envApiKey,
      source: 'ENV',
      priority: 999 // Lowest priority
    });
  }
  
  // Sort by priority
  allKeys.sort((a, b) => a.priority - b.priority);
  
  if (allKeys.length === 0) {
    return {
      success: false,
      error: 'No API keys configured',
      attempts: 0
    };
  }
  
  let lastError: string | undefined;
  
  // Try each key in order
  for (let i = 0; i < allKeys.length; i++) {
    const keyInfo = allKeys[i];
    
    try {
      const result = await operation(keyInfo.key);
      
      // Mark success if it's a database key
      if (keyInfo.source.startsWith('DB_')) {
        await markApiKeySuccess(keyInfo.key);
      }
      
      return {
        success: true,
        apiKey: keyInfo.key,
        keyIndex: i,
        attempts: i + 1,
        data: result
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      
      // Mark error if it's a database key
      if (keyInfo.source.startsWith('DB_')) {
        await markApiKeyError(keyInfo.key, lastError);
      }
      
      // Log the attempt
      await logAudit('WARN', `API key attempt ${i + 1} failed for ${context}`, 'AI:ApiKeyAttempt', null, {
        context,
        attempt: i + 1,
        totalKeys: allKeys.length,
        keySource: keyInfo.source,
        error: lastError
      });
      
      // Continue to next key
    }
  }
  
  // All keys failed
  await logAudit('ERROR', `All API keys failed for ${context}`, 'AI:ApiKeyAllFailed', null, {
    context,
    totalAttempts: allKeys.length,
    lastError
  });
  
  return {
    success: false,
    error: `All ${allKeys.length} API keys failed. Last error: ${lastError}`,
    attempts: allKeys.length
  };
}

/**
 * Save multiple API keys to system settings
 */
export async function saveApiKeys(apiKeys: Array<{ key: string; priority: number }>): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    
    // Clear existing API key settings
    await client.query(`
      DELETE FROM "SystemSetting" 
      WHERE key LIKE 'geminiApiKey%'
    `);
    
    // Insert new API keys
    for (const apiKey of apiKeys) {
      const settingKey = `geminiApiKey_${apiKey.priority}`;
      await client.query(`
        INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
        VALUES ($1, $2, NOW(), NOW())
      `, [settingKey, apiKey.key]);
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get API key statistics
 */
export async function getApiKeyStats(): Promise<Array<ApiKeyConfig & { source: string }>> {
  const apiKeys = await getApiKeys();
  const client = await getPool().connect();
  
  try {
    const stats: Array<ApiKeyConfig & { source: string }> = [];
    
    for (const apiKey of apiKeys) {
      const settingKey = `geminiApiKey_${apiKey.priority}`;
      
      // Get additional stats
      const errorCountResult = await client.query(`
        SELECT value FROM "SystemSetting" WHERE key = $1
      `, [`${settingKey}_errorCount`]);
      
      const lastErrorResult = await client.query(`
        SELECT value FROM "SystemSetting" WHERE key = $1
      `, [`${settingKey}_lastError`]);
      
      const lastUsedResult = await client.query(`
        SELECT value FROM "SystemSetting" WHERE key = $1
      `, [`${settingKey}_lastUsed`]);
      
      stats.push({
        ...apiKey,
        source: `Priority ${apiKey.priority}`,
        errorCount: parseInt(errorCountResult.rows[0]?.value || '0'),
        lastError: lastErrorResult.rows[0]?.value,
        lastUsed: lastUsedResult.rows[0]?.value ? new Date(lastUsedResult.rows[0].value) : undefined
      });
    }
    
    // Add environment key if available
    if (process.env.GOOGLE_API_KEY) {
      stats.push({
        key: process.env.GOOGLE_API_KEY,
        priority: 999,
        isActive: true,
        source: 'Environment Variable',
        errorCount: 0
      });
    }
    
    return stats.sort((a, b) => a.priority - b.priority);
  } finally {
    client.release();
  }
}
