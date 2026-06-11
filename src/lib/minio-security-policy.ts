import type { Client as Minio } from 'minio';

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
            'aws:userid': process.env.MINIO_ACCESS_KEY,
          },
        },
      },
    ],
  };
}

export async function enforcePrivateBucketPolicyForClient(client: Minio, bucket: string) {
  await client.setBucketPolicy(bucket, JSON.stringify(buildPrivateBucketPolicy(bucket)));
}
