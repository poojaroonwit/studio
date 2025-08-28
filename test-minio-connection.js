#!/usr/bin/env node

/**
 * MinIO Connection Test Script
 * This script tests MinIO connectivity and configuration
 */

const { Client } = require('minio');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_CONSOLE_PORT || process.env.MINIO_PORT || '9001', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const bucketName = process.env.MINIO_BUCKET_NAME || 'studio-dev';

async function testMinIOConnection() {
  console.log('🔍 Testing MinIO Connection...\n');
  
  console.log('📋 Configuration:');
  console.log(`Endpoint: ${process.env.MINIO_ENDPOINT || 'localhost'}`);
  console.log(`Port: ${process.env.MINIO_CONSOLE_PORT || process.env.MINIO_PORT || '9001'}`);
  console.log(`Bucket: ${bucketName}`);
  console.log(`Use SSL: ${process.env.MINIO_USE_SSL === 'true'}`);
  console.log(`Access Key: ${process.env.MINIO_ACCESS_KEY || 'minioadmin'}`);
  console.log('');
  
  try {
    // Test 1: List buckets
    console.log('✅ Test 1: Listing buckets...');
    const buckets = await minioClient.listBuckets();
    console.log(`Found ${buckets.length} buckets:`);
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.name} (created: ${bucket.creationDate})`);
    });
    console.log('');
    
    // Test 2: Check if our bucket exists
    console.log('✅ Test 2: Checking bucket existence...');
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (bucketExists) {
      console.log(`✅ Bucket '${bucketName}' exists`);
    } else {
      console.log(`❌ Bucket '${bucketName}' does not exist`);
      console.log('Creating bucket...');
      await minioClient.makeBucket(bucketName);
      console.log(`✅ Created bucket '${bucketName}'`);
    }
    console.log('');
    
    // Test 3: List objects in bucket
    console.log('✅ Test 3: Listing objects in bucket...');
    const objects = await minioClient.listObjects(bucketName, '', true);
    let objectCount = 0;
    for await (const obj of objects) {
      objectCount++;
      if (objectCount <= 5) { // Show first 5 objects
        console.log(`  - ${obj.name} (${obj.size} bytes)`);
      }
    }
    if (objectCount > 5) {
      console.log(`  ... and ${objectCount - 5} more objects`);
    }
    console.log(`Total objects: ${objectCount}`);
    console.log('');
    
    // Test 4: Test upload (small test file)
    console.log('✅ Test 4: Testing file upload...');
    const testObjectName = `test-${Date.now()}.txt`;
    const testContent = 'This is a test file for MinIO connectivity';
    const buffer = Buffer.from(testContent, 'utf8');
    
    await minioClient.putObject(bucketName, testObjectName, buffer, buffer.length, {
      'Content-Type': 'text/plain',
    });
    console.log(`✅ Uploaded test file: ${testObjectName}`);
    
    // Test 5: Test download
    console.log('✅ Test 5: Testing file download...');
    const downloadedBuffer = await minioClient.getObject(bucketName, testObjectName);
    const downloadedContent = downloadedBuffer.toString('utf8');
    console.log(`✅ Downloaded content: "${downloadedContent}"`);
    
    // Test 6: Clean up test file
    console.log('✅ Test 6: Cleaning up test file...');
    await minioClient.removeObject(bucketName, testObjectName);
    console.log(`✅ Removed test file: ${testObjectName}`);
    console.log('');
    
    console.log('🎉 All MinIO tests passed!');
    console.log('✅ MinIO is properly configured and accessible');
    
  } catch (error) {
    console.error('❌ MinIO test failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting tips:');
    console.error('1. Check if MinIO is running: docker-compose ps');
    console.error('2. Check MinIO logs: docker-compose logs minio');
    console.error('3. Verify port configuration in .env.local');
    console.error('4. Check network connectivity');
    console.error('5. Verify MinIO credentials');
    
    process.exit(1);
  }
}

// Run the test
testMinIOConnection().catch(console.error);
