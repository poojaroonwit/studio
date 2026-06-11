import type { Client as Minio } from 'minio';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  checkMinioAvailability,
  getMinioBucketInfo,
} from './minio-bucket-lifecycle';

function minioClient(overrides: Partial<Minio>): Minio {
  return overrides as unknown as Minio;
}

describe('minio-bucket-lifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports bucket info for missing and accessible buckets', async () => {
    await expect(getMinioBucketInfo({
      bucket: 'uploads',
      client: minioClient({
        bucketExists: vi.fn().mockResolvedValue(false),
      }),
    })).resolves.toEqual({
      exists: false,
      bucket: 'uploads',
      message: 'Bucket does not exist',
    });

    const listObjects = vi.fn().mockResolvedValue([]);
    await expect(getMinioBucketInfo({
      bucket: 'uploads',
      client: minioClient({
        bucketExists: vi.fn().mockResolvedValue(true),
        listObjects,
      }),
    })).resolves.toEqual({
      exists: true,
      bucket: 'uploads',
      message: 'Bucket is accessible and ready for use',
    });
    expect(listObjects).toHaveBeenCalledWith('uploads', '', true);
  });

  it('checks MinIO availability without throwing', async () => {
    await expect(checkMinioAvailability(minioClient({
      listBuckets: vi.fn().mockResolvedValue([]),
    }))).resolves.toBe(true);

    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(checkMinioAvailability(minioClient({
      listBuckets: vi.fn().mockRejectedValue(new Error('offline')),
    }))).resolves.toBe(false);
  });
});
