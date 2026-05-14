import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import {
  type AiProvider,
  getAvailableModels,
  getDefaultModelFallback,
  getDefaultModelName,
  getProviderKeyPrefix,
  getProviderLabel,
  getSelectedAiProvider,
  normalizeModelName,
} from '@/lib/aiProvider';

export interface ApiKeyConfig {
  key: string;
  priority: number;
  isActive: boolean;
  lastUsed?: Date;
  lastError?: string;
  errorCount: number;
  selectedModel?: string;
  provider: AiProvider;
}

export interface ApiKeyResult {
  success: boolean;
  apiKey?: string;
  error?: string;
  keyIndex?: number;
  attempts: number;
  provider: AiProvider;
}

export async function getApiKeys(provider?: AiProvider): Promise<ApiKeyConfig[]> {
  const resolvedProvider = provider || await getSelectedAiProvider();
  const prefix = getProviderKeyPrefix(resolvedProvider);
  const defaultModel = getDefaultModelFallback(resolvedProvider);
  const client = await getPool().connect();

  try {
    const result = await client.query(`
      SELECT key, value
      FROM "SystemSetting"
      WHERE key = $1
         OR key ~ $2
         OR key = $3
         OR key ~ $4
      ORDER BY key
    `, [
      prefix,
      `^${prefix}_\\d+$`,
      `${prefix}_model`,
      `^${prefix}_\\d+_model$`,
    ]);

    const modelSelections: Record<string, string> = {};
    const apiKeys: ApiKeyConfig[] = [];

    for (const row of result.rows) {
      if (String(row.key).endsWith('_model')) {
        modelSelections[String(row.key).replace(/_model$/, '')] = row.value || defaultModel;
      }
    }

    for (const row of result.rows) {
      if (row.key === prefix) {
        apiKeys.push({
          key: row.value,
          priority: 1,
          isActive: true,
          errorCount: 0,
          selectedModel: modelSelections[prefix] || defaultModel,
          provider: resolvedProvider,
        });
      } else if (new RegExp(`^${prefix}_\\d+$`).test(row.key)) {
        const priority = parseInt(String(row.key).split('_').pop() || '', 10);
        if (!Number.isNaN(priority)) {
          apiKeys.push({
            key: row.value,
            priority,
            isActive: true,
            errorCount: 0,
            selectedModel: modelSelections[row.key] || defaultModel,
            provider: resolvedProvider,
          });
        }
      }
    }

    return apiKeys.sort((a, b) => a.priority - b.priority);
  } finally {
    client.release();
  }
}

export async function getNextApiKey(provider?: AiProvider): Promise<string | null> {
  const apiKeys = await getApiKeys(provider);
  const activeKeys = apiKeys.filter((key) => key.isActive).sort((a, b) => a.priority - b.priority);
  return activeKeys[0]?.key || null;
}

export async function markApiKeyError(apiKey: string, error: string, provider?: AiProvider): Promise<void> {
  const resolvedProvider = provider || await getSelectedAiProvider();
  const prefix = getProviderKeyPrefix(resolvedProvider);
  const client = await getPool().connect();

  try {
    const result = await client.query(`
      SELECT key
      FROM "SystemSetting"
      WHERE key LIKE $1 AND value = $2
    `, [`${prefix}%`, apiKey]);

    if (!result.rows.length) {
      return;
    }

    const settingKey = result.rows[0].key;

    await client.query(`
      INSERT INTO "SystemSetting" (key, value, "updatedAt")
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = (COALESCE(CAST("SystemSetting".value AS INTEGER), 0) + 1)::TEXT,
        "updatedAt" = NOW()
    `, [`${settingKey}_errorCount`, '1']);

    await client.query(`
      INSERT INTO "SystemSetting" (key, value, "updatedAt")
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        "updatedAt" = NOW()
    `, [`${settingKey}_lastError`, error]);

    await logAudit('WARN', `${getProviderLabel(resolvedProvider)} API key error: ${error}`, 'AI:ApiKeyError', null, {
      provider: resolvedProvider,
      apiKey: `${apiKey.substring(0, 10)}...`,
      settingKey,
    });
  } finally {
    client.release();
  }
}

export async function markApiKeySuccess(apiKey: string, provider?: AiProvider): Promise<void> {
  const resolvedProvider = provider || await getSelectedAiProvider();
  const prefix = getProviderKeyPrefix(resolvedProvider);
  const client = await getPool().connect();

  try {
    const result = await client.query(`
      SELECT key
      FROM "SystemSetting"
      WHERE key LIKE $1 AND value = $2
    `, [`${prefix}%`, apiKey]);

    if (!result.rows.length) {
      return;
    }

    const settingKey = result.rows[0].key;

    await client.query(`
      INSERT INTO "SystemSetting" (key, value, "updatedAt")
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        "updatedAt" = NOW()
    `, [`${settingKey}_lastUsed`, new Date().toISOString()]);
  } finally {
    client.release();
  }
}

export async function executeWithApiKeyFallback<T>(
  operation: (apiKey: string, model: string, provider: AiProvider) => Promise<T>,
  context: string = 'AI Operation',
  provider?: AiProvider
): Promise<ApiKeyResult & { data?: T }> {
  const resolvedProvider = provider || await getSelectedAiProvider();
  const apiKeys = await getApiKeys(resolvedProvider);
  const activeKeys = apiKeys.filter((key) => key.isActive).sort((a, b) => a.priority - b.priority);

  if (!activeKeys.length) {
    return {
      success: false,
      error: `No ${getProviderLabel(resolvedProvider)} API keys configured`,
      attempts: 0,
      provider: resolvedProvider,
    };
  }

  let availableModels: Array<{ name: string }> = [];
  try {
    availableModels = await getAvailableModels(resolvedProvider, activeKeys[0].key);
  } catch (error) {
    console.warn(`[AI] Failed to fetch ${resolvedProvider} models, continuing with configured values`);
  }

  let lastError: string | undefined;

  for (let index = 0; index < activeKeys.length; index += 1) {
    const keyInfo = activeKeys[index];

    try {
      const selectedModel = keyInfo.selectedModel
        ? normalizeModelName(resolvedProvider, keyInfo.selectedModel, availableModels)
        : await getDefaultModelName(resolvedProvider, keyInfo.key);

      const data = await operation(keyInfo.key, selectedModel, resolvedProvider);
      await markApiKeySuccess(keyInfo.key, resolvedProvider);

      return {
        success: true,
        apiKey: keyInfo.key,
        keyIndex: index,
        attempts: index + 1,
        provider: resolvedProvider,
        data,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await markApiKeyError(keyInfo.key, lastError, resolvedProvider);

      await logAudit('WARN', `${getProviderLabel(resolvedProvider)} API key attempt ${index + 1} failed for ${context}`, 'AI:ApiKeyAttempt', null, {
        provider: resolvedProvider,
        context,
        attempt: index + 1,
        totalKeys: activeKeys.length,
        error: lastError,
      });
    }
  }

  await logAudit('ERROR', `All ${getProviderLabel(resolvedProvider)} API keys failed for ${context}`, 'AI:ApiKeyAllFailed', null, {
    provider: resolvedProvider,
    context,
    totalAttempts: activeKeys.length,
    lastError,
  });

  return {
    success: false,
    error: `All ${activeKeys.length} ${getProviderLabel(resolvedProvider)} API keys failed. Last error: ${lastError}`,
    attempts: activeKeys.length,
    provider: resolvedProvider,
  };
}

export async function saveApiKeys(
  apiKeys: Array<{ key: string; priority: number; selectedModel?: string }>,
  provider?: AiProvider
): Promise<void> {
  const resolvedProvider = provider || await getSelectedAiProvider();
  const prefix = getProviderKeyPrefix(resolvedProvider);
  const defaultModel = getDefaultModelFallback(resolvedProvider);
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const seenKeys = new Map<string, { key: string; priority: number; selectedModel?: string }>();
    for (const apiKey of apiKeys) {
      const trimmedKey = apiKey.key.trim();
      if (!trimmedKey) {
        continue;
      }

      const existing = seenKeys.get(trimmedKey);
      if (!existing || apiKey.priority < existing.priority) {
        seenKeys.set(trimmedKey, { ...apiKey, key: trimmedKey });
      }
    }

    const reorderedKeys = Array.from(seenKeys.values())
      .sort((a, b) => a.priority - b.priority)
      .map((apiKey, index) => ({
        ...apiKey,
        priority: index + 1,
      }));

    await client.query(`
      DELETE FROM "SystemSetting"
      WHERE key LIKE $1
    `, [`${prefix}%`]);

    for (const apiKey of reorderedKeys) {
      const settingKey = `${prefix}_${apiKey.priority}`;
      await client.query(`
        INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          "updatedAt" = NOW()
      `, [settingKey, apiKey.key]);

      await client.query(`
        INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          "updatedAt" = NOW()
      `, [`${settingKey}_model`, apiKey.selectedModel || defaultModel]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getApiKeyStats(provider?: AiProvider): Promise<Array<ApiKeyConfig & { source: string }>> {
  const resolvedProvider = provider || await getSelectedAiProvider();
  const prefix = getProviderKeyPrefix(resolvedProvider);
  const apiKeys = await getApiKeys(resolvedProvider);
  const client = await getPool().connect();

  try {
    const stats: Array<ApiKeyConfig & { source: string }> = [];

    for (const apiKey of apiKeys) {
      const settingKey = `${prefix}_${apiKey.priority}`;
      const [errorCountResult, lastErrorResult, lastUsedResult] = await Promise.all([
        client.query(`SELECT value FROM "SystemSetting" WHERE key = $1`, [`${settingKey}_errorCount`]),
        client.query(`SELECT value FROM "SystemSetting" WHERE key = $1`, [`${settingKey}_lastError`]),
        client.query(`SELECT value FROM "SystemSetting" WHERE key = $1`, [`${settingKey}_lastUsed`]),
      ]);

      stats.push({
        ...apiKey,
        source: `Priority ${apiKey.priority}`,
        errorCount: parseInt(errorCountResult.rows[0]?.value || '0', 10),
        lastError: lastErrorResult.rows[0]?.value,
        lastUsed: lastUsedResult.rows[0]?.value ? new Date(lastUsedResult.rows[0].value) : undefined,
      });
    }

    return stats.sort((a, b) => a.priority - b.priority);
  } finally {
    client.release();
  }
}
