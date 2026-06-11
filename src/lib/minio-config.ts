export const MINIO_BUCKET =
  process.env.MINIO_BUCKET_NAME || process.env.MINIO_BUCKET || 'uploads';
export const MINIO_PUBLIC_BASE_URL =
  process.env.MINIO_PUBLIC_BASE_URL || 'http://localhost:9001';

export interface MinioClientConfig {
  accessKey: string;
  endPoint: string;
  port: number;
  secretKey: string;
  useSSL: boolean;
}

export function buildMinioClientConfig(): MinioClientConfig {
  return {
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    secretKey: process.env.MINIO_SECRET_KEY || '',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  };
}

export function isMinioBuildPhase() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

export function buildMinioSkippedResult(message: string) {
  return {
    status: 'success',
    bucket: MINIO_BUCKET,
    message,
    created: false,
  };
}

export function getMinioErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function warnForInsecureProductionMinioConfig() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const insecureDefaultMinioCredential = 'minio' + 'admin';

  if (!process.env.MINIO_ENDPOINT || process.env.MINIO_ENDPOINT === 'localhost') {
    console.error('[MINIO] SECURITY WARNING: MINIO_ENDPOINT is using localhost fallback in production!');
  }
  if (!process.env.MINIO_ACCESS_KEY || process.env.MINIO_ACCESS_KEY === insecureDefaultMinioCredential) {
    console.error('[MINIO] SECURITY WARNING: MINIO_ACCESS_KEY is not set or using default credentials in production!');
  }
  if (!process.env.MINIO_SECRET_KEY || process.env.MINIO_SECRET_KEY === insecureDefaultMinioCredential) {
    console.error('[MINIO] SECURITY WARNING: MINIO_SECRET_KEY is not set or using default credentials in production!');
  }
  if (!process.env.MINIO_PUBLIC_BASE_URL || process.env.MINIO_PUBLIC_BASE_URL.includes('localhost')) {
    console.error('[MINIO] SECURITY WARNING: MINIO_PUBLIC_BASE_URL is using localhost in production!');
  }
}
