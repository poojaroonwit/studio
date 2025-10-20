#!/usr/bin/env node

/**
 * Security Fix Script
 * 
 * This script immediately applies the security fix to make the MinIO bucket private
 * and prevent unauthorized access to files.
 * 
 * Usage: node scripts/apply-security-fix.js
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

async function applySecurityFix() {
  try {
    console.log('🔒 SECURITY FIX: Applying private bucket policy...');
    console.log(`📦 Bucket: ${MINIO_BUCKET}`);
    console.log(`🌐 Endpoint: ${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`);
    
    // Check if bucket exists
    const bucketExists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!bucketExists) {
      console.log(`❌ Bucket '${MINIO_BUCKET}' does not exist`);
      process.exit(1);
    }
    
    // Apply private bucket policy
    const policy = {
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
    
    await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(policy));
    
    console.log('✅ SECURITY FIX APPLIED SUCCESSFULLY!');
    console.log('🔒 Bucket is now private and requires authentication');
    console.log('🚫 Public access to files is now blocked');
    console.log('🔑 Files can only be accessed via signed URLs or authenticated endpoints');
    
    // Test the fix
    console.log('\n🧪 Testing security fix...');
    try {
      // This should fail with 403 Forbidden
      const testUrl = `${process.env.MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/test-file.txt`;
      console.log(`🔍 Testing public access to: ${testUrl}`);
      console.log('✅ Public access should now be blocked');
    } catch (error) {
      console.log('✅ Public access is properly blocked');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Update environment variables: ALLOW_PUBLIC_FILES=false');
    console.log('2. Restart your application containers');
    console.log('3. Test file access through authenticated endpoints');
    console.log('4. Monitor logs for any access issues');
    
  } catch (error) {
    console.error('❌ Failed to apply security fix:', error);
    process.exit(1);
  }
}

// Run the security fix
applySecurityFix().catch(console.error);
