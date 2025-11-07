import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { getDefaultModelName, normalizeModelName, getAvailableModels } from '@/lib/geminiModels';

export interface ApiKeyConfig {
  key: string;
  priority: number;
  isActive: boolean;
  lastUsed?: Date;
  lastError?: string;
  errorCount: number;
  selectedModel?: string;
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
    // Get relevant API key settings and their model selections
    // Only select:
    //  - legacy single key: geminiApiKey
    //  - numbered keys: geminiApiKey_<number>
    //  - their model selections: geminiApiKey_<number>_model and legacy geminiApiKey_model
    const result = await client.query(`
      SELECT key, value, "updatedAt"
      FROM "SystemSetting"
      WHERE key = 'geminiApiKey'
         OR key ~ '^geminiApiKey_\\d+$'
         OR key = 'geminiApiKey_model'
         OR key ~ '^geminiApiKey_\\d+_model$'
      ORDER BY key
    `);
    
    const apiKeys: ApiKeyConfig[] = [];
    const modelSelections: Record<string, string> = {};
    
    // First pass: collect model selections
    for (const row of result.rows) {
      if (row.key.endsWith('_model')) {
        const baseKey = row.key.replace('_model', '');
        modelSelections[baseKey] = row.value || 'gemini-1.5-pro';
      }
    }
    
    // Second pass: collect API keys
    for (const row of result.rows) {
      if (row.key === 'geminiApiKey') {
        // Legacy single key format
        apiKeys.push({
          key: row.value,
          priority: 1,
          isActive: true,
          errorCount: 0,
          selectedModel: modelSelections['geminiApiKey'] || 'gemini-1.0-pro'
        });
      } else if (/^geminiApiKey_\d+$/.test(row.key)) {
        // New multi-key format: geminiApiKey_1, geminiApiKey_2, etc. (only exact numbered keys)
        const priority = parseInt(row.key.split('_')[1]);
        if (!isNaN(priority)) {
          apiKeys.push({
            key: row.value,
            priority,
            isActive: true,
            errorCount: 0,
            selectedModel: modelSelections[row.key] || 'gemini-1.0-pro'
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
    // No API keys configured
    return null;
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
  operation: (apiKey: string, model?: string) => Promise<T>,
  context: string = 'AI Operation'
): Promise<ApiKeyResult & { data?: T }> {
  const apiKeys = await getApiKeys();
  
  // Create a list of database keys only (no environment keys)
  const allKeys: Array<{ key: string; source: string; priority: number }> = [];
  
  // Add database keys only
  apiKeys.forEach(apiKey => {
    if (apiKey.isActive) {
      allKeys.push({
        key: apiKey.key,
        source: `DB_${apiKey.priority}`,
        priority: apiKey.priority
      });
    }
  });
  
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
  
  // Get available models once for all keys (cached)
  let availableModels: Array<{ name: string; displayName: string }> = [];
  try {
    if (allKeys.length > 0) {
      availableModels = await getAvailableModels(allKeys[0].key);
    }
  } catch (error) {
    console.warn('Failed to fetch available models, will use fallback');
  }
  
  // Try each key in order
  for (let i = 0; i < allKeys.length; i++) {
    const keyInfo = allKeys[i];
    
    try {
      // Get the model for this specific API key
      let selectedModel: string;
      
      // Find the API key config to get its selected model
      const apiKeyConfig = apiKeys.find(key => key.key === keyInfo.key);
      if (apiKeyConfig?.selectedModel) {
        selectedModel = normalizeModelName(apiKeyConfig.selectedModel, availableModels);
      } else {
        // Get default model from API
        selectedModel = await getDefaultModelName(keyInfo.key);
      }
      
      const result = await operation(keyInfo.key, selectedModel);
      
      // Mark success for database keys
      await markApiKeySuccess(keyInfo.key);
      
      return {
        success: true,
        apiKey: keyInfo.key,
        keyIndex: i,
        attempts: i + 1,
        data: result
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      
      // Mark error for database keys
      await markApiKeyError(keyInfo.key, lastError);
      
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
export async function saveApiKeys(apiKeys: Array<{ key: string; priority: number; selectedModel?: string }>): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    
    // Remove duplicate keys by key value (keep only the one with lowest priority)
    const seenKeys = new Map<string, { key: string; priority: number; selectedModel?: string }>();
    for (const apiKey of apiKeys) {
      const trimmedKey = apiKey.key.trim();
      if (!seenKeys.has(trimmedKey)) {
        seenKeys.set(trimmedKey, apiKey);
      } else {
        // If duplicate found, keep the one with lower priority
        const existing = seenKeys.get(trimmedKey)!;
        if (apiKey.priority < existing.priority) {
          seenKeys.set(trimmedKey, apiKey);
        }
      }
    }
    
    // Convert back to array and sort by priority
    const deduplicatedKeys = Array.from(seenKeys.values()).sort((a, b) => a.priority - b.priority);
    
    // Reassign priorities sequentially to ensure no gaps
    const reorderedKeys = deduplicatedKeys.map((key, index) => ({
      ...key,
      priority: index + 1
    }));
    
    // Clear existing API key settings (including all related metadata)
    // This includes: geminiApiKey, geminiApiKey_1, geminiApiKey_1_model, geminiApiKey_1_errorCount, etc.
    await client.query(`
      DELETE FROM "SystemSetting" 
      WHERE key LIKE 'geminiApiKey%'
    `);
    
    // Insert new API keys with ON CONFLICT to prevent duplicates
    for (const apiKey of reorderedKeys) {
      const settingKey = `geminiApiKey_${apiKey.priority}`;
      
      // Insert API key with ON CONFLICT to prevent duplicates
      await client.query(`
        INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          "updatedAt" = NOW()
      `, [settingKey, apiKey.key]);
      
      // Save model selection with ON CONFLICT
      const modelKey = `${settingKey}_model`;
      await client.query(`
        INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          "updatedAt" = NOW()
      `, [modelKey, apiKey.selectedModel || 'gemini-1.0-pro']);
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
    
    // Only include database keys (no environment keys)
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
    
    return stats.sort((a, b) => a.priority - b.priority);
  } finally {
    client.release();
  }
}
