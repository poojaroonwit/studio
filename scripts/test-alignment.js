#!/usr/bin/env node

/**
 * Test script to verify backend, frontend, and database alignment
 * for the upload CV module
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Checking Codebase Alignment for Upload CV Module');
console.log('==================================================');

// Test 1: Check if all required files exist
console.log('\n📁 File Structure Check:');
const requiredFiles = [
  'src/app/api/upload-queue/upload-file/route.ts',
  'src/components/BulkUploadCVsModal.tsx',
  'src/app/candidates/upload/page.tsx',
  'src/lib/uploadRetry.ts',
  'prisma/schema.prisma',
  'docs/upload-api-best-practices.md'
];

let fileStructurePassed = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    fileStructurePassed = false;
  }
});

// Test 2: Check API endpoint consistency
console.log('\n🔗 API Endpoint Consistency Check:');
const apiFiles = [
  'src/app/api/upload-queue/upload-file/route.ts',
  'src/components/BulkUploadCVsModal.tsx',
  'src/app/candidates/upload/page.tsx'
];

let apiConsistencyPassed = true;
const expectedEndpoint = '/api/upload-queue/upload-file';

apiFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes(expectedEndpoint)) {
      console.log(`  ✅ ${file} - Uses correct endpoint`);
    } else if (content.includes('/api/upload-queue/fast-bulk-insert')) {
      console.log(`  ⚠️  ${file} - Still references old endpoint`);
      apiConsistencyPassed = false;
    } else {
      console.log(`  ❌ ${file} - No endpoint reference found`);
      apiConsistencyPassed = false;
    }
  }
});

// Test 3: Check database schema alignment
console.log('\n🗄️ Database Schema Check:');
if (fs.existsSync('prisma/schema.prisma')) {
  const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
  
  const requiredFields = [
    'model UploadQueue',
    'fileName',
    'fileSize',
    'status',
    'error',
    'source',
    'uploadDate',
    'uploadId',
    'createdBy',
    'filePath',
    'webhookPayload',
    'positionId'
  ];
  
  let schemaPassed = true;
  requiredFields.forEach(field => {
    if (schemaContent.includes(field)) {
      console.log(`  ✅ ${field}`);
    } else {
      console.log(`  ❌ ${field} - Missing from schema`);
      schemaPassed = false;
    }
  });
} else {
  console.log('  ❌ prisma/schema.prisma - MISSING');
}

// Test 4: Check import consistency
console.log('\n📦 Import Consistency Check:');
const uploadFileContent = fs.existsSync('src/app/api/upload-queue/upload-file/route.ts') 
  ? fs.readFileSync('src/app/api/upload-queue/upload-file/route.ts', 'utf8') 
  : '';

const requiredImports = [
  'validateUserSession',
  'getPool',
  'logAudit',
  'dispatchWebhooks',
  'broadcastUploadQueueUpdate',
  'retryMinIOUpload',
  'retryDatabaseOperation'
];

let importsPassed = true;
requiredImports.forEach(importName => {
  if (uploadFileContent.includes(importName)) {
    console.log(`  ✅ ${importName}`);
  } else {
    console.log(`  ❌ ${importName} - Missing import`);
    importsPassed = false;
  }
});

// Test 5: Check frontend response handling
console.log('\n🎨 Frontend Response Handling Check:');
const modalContent = fs.existsSync('src/components/BulkUploadCVsModal.tsx') 
  ? fs.readFileSync('src/components/BulkUploadCVsModal.tsx', 'utf8') 
  : '';

const expectedResponseHandling = [
  'result.summary?.success',
  'result.summary?.failed',
  'result.results?.filter',
  'r.status === \'failed\''
];

let responseHandlingPassed = true;
expectedResponseHandling.forEach(pattern => {
  if (modalContent.includes(pattern)) {
    console.log(`  ✅ ${pattern}`);
  } else {
    console.log(`  ❌ ${pattern} - Missing response handling`);
    responseHandlingPassed = false;
  }
});

// Test 6: Check error handling patterns
console.log('\n⚠️ Error Handling Check:');
const errorPatterns = [
  'errorWithDescription',
  'successWithDescription',
  'try {',
  'catch (error)',
  'finally {'
];

let errorHandlingPassed = true;
errorPatterns.forEach(pattern => {
  if (modalContent.includes(pattern)) {
    console.log(`  ✅ ${pattern}`);
  } else {
    console.log(`  ❌ ${pattern} - Missing error handling`);
    errorHandlingPassed = false;
  }
});

// Test 7: Check retry logic implementation
console.log('\n🔄 Retry Logic Check:');
const retryFileContent = fs.existsSync('src/lib/uploadRetry.ts') 
  ? fs.readFileSync('src/lib/uploadRetry.ts', 'utf8') 
  : '';

const retryFunctions = [
  'retryWithBackoff',
  'retryMinIOUpload',
  'retryDatabaseOperation',
  'isRetryableError',
  'calculateDelay'
];

let retryLogicPassed = true;
retryFunctions.forEach(func => {
  if (retryFileContent.includes(func)) {
    console.log(`  ✅ ${func}`);
  } else {
    console.log(`  ❌ ${func} - Missing retry function`);
    retryLogicPassed = false;
  }
});

// Test 8: Check old endpoint removal
console.log('\n🧹 Old Endpoint Cleanup Check:');
const oldEndpointFiles = [
  'src/app/api/upload-queue/fast-bulk-insert/route.ts'
];

let cleanupPassed = true;
oldEndpointFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ❌ ${file} - Still exists (should be removed)`);
    cleanupPassed = false;
  } else {
    console.log(`  ✅ ${file} - Properly removed`);
  }
});

// Test 9: Check documentation
console.log('\n📚 Documentation Check:');
const docsContent = fs.existsSync('docs/upload-api-best-practices.md') 
  ? fs.readFileSync('docs/upload-api-best-practices.md', 'utf8') 
  : '';

const docSections = [
  '## API Endpoint',
  '## Error Handling',
  '## Retry Logic',
  '## Usage Examples',
  '## Frontend Integration'
];

let documentationPassed = true;
docSections.forEach(section => {
  if (docsContent.includes(section)) {
    console.log(`  ✅ ${section}`);
  } else {
    console.log(`  ❌ ${section} - Missing documentation section`);
    documentationPassed = false;
  }
});

// Summary
console.log('\n📊 Alignment Summary');
console.log('===================');

const allTests = [
  { name: 'File Structure', passed: fileStructurePassed },
  { name: 'API Endpoint Consistency', passed: apiConsistencyPassed },
  { name: 'Database Schema', passed: schemaPassed },
  { name: 'Import Consistency', passed: importsPassed },
  { name: 'Response Handling', passed: responseHandlingPassed },
  { name: 'Error Handling', passed: errorHandlingPassed },
  { name: 'Retry Logic', passed: retryLogicPassed },
  { name: 'Old Endpoint Cleanup', passed: cleanupPassed },
  { name: 'Documentation', passed: documentationPassed }
];

const passedTests = allTests.filter(test => test.passed).length;
const totalTests = allTests.length;

allTests.forEach(test => {
  const status = test.passed ? '✅' : '❌';
  console.log(`${status} ${test.name}`);
});

console.log(`\n🎯 Overall Alignment: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All systems are aligned! The upload CV module is ready for production.');
} else {
  console.log('⚠️  Some alignment issues found. Please review and fix the failing tests.');
  process.exit(1);
}

console.log('\n✨ Alignment check completed successfully!'); 