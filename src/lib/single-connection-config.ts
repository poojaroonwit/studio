import type { PoolConfig } from 'pg';

export function buildSingleConnectionPoolConfig(databaseUrl: string): PoolConfig & { native?: boolean } {
  return {
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
        }
      : false,
    max: 1,
    idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '5000', 10),
    connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '600000', 10),
    statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '180000', 10),
    allowExitOnIdle: false,
    native: false,
  };
}
