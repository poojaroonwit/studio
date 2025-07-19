// Debug script to test attachment upload endpoint
// Run with: node debug-attachment-upload.js

const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const API_BASE = 'http://192.168.1.45:8021';
const CANDIDATE_ID = 'ddf53b79-03fe-4a6b-8839-0f3fd9101982';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImEzN2M3OGJlLWZkNTUtNDA4Mi1iYmNlLTMyM2ZiMWZlNDUyOCIsImVtYWlsIjoiYWRtaW5AcXNuY2MuY29tIiwicm9sZSI6IkFkbWluIiwibW9kdWxlUGVybWlzc2lvbnMiOlsiQ0FORElEQVRFU19WSUVXIiwiQ0FORElEQVRFU19NQU5BR0UiLCJDQU5ESURBVEVTX0lNUE9SVCIsIkNBTkRJREFURVNfRVhQT1JUIiwiUE9TSVRJT05TX1ZJRVciLCJQT1NJVElPTlNfTUFOQUdFIiwiUE9TSVRJT05TX0lNUE9SVCIsIlBPU0lUSU9OU19FWFBPUlQiLCJVU0VSU19NQU5BR0UiLCJVU0VSX0dST1VQU19NQU5BR0UiLCJTWVNURU1fU0VUVElOR1NfTUFOQUdFIiwiVVNFUl9QUkVGRVJFTkNFU19NQU5BR0UiLCJSRUNSVUlUTUVOVF9TVEFHRVNfTUFOQUdFIiwiQ1VTVE9NX0ZJRUxEU19NQU5BR0UiLCJMT0dTX1ZJRVciLCJBSV9JTlRFR1JBVElPTl9NQU5BR0UiLCJBTkFMWVRJQ1NfVklFVyIsIkFQSV9LRVlTX01BTkFHRSIsIkFVRElUX0xPR1NfVklFVyIsIkFVVE9NQVRJT05fVVBMT0FEIiwiQlVMS19VUExPQUQiLCJDQU5ESURBVEVTX0NPTU1FTlRTIiwiQ0FORElEQVRFU19SRUNSVUlURVJfQVNTSUdOIiwiQ0FORElEQVRFU19SRVNVTUVTIiwiQ0FORElEQVRFU19UUkFOU0lUSU9OUyIsIkRBU0hCT0FSRF9WSUVXIiwiRklOQU5DRV9ERVBBUlRNRU5UX01BTkFHRSIsIkhSX0RFUEFSVE1FTlRfTUFOQUdFIiwiSVRfREVQQVJUTUVOVF9NQU5BR0UiLCJNQVJLRVRJTkdfREVQQVJUTUVOVF9NQU5BR0UiLCJVUExPQURfUVVFVUVfTUFOQUdFIiwiV0VCSE9PS19BTkFMWVRJQ1NfVklFVyIsIldFQkhPT0tfTE9HU19WSUVXIiwiV0VCSE9PS19NQVBQSU5HX01BTkFHRSJdLCJpYXQiOjE3NTI5MzQzMTAsImV4cCI6MTc1MjkzNzkxMH0.tObVesBaAwSp7fSe7FwJWAPoivEkx2nYccGzsEqIrhI';

async function testValidUpload() {
  console.log('Testing valid file upload...');
  
  const formData = new FormData();
  
  // Create a test file
  const testContent = 'This is a test file for debugging attachment uploads.';
  const testFile = Buffer.from(testContent);
  
  formData.append('attachment', testFile, {
    filename: 'test-file.txt',
    contentType: 'text/plain'
  });
  
  try {
    const response = await fetch(`${API_BASE}/api/v1/candidates/${CANDIDATE_ID}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Valid upload test passed');
    } else {
      console.log('❌ Valid upload test failed');
    }
  } catch (error) {
    console.error('Error in valid upload test:', error);
  }
}

async function testEmptyField() {
  console.log('\nTesting empty form field (reproducing the issue)...');
  
  const formData = new FormData();
  
  // This reproduces the problematic request - empty field
  formData.append('attachment', '', {
    filename: '',
    contentType: 'application/octet-stream'
  });
  
  try {
    const response = await fetch(`${API_BASE}/api/v1/candidates/${CANDIDATE_ID}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 400) {
      console.log('✅ Empty field test correctly returned 400');
    } else {
      console.log('❌ Empty field test did not return expected 400');
    }
  } catch (error) {
    console.error('Error in empty field test:', error);
  }
}

async function testMissingField() {
  console.log('\nTesting missing file field...');
  
  const formData = new FormData();
  
  // Add some other field but no file
  formData.append('someOtherField', 'some value');
  
  try {
    const response = await fetch(`${API_BASE}/api/v1/candidates/${CANDIDATE_ID}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 400) {
      console.log('✅ Missing field test correctly returned 400');
    } else {
      console.log('❌ Missing field test did not return expected 400');
    }
  } catch (error) {
    console.error('Error in missing field test:', error);
  }
}

async function testPluralFieldName() {
  console.log('\nTesting plural field name (attachments)...');
  
  const formData = new FormData();
  
  // Test with plural field name
  const testContent = 'This is a test file using plural field name.';
  const testFile = Buffer.from(testContent);
  
  formData.append('attachments', testFile, {
    filename: 'test-file-plural.txt',
    contentType: 'text/plain'
  });
  
  try {
    const response = await fetch(`${API_BASE}/api/v1/candidates/${CANDIDATE_ID}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Plural field name test passed');
    } else {
      console.log('❌ Plural field name test failed');
    }
  } catch (error) {
    console.error('Error in plural field name test:', error);
  }
}

async function runAllTests() {
  console.log('🧪 Running attachment upload tests...\n');
  
  await testValidUpload();
  await testEmptyField();
  await testMissingField();
  await testPluralFieldName();
  
  console.log('\n🏁 All tests completed');
}

// Run the tests
runAllTests().catch(console.error); 