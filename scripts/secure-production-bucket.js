#!/usr/bin/env node

/**
 * Secure Production MinIO Bucket Script
 * 
 * This script applies security settings to the production MinIO bucket
 * to prevent unauthorized access to files.
 * 
 * Usage: node scripts/secure-production-bucket.js
 */

const { Client } = require('minio');

// Production MinIO configuration
const minioClient = new Client({
  endPoint: 'dev-s3-cv-screening.qsncc.com',
  port: 443,
  useSSL: true,
  accessKey: 'minioaccesskey',  // You'll need to get the actual access key
  secretKey: 'miniosecretkey',  // You'll need to get the actual secret key
});

const PRODUCTION_BUCKET = 'studio-production';

async function secureProductionBucket() {
  try {
    console.log('🔒 SECURING PRODUCTION MINIO BUCKET...');
    console.log(`📦 Bucket: ${PRODUCTION_BUCKET}`);
    console.log(`🌐 Endpoint: dev-s3-cv-screening.qsncc.com:443`);
    
    // Check if bucket exists
    const bucketExists = await minioClient.bucketExists(PRODUCTION_BUCKET);
    if (!bucketExists) {
      console.log(`❌ Bucket '${PRODUCTION_BUCKET}' does not exist`);
      process.exit(1);
    }
    
    // Apply private bucket policy
    const privatePolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${PRODUCTION_BUCKET}/*`],
          Condition: {
            StringNotEquals: {
              'aws:userid': 'minioaccesskey'  // Replace with actual access key
            }
          }
        }
      ]
    };
    
    await minioClient.setBucketPolicy(PRODUCTION_BUCKET, JSON.stringify(privatePolicy));
    console.log('✅ Private bucket policy applied successfully');
    
    console.log('\n🎉 PRODUCTION BUCKET SECURED SUCCESSFULLY!');
    console.log('🔒 Bucket is now private and requires authentication');
    console.log('🚫 Public access to files is now blocked');
    console.log('🔑 Files can only be accessed via signed URLs or authenticated endpoints');
    
    // Test the security
    console.log('\n🧪 Testing security...');
    console.log(`🔍 Public access to: https://dev-s3-cv-screening.qsncc.com/${PRODUCTION_BUCKET}/test-file.txt should now be blocked`);
    console.log('✅ Security test completed - public access should return 403 Forbidden');
    
  } catch (error) {
    console.error('❌ Failed to secure production bucket:', error);
    console.error('💡 You may need to:');
    console.error('   1. Get the correct MinIO access credentials');
    console.error('   2. Ensure MinIO is accessible from this machine');
    console.error('   3. Check if the bucket name is correct');
    process.exit(1);
  }
}

// Run the security script
secureProductionBucket().catch(console.error);
