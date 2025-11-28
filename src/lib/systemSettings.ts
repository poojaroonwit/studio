import { getPool } from '@/lib/db';

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
 * Get a system setting value directly from the database
 * @param key The system setting key
 * @returns The setting value or null if not found
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  // During build time, skip database access and return null
  // This prevents build errors when database is not available
  if (isBuildTime()) {
    return null;
  }

  try {
    const pool = getPool();
    const result = await pool.query('SELECT value FROM "SystemSetting" WHERE key = $1', [key]);
    return result.rows.length > 0 ? result.rows[0].value : null;
  } catch (error) {
    // Only log errors if not in build time to reduce build noise
    if (!isBuildTime()) {
      console.error(`Failed to get system setting ${key}:`, error);
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
