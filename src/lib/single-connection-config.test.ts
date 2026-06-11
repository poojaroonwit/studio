import { afterEach, describe, expect, it } from 'vitest';

import { buildSingleConnectionPoolConfig } from './single-connection-config';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('single connection config', () => {
  it('builds a single-client pool config with default timeouts', () => {
    delete process.env.DATABASE_SSL;
    const config = buildSingleConnectionPoolConfig('postgres://example');

    expect(config).toMatchObject({
      allowExitOnIdle: false,
      connectionString: 'postgres://example',
      connectionTimeoutMillis: 600000,
      idleTimeoutMillis: 5000,
      max: 1,
      native: false,
      ssl: false,
      statement_timeout: 180000,
    });
  });

  it('honors SSL and timeout environment overrides', () => {
    process.env.DATABASE_SSL = 'true';
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = 'false';
    process.env.DATABASE_IDLE_TIMEOUT = '100';
    process.env.DATABASE_CONNECTION_TIMEOUT = '200';
    process.env.DATABASE_STATEMENT_TIMEOUT = '300';

    expect(buildSingleConnectionPoolConfig('postgres://example')).toMatchObject({
      connectionTimeoutMillis: 200,
      idleTimeoutMillis: 100,
      ssl: { rejectUnauthorized: false },
      statement_timeout: 300,
    });
  });
});
