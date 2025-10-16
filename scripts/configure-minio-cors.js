#!/usr/bin/env node

/**
 * Script to configure MinIO CORS settings for COEP compliance
 * This script sets up the proper CORS headers to work with Cross-Origin-Embedder-Policy
 */

const { Client } = require('minio');
require('dotenv').config();

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const MINIO_BUCKET = process.env.MINIO_BUCKET_NAME || process.env.MINIO_BUCKET || 'uploads';

async function configureMinIOCORS() {
  try {
    console.log('🔧 Configuring MinIO CORS for COEP compliance...');
    
    // Check if bucket exists
    const bucketExists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!bucketExists) {
      console.log(`📦 Creating bucket: ${MINIO_BUCKET}`);
      await minioClient.makeBucket(MINIO_BUCKET);
    }
    
    // Set CORS configuration
    const corsConfig = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
          AllowedOrigins: ['*'],
          ExposeHeaders: [
            'ETag',
            'x-amz-server-side-encryption',
            'x-amz-request-id',
            'x-amz-id-2',
            'x-minio-deployment-id',
            'x-minio-origin-endpoint',
            'Cross-Origin-Resource-Policy',
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods',
            'Access-Control-Allow-Headers'
          ],
          MaxAgeSeconds: 3600
        }
      ]
    };
    
    await minioClient.setBucketCors(MINIO_BUCKET, corsConfig);
    console.log('✅ CORS configuration set successfully');
    
    // Set bucket policy for public read access (needed for images)
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`]
        }
      ]
    };
    
    await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(policy));
    console.log('✅ Bucket policy set for public read access');
    
    // Test the configuration
    console.log('🧪 Testing CORS configuration...');
    const corsConfigTest = await minioClient.getBucketCors(MINIO_BUCKET);
    console.log('📋 Current CORS configuration:', JSON.stringify(corsConfigTest, null, 2));
    
    console.log('🎉 MinIO CORS configuration completed successfully!');
    console.log('💡 Your images should now load properly with COEP enabled.');
    
  } catch (error) {
    console.error('❌ Error configuring MinIO CORS:', error);
    process.exit(1);
  }
}

// Run the configuration
configureMinIOCORS();
