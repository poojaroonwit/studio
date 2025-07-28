#!/usr/bin/env node

/**
 * Test script for the refactored upload API
 * Tests various scenarios including valid uploads, invalid files, and error conditions
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_FILES_DIR = path.join(__dirname, 'test-files');

// Test scenarios
const testScenarios = [
  {
    name: 'Single valid PDF upload',
    files: ['valid-resume.pdf'],
    expectedStatus: 200,
    description: 'Should successfully upload a single valid PDF file'
  },
  {
    name: 'Multiple valid PDF uploads',
    files: ['valid-resume.pdf', 'another-resume.pdf'],
    expectedStatus: 200,
    description: 'Should successfully upload multiple valid PDF files'
  },
  {
    name: 'Upload with position assignment',
    files: ['valid-resume.pdf'],
    positionId: 'test-position-id',
    expectedStatus: 200,
    description: 'Should upload file and assign to specified position'
  },
  {
    name: 'Invalid file type (non-PDF)',
    files: ['invalid-file.txt'],
    expectedStatus: 207, // Multi-status with some failures
    description: 'Should reject non-PDF files'
  },
  {
    name: 'Empty file upload',
    files: ['empty-file.pdf'],
    expectedStatus: 207,
    description: 'Should handle empty files appropriately'
  },
  {
    name: 'Too many files',
    files: Array(60).fill('valid-resume.pdf'), // More than MAX_FILES_PER_REQUEST
    expectedStatus: 400,
    description: 'Should reject requests with too many files'
  }
];

/**
 * Create test files
 */
function createTestFiles() {
  if (!fs.existsSync(TEST_FILES_DIR)) {
    fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
  }

  // Create valid PDF file (minimal PDF content)
  const validPdfContent = Buffer.from([
    0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xC7, 0xEC, 0x8F, 0xA2, 0x0A,
    0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, 0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65,
    0x2F, 0x43, 0x61, 0x74, 0x61, 0x6C, 0x6F, 0x67, 0x2F, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20,
    0x32, 0x20, 0x30, 0x20, 0x52, 0x3E, 0x3E, 0x0A, 0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A,
    0x32, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, 0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65,
    0x2F, 0x50, 0x61, 0x67, 0x65, 0x73, 0x2F, 0x4B, 0x69, 0x64, 0x73, 0x5B, 0x33, 0x20, 0x30,
    0x20, 0x52, 0x5D, 0x3E, 0x3E, 0x0A, 0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A, 0x33, 0x20,
    0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, 0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x2F, 0x50,
    0x61, 0x67, 0x65, 0x2F, 0x4D, 0x65, 0x64, 0x69, 0x61, 0x42, 0x6F, 0x78, 0x5B, 0x30, 0x20,
    0x30, 0x20, 0x36, 0x31, 0x32, 0x20, 0x37, 0x39, 0x32, 0x5D, 0x3E, 0x3E, 0x0A, 0x65, 0x6E,
    0x64, 0x6F, 0x62, 0x6A, 0x0A, 0x78, 0x72, 0x65, 0x66, 0x0A, 0x30, 0x20, 0x34, 0x0A, 0x25,
    0x25, 0x45, 0x4F, 0x46, 0x0A
  ]);

  fs.writeFileSync(path.join(TEST_FILES_DIR, 'valid-resume.pdf'), validPdfContent);
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'another-resume.pdf'), validPdfContent);
  
  // Create invalid file
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'invalid-file.txt'), 'This is not a PDF file');
  
  // Create empty file
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'empty-file.pdf'), '');
  
  console.log('✅ Test files created successfully');
}

/**
 * Test the upload API
 */
async function testUploadAPI(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`   Description: ${scenario.description}`);
  
  try {
    const formData = new FormData();
    
    // Add files to form data
    for (const fileName of scenario.files) {
      const filePath = path.join(TEST_FILES_DIR, fileName);
      if (fs.existsSync(filePath)) {
        formData.append('files', fs.createReadStream(filePath), fileName);
      } else {
        console.log(`   ⚠️  Test file not found: ${fileName}`);
        continue;
      }
    }
    
    // Add additional parameters
    if (scenario.positionId) {
      formData.append('position_id', scenario.positionId);
    }
    if (scenario.batchId) {
      formData.append('batch_id', scenario.batchId);
    }
    if (scenario.source) {
      formData.append('source', scenario.source);
    }
    
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE_URL}/api/upload-queue/upload-file`, {
      method: 'POST',
      body: formData,
      headers: {
        // Note: In a real test, you'd need to include authentication headers
        // 'Authorization': 'Bearer your-test-token'
      }
    });
    
    const responseTime = Date.now() - startTime;
    const responseData = await response.json();
    
    console.log(`   📊 Response Status: ${response.status}`);
    console.log(`   ⏱️  Response Time: ${responseTime}ms`);
    
    // Validate response
    if (response.status === scenario.expectedStatus) {
      console.log(`   ✅ Status code matches expected (${scenario.expectedStatus})`);
    } else {
      console.log(`   ❌ Status code mismatch. Expected: ${scenario.expectedStatus}, Got: ${response.status}`);
    }
    
    // Log response details
    if (responseData.results) {
      const successCount = responseData.results.filter(r => r.status === 'success').length;
      const failureCount = responseData.results.filter(r => r.status === 'failed').length;
      console.log(`   📈 Results: ${successCount} success, ${failureCount} failed`);
      
      // Log individual file results
      responseData.results.forEach(result => {
        const status = result.status === 'success' ? '✅' : '❌';
        console.log(`      ${status} ${result.file_name}: ${result.status}${result.error ? ` - ${result.error}` : ''}`);
      });
    }
    
    if (responseData.summary) {
      console.log(`   📋 Summary: ${responseData.summary.total} total, ${responseData.summary.success} success, ${responseData.summary.failed} failed`);
    }
    
    if (responseData.batch_id) {
      console.log(`   🆔 Batch ID: ${responseData.batch_id}`);
    }
    
    if (responseData.processing_time_ms) {
      console.log(`   ⏱️  Processing Time: ${responseData.processing_time_ms}ms`);
    }
    
    return {
      success: response.status === scenario.expectedStatus,
      scenario: scenario.name,
      status: response.status,
      data: responseData,
      responseTime
    };
    
  } catch (error) {
    console.log(`   ❌ Test failed with error: ${error.message}`);
    return {
      success: false,
      scenario: scenario.name,
      error: error.message
    };
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting Upload API Tests');
  console.log(`📍 API Base URL: ${API_BASE_URL}`);
  console.log(`📁 Test Files Directory: ${TEST_FILES_DIR}`);
  
  // Create test files
  createTestFiles();
  
  const results = [];
  
  for (const scenario of testScenarios) {
    const result = await testUploadAPI(scenario);
    results.push(result);
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('==============');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   - ${result.scenario}: ${result.error || `Status ${result.status}`}`);
    });
  }
  
  console.log('\n🎉 Test run completed!');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testUploadAPI, createTestFiles }; 