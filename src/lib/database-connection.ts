import type { PoolConfig } from 'pg';

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export interface DatabaseConnectionConfig {
  connectionString: string;
  ssl: false | { rejectUnauthorized: boolean };
}

function parseBooleanValue(rawValue: string | undefined): boolean | undefined {
  if (!rawValue) {
    return undefined;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) {
    return false;
  }

  return undefined;
}

function isLocalDatabaseHost(hostname: string): boolean {
  return LOCALHOST_HOSTS.has(hostname.toLowerCase());
}

function buildDatabaseConnectionSettings(rawDatabaseUrl: string): DatabaseConnectionConfig {
  const databaseUrl = new URL(rawDatabaseUrl);
  const hasExplicitSslMode =
    databaseUrl.searchParams.has('sslmode') || databaseUrl.searchParams.has('ssl');

  const environmentSslPreference = parseBooleanValue(process.env.DATABASE_SSL);
  const environmentSslRejectUnauthorized = parseBooleanValue(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED);
  const isLocalHost = isLocalDatabaseHost(databaseUrl.hostname);
  const useSsl =
    environmentSslPreference === true
      ? true
      : environmentSslPreference === false
        ? !isLocalHost
        : !isLocalHost;

  const ssl = useSsl
    ? {
        rejectUnauthorized: environmentSslRejectUnauthorized ?? true,
      }
    : false;

  if (useSsl && !hasExplicitSslMode) {
    databaseUrl.searchParams.set('sslmode', 'require');
  }

  return {
    connectionString: databaseUrl.toString(),
    ssl,
  };
}

export function buildPrismaConnectionString(rawDatabaseUrl: string): string {
  return buildDatabaseConnectionSettings(rawDatabaseUrl).connectionString;
}

export function buildPoolConfig(rawDatabaseUrl: string): Omit<PoolConfig, 'max' | 'idleTimeoutMillis' | 'connectionTimeoutMillis'> & {
  connectionString: string;
} {
  const { connectionString, ssl } = buildDatabaseConnectionSettings(rawDatabaseUrl);
  return {
    connectionString,
    ssl,
  };
}
