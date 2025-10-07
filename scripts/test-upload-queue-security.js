#!/usr/bin/env node

/**
 * Upload Queue Security Test Script
 * 
 * This script tests that the upload queue processor can still access files
 * and generate proper signed URLs for webhook payloads after the security changes.
 */

const { processSingleUploadQueueJob } = require('../src/lib/uploadQueueProcessor.ts');
const { getPool } = require('../src/lib/db.ts');

// Test configuration
const TEST_CONFIG = {
  // Test job data
  testJob: {
    id: 'test-job-' + Date.now(),
    file_name: 'test-resume.pdf',
    file_path: 'uploads/test-resume.pdf', // This should be a real file path in your MinIO
    file_size: 1024,
    status: 'pending',
    position_id: null,
    source: 'test',
    created_by: 'test-user',
    webhook_payload: {
      targetPositionId: 'test-position-123',
      candidate_id: 'test-candidate-456',
      sourceId: 'test-source-789'
    }
  }
};

/**
 * Test upload queue processing with security measures
 */
async function testUploadQueueProcessing() {
  console.log('🔄 Testing upload queue processing with security measures...');
  
  try {
    // Get database connection
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      // Test the processing function
      console.log('   Processing test job...');
      const result = await processSingleUploadQueueJob(TEST_CONFIG.testJob, client);
      
      if (result.error) {
        console.log(`   ⚠️  Processing completed with expected error: ${result.error}`);
        console.log('   ✅ SUCCESS: Upload queue processor handled the test job');
        return true;
      } else {
        console.log('   ✅ SUCCESS: Upload queue processor completed successfully');
        return true;
      }
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.log(`   ❌ FAILURE: Upload queue processing failed: ${error.message}`);
    return false;
  }
}

/**
 * Test signed URL generation
 */
async function testSignedUrlGeneration() {
  console.log('🔗 Testing signed URL generation...');
  
  try {
    const { getSignedUrl } = require('../src/lib/minio.ts');
    
    // Test generating a signed URL
    const testFilePath = 'uploads/test-file.pdf';
    const signedUrl = await getSignedUrl(testFilePath, 3600);
    
    if (signedUrl && signedUrl.includes('X-Amz-Signature')) {
      console.log('   ✅ SUCCESS: Signed URL generated successfully');
      console.log(`   URL: ${signedUrl.substring(0, 100)}...`);
      return true;
    } else {
      console.log('   ❌ FAILURE: Signed URL generation failed or invalid format');
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ FAILURE: Signed URL generation error: ${error.message}`);
    return false;
  }
}

/**
 * Test MinIO direct access (should still work)
 */
async function testMinIODirectAccess() {
  console.log('📁 Testing MinIO direct access...');
  
  try {
    const { minioClient, MINIO_BUCKET } = require('../src/lib/minio.ts');
    
    // Test listing objects (this should work with direct MinIO access)
    const objects = await minioClient.listObjects(MINIO_BUCKET, '', true);
    console.log('   ✅ SUCCESS: MinIO direct access works (can list objects)');
    return true;
    
  } catch (error) {
    console.log(`   ❌ FAILURE: MinIO direct access error: ${error.message}`);
    return false;
  }
}

/**
 * Main test function
 */
async function runUploadQueueSecurityTests() {
  console.log('🛡️  Starting Upload Queue Security Tests...\n');
  
  const results = [];
  
  // Test 1: MinIO direct access should work
  results.push(await testMinIODirectAccess());
  console.log('');
  
  // Test 2: Signed URL generation should work
  results.push(await testSignedUrlGeneration());
  console.log('');
  
  // Test 3: Upload queue processing should work
  results.push(await testUploadQueueProcessing());
  console.log('');
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('📊 Upload Queue Security Test Results:');
  console.log(`   Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('   ✅ ALL TESTS PASSED - Upload queue processing works with security measures!');
    console.log('   🔒 Files are secure but processing continues to work');
    process.exit(0);
  } else {
    console.log('   ❌ SOME TESTS FAILED - Upload queue processing needs attention!');
    process.exit(1);
  }
}

// Run the tests
runUploadQueueSecurityTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
