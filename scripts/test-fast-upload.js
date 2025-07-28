#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function createTestPDF(fileName, content = 'Test PDF content') {
  // Create a simple text file as a mock PDF for testing
  const testDir = './test-files';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const filePath = path.join(testDir, fileName);
  fs.writeFileSync(filePath, content);
  return filePath;
}

async function testFastBulkUpload() {
  console.log('🧪 Testing Fast Bulk Upload...\n');

  try {
    // Create test files
    console.log('📁 Creating test files...');
    const testFiles = [];
    const fileNames = [
      'test-cv-1.pdf',
      'test-cv-2.pdf', 
      'test-cv-3.pdf',
      'test-cv-4.pdf',
      'test-cv-5.pdf'
    ];

    for (const fileName of fileNames) {
      const filePath = await createTestPDF(fileName, `Test content for ${fileName}`);
      testFiles.push(filePath);
    }

    console.log(`✅ Created ${testFiles.length} test files`);

    // Prepare form data
    const formData = new FormData();
    
    for (const filePath of testFiles) {
      const fileStream = fs.createReadStream(filePath);
      formData.append('files', fileStream);
    }
    
    formData.append('batch_id', `test-batch-${Date.now()}`);
    formData.append('source', 'test');

    console.log('📤 Uploading files...');

    // Make the request
    const response = await fetch(`${API_BASE_URL}/api/upload-queue/fast-bulk-insert`, {
      method: 'POST',
      body: formData,
      headers: {
        // Note: In a real test, you'd need to include authentication headers
        // 'Authorization': 'Bearer your-token-here'
      }
    });

    console.log(`📊 Response status: ${response.status}`);

    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ Upload successful!');
      console.log(`📈 Total files: ${result.total}`);
      console.log(`✅ Successful: ${result.successful}`);
      console.log(`❌ Failed: ${result.failed}`);
      console.log(`🆔 Batch ID: ${result.batchId}`);
      
      if (result.results && result.results.length > 0) {
        console.log('\n📋 Upload Results:');
        result.results.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.fileName}: ${file.success ? '✅ Success' : '❌ Failed'}`);
          if (file.success) {
            console.log(`     Queue ID: ${file.queueId}`);
            console.log(`     File Path: ${file.filePath}`);
            if (file.minioRetries > 0) {
              console.log(`     MinIO Retries: ${file.minioRetries}`);
            }
            if (file.dbRetries > 0) {
              console.log(`     DB Retries: ${file.dbRetries}`);
            }
          } else {
            console.log(`     Error: ${file.error}`);
          }
        });
      }

      if (result.errors && result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.fileName}: ${error.error}`);
        });
      }

    } else {
      const errorText = await response.text();
      console.log('\n❌ Upload failed!');
      console.log(`Status: ${response.status}`);
      console.log(`Error: ${errorText}`);
    }

  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message);
  } finally {
    // Cleanup test files
    console.log('\n🧹 Cleaning up test files...');
    const testDir = './test-files';
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    console.log('✅ Cleanup complete');
  }
}

async function testUploadQueueStatus() {
  console.log('\n📊 Testing Upload Queue Status...\n');

  try {
    const response = await fetch(`${API_BASE_URL}/api/upload-queue`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real test, you'd need to include authentication headers
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Queue status retrieved successfully');
      console.log(`📈 Total items in queue: ${result.total || 0}`);
      console.log(`📋 Items per page: ${result.pageSize || 20}`);
      console.log(`📄 Current page: ${result.page || 1}`);
      
      if (result.data && result.data.length > 0) {
        console.log('\n📋 Recent queue items:');
        result.data.slice(0, 5).forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.file_name} (${item.status})`);
        });
      }
    } else {
      console.log('❌ Failed to get queue status');
      console.log(`Status: ${response.status}`);
    }

  } catch (error) {
    console.error('💥 Queue status test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Fast Upload Tests\n');
  
  await testFastBulkUpload();
  await testUploadQueueStatus();
  
  console.log('\n✨ Tests completed!');
}

runTests().catch(console.error); 