import { afterEach, describe, expect, it, vi } from 'vitest';

describe('minio-config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('builds MinIO client config from environment with defaults', async () => {
    vi.stubEnv('MINIO_ENDPOINT', 'storage.local');
    vi.stubEnv('MINIO_PORT', '9443');
    vi.stubEnv('MINIO_USE_SSL', 'true');
    vi.stubEnv('MINIO_ACCESS_KEY', 'access');
    vi.stubEnv('MINIO_SECRET_KEY', 'secret');
    const { buildMinioClientConfig } = await import('./minio-config');

    expect(buildMinioClientConfig()).toEqual({
      accessKey: 'access',
      endPoint: 'storage.local',
      port: 9443,
      secretKey: 'secret',
      useSSL: true,
    });
  }, 15000);

  it('detects production build phase and formats skipped results', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.stubEnv('MINIO_BUCKET_NAME', 'candidate-files');
    const {
      buildMinioSkippedResult,
      isMinioBuildPhase,
    } = await import('./minio-config');

    expect(isMinioBuildPhase()).toBe(true);
    expect(buildMinioSkippedResult('Skipped')).toEqual({
      status: 'success',
      bucket: 'candidate-files',
      message: 'Skipped',
      created: false,
    });
  }, 15000);

  it('warns about insecure production MinIO configuration', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MINIO_ENDPOINT', 'localhost');
    vi.stubEnv('MINIO_ACCESS_KEY', 'minioadmin');
    vi.stubEnv('MINIO_SECRET_KEY', 'minioadmin');
    vi.stubEnv('MINIO_PUBLIC_BASE_URL', 'http://localhost:9001');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { warnForInsecureProductionMinioConfig } = await import('./minio-config');

    warnForInsecureProductionMinioConfig();

    expect(consoleError).toHaveBeenCalledTimes(4);
  }, 15000);
});
