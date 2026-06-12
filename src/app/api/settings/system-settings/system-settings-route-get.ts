import { NextResponse } from 'next/server';
import { getPool, type DbClient } from '@/lib/db';
import {
  addAzureAdConfigurationStatus,
  applyRuntimeEnvironmentFallbacks,
  GET_ENV_MAPPINGS,
  getMissingEnvironmentSettings,
  type SystemSettingRow,
  type SystemSettingsMap,
} from './system-settings-route-env';

type SystemSettingQueryRow = SystemSettingRow & {
  id?: string;
};

type SystemSettingsPool = ReturnType<typeof getPool>;

export async function handleGetSystemSettings(searchParams?: URLSearchParams) {
  try {
    const pool = getPool();
    const requestedKeys = parseRequestedKeys(searchParams);
    let settings = await fetchSystemSettingsRows(pool);
    const settingsToInsert = getMissingEnvironmentSettings(
      Array.isArray(settings) ? settings : [],
      GET_ENV_MAPPINGS
    );

    if (settingsToInsert.length > 0) {
      await insertEnvironmentSettings(pool, settingsToInsert);
      settings = await fetchSystemSettingsRows(pool);
    }

    const settingsObj: SystemSettingsMap = Object.fromEntries(
      settings.map((setting) => [setting.key, setting.value])
    );

    applyRuntimeEnvironmentFallbacks(settingsObj, GET_ENV_MAPPINGS);
    addAzureAdConfigurationStatus(settingsObj);

    return NextResponse.json(filterSystemSettingsByKeys(settingsObj, requestedKeys));
  } catch (error) {
    console.error('[SYSTEM SETTINGS] Error fetching system settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
      { status: 500 }
    );
  }
}

function parseRequestedKeys(searchParams?: URLSearchParams): string[] {
  const keysParam = searchParams?.get('keys');
  if (!keysParam) {
    return [];
  }

  return keysParam
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
}

function filterSystemSettingsByKeys(
  settings: SystemSettingsMap,
  requestedKeys: string[]
): SystemSettingsMap {
  if (requestedKeys.length === 0) {
    return settings;
  }

  return Object.fromEntries(
    requestedKeys
      .filter((key) => Object.prototype.hasOwnProperty.call(settings, key))
      .map((key) => [key, settings[key]])
  );
}

async function fetchSystemSettingsRows(pool: SystemSettingsPool): Promise<SystemSettingRow[]> {
  const result = await pool.query<SystemSettingQueryRow>('SELECT key, value FROM "SystemSetting" ORDER BY key');
  return result.rows;
}

async function insertEnvironmentSettings(
  pool: SystemSettingsPool,
  settingsToInsert: Array<{ key: string; value: string }>
) {
  const client: DbClient = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const setting of settingsToInsert) {
      await client.query(
        'INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (key) DO NOTHING',
        [setting.key, setting.value]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[SYSTEM SETTINGS] Failed to auto-sync environment variables:', error);
  } finally {
    client.release();
  }
}
