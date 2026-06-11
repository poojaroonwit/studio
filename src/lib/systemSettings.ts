import { getPool } from '@/lib/db';
import { unstable_cache } from 'next/cache';
import type { QueryResultRow } from 'pg';

// Cache tag for system settings
export const SYSTEM_SETTINGS_CACHE_TAG = 'system-settings';

type SystemSettingRow = QueryResultRow & {
  key: string;
  value: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Check if we're in a build context (Next.js build time)
 */
function isBuildTime(): boolean {
  // Check for Next.js build phase indicators
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return true;
  }

  // Check if we're in a build script context
  if (process.argv.some(arg => arg.includes('next') && arg.includes('build'))) {
    return true;
  }

  // During build, database might not be available, so we'll handle errors gracefully
  // This function will return null on error, which is acceptable during build
  return false;
}

/**
 * Fetch all system settings from the database.
 * This is the core function that retrieves settings.
 */
async function fetchAllSystemSettings(): Promise<Record<string, string>> {
  if (isBuildTime()) {
    console.log('[SYSTEM SETTINGS] Skipping database fetch during build time.');
    return {};
  }

  try {
    const pool = getPool();
    const result = await pool.query<SystemSettingRow>('SELECT key, value FROM "SystemSetting"');
    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    return settings;
  } catch (error) {
    if (!isBuildTime()) {
      console.error('[SYSTEM SETTINGS] Failed to fetch all system settings:', error);
    }
    return {};
  }
}

/**
 * Get all system settings, with caching.
 * Uses Next.js `unstable_cache` for server-side caching and revalidation.
 * Revalidates on demand when settings are updated via the API.
 */
export const getAllSystemSettingsCached = unstable_cache(
  async () => {
    console.log('[SYSTEM SETTINGS CACHE] Fetching system settings from database...');
    return fetchAllSystemSettings();
  },
  ['all-system-settings'], // Cache key
  {
    tags: [SYSTEM_SETTINGS_CACHE_TAG],
    revalidate: 60 * 5, // Optional: Revalidate every 5 minutes as a fallback
  }
);

/**
 * Get a system setting value.
 * Uses the cached settings to avoid redundant database queries.
 * @param key The system setting key
 * @returns The setting value or null if not found
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  if (isBuildTime()) {
    return null;
  }

  try {
    const settings = await getAllSystemSettingsCached();
    return settings[key] ?? null;
  } catch (error) {
    // Check if we're missing the Next.js cache context (e.g. running in a script or instrumentation)
    if (getErrorMessage(error).includes('incrementalCache missing')) {
      try {
        // Fallback to direct database fetch
        const settings = await fetchAllSystemSettings();
        return settings[key] ?? null;
      } catch (fallbackError) {
        console.error(`[SYSTEM SETTINGS] Fallback fetch failed for ${key}:`, fallbackError);
        return null;
      }
    }

    if (!isBuildTime()) {
      console.error(`[SYSTEM SETTINGS] Failed to get system setting ${key}:`, error);
    }
    return null;
  }
}

/**
 * Get the default match criteria from system settings
 * @returns The default match criteria string or empty string if not found
 */
export async function getDefaultMatchCriteria(): Promise<string> {
  const defaultMatchCriteria = await getSystemSetting('defaultMatchCriteria');
  return defaultMatchCriteria || '';
}
