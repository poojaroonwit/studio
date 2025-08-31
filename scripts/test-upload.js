#!/usr/bin/env node

/**
 * Test script to diagnose upload issues
 * Usage: node scripts/test-upload.js
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8021';
const TEST_FILE_PATH = path.join(__dirname, 'test-upload.pdf');

async function createTestFile() {
  // Create a simple test PDF file if it doesn't exist
  if (!fs.existsSync(TEST_FILE_PATH)) {
    console.log('Creating test PDF file...');
    
    // Create a minimal PDF content
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;
    
    fs.writeFileSync(TEST_FILE_PATH, pdfContent);
    console.log('Test PDF file created successfully');
  }
}

async function testMinIOHealth() {
  console.log('\n🔍 Testing MinIO health...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/health/minio`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ MinIO health check passed');
      console.log('Status:', data.status);
      console.log('Message:', data.message);
      console.log('Bucket:', data.bucket);
      if (data.timings) {
        console.log('Timings:', data.timings);
      }
      return true;
    } else {
      console.log('❌ MinIO health check failed');
      console.log('Error:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ MinIO health check error:', error.message);
    return false;
  }
}

async function testUploadAPI() {
  console.log('\n📤 Testing upload API...');
  
  try {
    // Create test file
    await createTestFile();
    
    // Create form data
    const formData = new FormData();
    const fileStream = fs.createReadStream(TEST_FILE_PATH);
    formData.append('files', fileStream, 'test-upload.pdf');
    formData.append('source', 'test');
    formData.append('batch_id', 'test-batch-' + Date.now());
    
    console.log('Sending upload request...');
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE_URL}/api/upload-queue/upload-file`, {
      method: 'POST',
      body: formData,
      headers: {
        // Note: In a real test, you'd need to include authentication headers
        // For now, this will likely fail with 401, but we can see the error
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Response received in ${duration}ms`);
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Upload test passed');
      return true;
    } else {
      console.log('❌ Upload test failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Upload test error:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️ Testing database connection...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/health/database`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Database health check passed');
      console.log('Status:', data.status);
      return true;
    } else {
      console.log('❌ Database health check failed');
      console.log('Error:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Database health check error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting upload diagnostics...\n');
  
  const results = {
    minio: false,
    database: false,
    upload: false
  };
  
  // Test MinIO health
  results.minio = await testMinIOHealth();
  
  // Test database connection
  results.database = await testDatabaseConnection();
  
  // Test upload API (will likely fail without auth, but shows the error)
  results.upload = await testUploadAPI();
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('MinIO Health:', results.minio ? '✅ PASS' : '❌ FAIL');
  console.log('Database Health:', results.database ? '✅ PASS' : '❌ FAIL');
  console.log('Upload API:', results.upload ? '✅ PASS' : '❌ FAIL');
  
  if (!results.minio) {
    console.log('\n🔧 MinIO Issues Detected:');
    console.log('- Check if MinIO service is running');
    console.log('- Verify MinIO configuration in environment variables');
    console.log('- Check MinIO logs for errors');
  }
  
  if (!results.database) {
    console.log('\n🔧 Database Issues Detected:');
    console.log('- Check if database service is running');
    console.log('- Verify database connection configuration');
    console.log('- Check database logs for errors');
  }
  
  if (!results.upload && results.minio && results.database) {
    console.log('\n🔧 Upload API Issues Detected:');
    console.log('- Check authentication configuration');
    console.log('- Verify API routes are properly configured');
    console.log('- Check server logs for errors');
  }
  
  console.log('\n✨ Diagnostics complete!');
}

// Run the tests
runTests().catch(console.error);
