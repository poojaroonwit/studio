import { Pool, type PoolClient, type PoolConfig } from 'pg';

import { isBuildTime } from './build-check';
import { addProcessHandler } from './process-manager';
import type { ConnectionUsage, ConnectionUsageStats } from './db-types';

process.env.PG_NATIVE = 'false';

const OLD_CONNECTION_IDLE_MS = 5 * 60 * 1000;
const EMERGENCY_IDLE_MS = 2 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60_000;
const DEFAULT_MAX_CONNECTIONS_FOR_STATS = 90;
const DEFAULT_POOL_MAX_CONNECTIONS = 50;

let pool: Pool | null = null;
let poolMonitorInterval: NodeJS.Timeout | null = null;
let shutdownHandlerAdded = false;

const connectionUsageTracker = new Map<PoolClient, ConnectionUsage>();

setInterval(cleanupOldConnections, CLEANUP_INTERVAL_MS);

export function trackConnectionUsage(client: PoolClient) {
  const existing = connectionUsageTracker.get(client);
  if (existing) {
    existing.lastUsed = Date.now();
    existing.queryCount++;
    return;
  }

  connectionUsageTracker.set(client, { lastUsed: Date.now(), queryCount: 1 });
}

export function forgetTrackedConnection(client: PoolClient) {
  connectionUsageTracker.delete(client);
}

export async function emergencyConnectionCleanup() {
  if (!pool) {
    return { success: false, message: 'No active pool' };
  }

  try {
    const beforeStats = buildConnectionUsageStats(pool);
    const cleanedConnections = await releaseIdleClients(pool, beforeStats.idleCount);

    cleanupTrackedConnections(EMERGENCY_IDLE_MS);

    const afterStats = getConnectionUsageStats();
    return {
      success: true,
      cleanedConnections,
      beforeStats,
      afterStats,
      message: `Cleaned up ${cleanedConnections} connections. Usage: ${afterStats?.usagePercent}%`,
    };
  } catch (error) {
    console.error('[DB POOL] Error during emergency cleanup:', error);
    return { success: false, message: `Error: ${error}` };
  }
}

export function getConnectionUsageStats(): ConnectionUsageStats | null {
  if (!pool) {
    return null;
  }

  return buildConnectionUsageStats(pool);
}

export function getPool(): Pool {
  if (isBuildTime()) {
    return createBuildTimePool();
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('FATAL: DATABASE_URL environment variable is not set.');
  }

  if (!pool) {
    pool = new Pool(buildPoolConfig(databaseUrl));
    pool.on('error', (error) => {
      console.error('Unexpected error on idle PostgreSQL client', error);
    });

    startPoolMonitoring();
    registerShutdownHandler();
  }

  return pool;
}

function cleanupOldConnections() {
  cleanupTrackedConnections(OLD_CONNECTION_IDLE_MS, true);
}

function cleanupTrackedConnections(maxIdleTime: number, releaseClient = false) {
  const now = Date.now();

  for (const [client, usage] of connectionUsageTracker.entries()) {
    if (now - usage.lastUsed <= maxIdleTime) {
      continue;
    }

    try {
      if (releaseClient) {
        client.release();
      }
    } catch (error) {
      console.error('[DB CLEANUP] Error closing old connection:', error);
    } finally {
      connectionUsageTracker.delete(client);
    }
  }
}

async function releaseIdleClients(activePool: Pool, idleCount: number) {
  let cleanedConnections = 0;
  const idleClientPromises = Array.from(
    { length: Math.min(idleCount, 10) },
    () => activePool.connect(),
  );

  for (const clientPromise of idleClientPromises) {
    try {
      const client = await clientPromise;
      client.release();
      cleanedConnections++;
    } catch (error) {
      console.error('[DB POOL] Error releasing idle client:', error);
    }
  }

  return cleanedConnections;
}

function buildConnectionUsageStats(activePool: Pool): ConnectionUsageStats {
  const { totalCount, idleCount, waitingCount } = activePool;
  const maxConnections = readNumberEnv(
    'DATABASE_MAX_CONNECTIONS',
    DEFAULT_MAX_CONNECTIONS_FOR_STATS,
  );

  return {
    totalCount,
    activeCount: totalCount - idleCount,
    idleCount,
    waitingCount,
    usagePercent: Math.round((totalCount / maxConnections) * 100),
    maxConnections,
  };
}

function buildPoolConfig(databaseUrl: string): PoolConfig {
  return {
    connectionString: databaseUrl,
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? {
            rejectUnauthorized:
              process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
          }
        : false,
    max: readNumberEnv('DATABASE_MAX_CONNECTIONS', DEFAULT_POOL_MAX_CONNECTIONS),
    idleTimeoutMillis: readNumberEnv('DATABASE_IDLE_TIMEOUT', 10_000),
    connectionTimeoutMillis: readNumberEnv(
      'DATABASE_CONNECTION_TIMEOUT',
      300_000,
    ),
    statement_timeout: readNumberEnv('DATABASE_STATEMENT_TIMEOUT', 120_000),
    allowExitOnIdle: true,
  };
}

function readNumberEnv(name: string, fallback: number) {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function startPoolMonitoring() {
  if (poolMonitorInterval) {
    clearInterval(poolMonitorInterval);
    poolMonitorInterval = null;
  }
}

function registerShutdownHandler() {
  if (shutdownHandlerAdded) {
    return;
  }

  shutdownHandlerAdded = true;
  addProcessHandler('SIGINT', shutdownPool, 'db-pool-shutdown');
  addProcessHandler('SIGTERM', shutdownPool, 'db-pool-shutdown');
}

async function shutdownPool() {
  if (poolMonitorInterval) {
    clearInterval(poolMonitorInterval);
    poolMonitorInterval = null;
  }

  if (pool) {
    await pool.end();
    pool = null;
  }
}

function createBuildTimePool(): Pool {
  return {
    connect: async () => {
      throw new Error('Database connections are not available during build time');
    },
    query: async () => {
      throw new Error('Database queries are not available during build time');
    },
    end: async () => undefined,
  } as unknown as Pool;
}
