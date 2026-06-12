import type { Client as Minio } from 'minio';

import { buildStorageConfig } from './storage-config';

export function buildPrivateBucketPolicy(bucket: string) {
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Deny',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
        Condition: {
          StringNotEquals: {
            'aws:userid': buildStorageConfig().accessKey,
          },
        },
      },
    ],
  };
}

export async function enforcePrivateBucketPolicyForClient(client: Minio, bucket: string) {
  await client.setBucketPolicy(bucket, JSON.stringify(buildPrivateBucketPolicy(bucket)));
}
