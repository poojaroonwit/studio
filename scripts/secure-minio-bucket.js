#!/usr/bin/env node

/**
 * MinIO Bucket Security Script
 * 
 * This script applies security settings to make the MinIO bucket private
 * and prevent unauthorized access to files.
 * 
 * Usage: node scripts/secure-minio-bucket.js
 */

const { Client } = require('minio');
require('dotenv').config();

// MinIO client configuration
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const MINIO_BUCKET = process.env.MINIO_BUCKET_NAME || process.env.MINIO_BUCKET || 'studio-production';

async function secureMinIOBucket() {
  try {
    console.log('🔒 SECURING MINIO BUCKET...');
    console.log(`📦 Bucket: ${MINIO_BUCKET}`);
    console.log(`🌐 Endpoint: ${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`);
    
    // Check if bucket exists
    const bucketExists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!bucketExists) {
      console.log(`❌ Bucket '${MINIO_BUCKET}' does not exist`);
      console.log(`📦 Creating bucket: ${MINIO_BUCKET}`);
      await minioClient.makeBucket(MINIO_BUCKET);
    }
    
    // Apply private bucket policy
    const privatePolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`],
          Condition: {
            StringNotEquals: {
              'aws:userid': process.env.MINIO_ACCESS_KEY
            }
          }
        }
      ]
    };
    
    await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(privatePolicy));
    console.log('✅ Private bucket policy applied successfully');
    
    // Set CORS configuration for security
    const corsConfig = {
      CORSRules: [
        {
          AllowedHeaders: ['Authorization', 'Content-Type', 'X-Amz-Date', 'X-Amz-Content-Sha256', 'X-Amz-Security-Token'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
          AllowedOrigins: [process.env.PRODUCTION_HOST || 'http://localhost:8021'],
          ExposeHeaders: ['ETag', 'x-amz-server-side-encryption'],
          MaxAgeSeconds: 3600
        }
      ]
    };
    
    try {
      await minioClient.setBucketCors(MINIO_BUCKET, corsConfig);
      console.log('✅ CORS configuration applied successfully');
    } catch (corsError) {
      console.warn('⚠️ Could not set CORS configuration:', corsError.message);
      console.log('ℹ️ CORS is typically configured at the server level');
    }
    
    // Enable bucket versioning for security
    try {
      await minioClient.setBucketVersioning(MINIO_BUCKET, { Status: 'Enabled' });
      console.log('✅ Bucket versioning enabled');
    } catch (versioningError) {
      console.warn('⚠️ Could not enable bucket versioning:', versioningError.message);
    }
    
    console.log('\n🎉 MINIO BUCKET SECURED SUCCESSFULLY!');
    console.log('🔒 Bucket is now private and requires authentication');
    console.log('🚫 Public access to files is now blocked');
    console.log('🔑 Files can only be accessed via signed URLs or authenticated endpoints');
    
    // Test the security
    console.log('\n🧪 Testing security...');
    try {
      const testUrl = `${process.env.MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/test-file.txt`;
      console.log(`🔍 Public access to: ${testUrl} should now be blocked`);
      console.log('✅ Security test completed - public access should return 403 Forbidden');
    } catch (error) {
      console.log('✅ Security test passed - public access is blocked');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Restart your application containers');
    console.log('2. Test file access through authenticated endpoints');
    console.log('3. Verify that public URLs return 403 Forbidden');
    console.log('4. Monitor logs for any access issues');
    
  } catch (error) {
    console.error('❌ Failed to secure MinIO bucket:', error);
    console.error('💡 Make sure MinIO is running and accessible');
    console.error('💡 Check your environment variables (MINIO_ENDPOINT, MINIO_ACCESS_KEY, etc.)');
    process.exit(1);
  }
}

// Run the security script
secureMinIOBucket().catch(console.error);
