import { Client as Minio } from 'minio';

export function buildSecureFileStreamUrl(objectName: string, expiresIn: number) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:8021';
  return `${baseUrl}/api/secure-file/stream?filePath=${encodeURIComponent(objectName)}&expiresIn=${expiresIn}`;
}

function createPublicMinioClient(publicBaseUrl: string) {
  const publicUrl = new URL(publicBaseUrl);
  return new Minio({
    endPoint: publicUrl.hostname,
    port: parseInt(publicUrl.port || (publicUrl.protocol === 'https:' ? '443' : '80'), 10),
    useSSL: publicUrl.protocol === 'https:',
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || '',
  });
}

export async function getMinioObjectUrl({
  bucket,
  defaultClient,
  expiresIn,
  objectName,
}: {
  bucket: string;
  defaultClient: Minio;
  expiresIn: number;
  objectName: string;
}) {
  if (process.env.USE_SIGNED_URLS_IN_WEBHOOKS !== 'true') {
    return buildSecureFileStreamUrl(objectName, expiresIn);
  }

  const publicBase = process.env.MINIO_PUBLIC_BASE_URL;
  if (publicBase) {
    return createPublicMinioClient(publicBase).presignedGetObject(bucket, objectName, expiresIn);
  }

  return defaultClient.presignedGetObject(bucket, objectName, expiresIn);
}
