#!/usr/bin/env node

/**
 * Test Auto Security Script
 * 
 * This script tests the automatic security enforcement
 * 
 * Usage: node scripts/test-auto-security.js
 */

const { autoEnforceBucketSecurity } = require('../src/lib/minio.ts');

async function testAutoSecurity() {
  try {
    console.log('🧪 Testing automatic security enforcement...');
    
    await autoEnforceBucketSecurity();
    
    console.log('✅ Auto security test completed');
    
  } catch (error) {
    console.error('❌ Auto security test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAutoSecurity().catch(console.error);
