import { getPool } from '@/lib/db';

/**
 * Get a system setting value directly from the database
 * @param key The system setting key
 * @returns The setting value or null if not found
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT value FROM "SystemSetting" WHERE key = $1', [key]);
    return result.rows.length > 0 ? result.rows[0].value : null;
  } catch (error) {
    console.error(`Failed to get system setting ${key}:`, error);
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