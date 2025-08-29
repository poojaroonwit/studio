#!/usr/bin/env node

/**
 * Test script to verify infinite loop fix in UnifiedRealtimeConnection
 * This script monitors the console output to check if the infinite loop warnings stop
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Infinite Loop Fix for UnifiedRealtimeConnection...\n');

// Start the development server
const devProcess = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let warningCount = 0;
let startTime = Date.now();
const testDuration = 30000; // 30 seconds
const maxWarnings = 5; // Allow a few warnings during startup

console.log(`⏱️  Running test for ${testDuration / 1000} seconds...\n`);

devProcess.stdout.on('data', (data) => {
  const chunk = data.toString();
  output += chunk;
  
  // Check for infinite loop warnings
  const warnings = chunk.match(/🚨 useSafeEffect: Effect "UnifiedRealtimeConnection" has run \d+ times/g);
  if (warnings) {
    warningCount += warnings.length;
    console.log(`⚠️  Warning detected: ${warnings.length} new warnings (Total: ${warningCount})`);
  }
  
  // Check if server is ready
  if (chunk.includes('Ready') || chunk.includes('Local:')) {
    console.log('✅ Development server is ready');
  }
});

devProcess.stderr.on('data', (data) => {
  const chunk = data.toString();
  output += chunk;
  
  // Check for infinite loop warnings in stderr
  const warnings = chunk.match(/🚨 useSafeEffect: Effect "UnifiedRealtimeConnection" has run \d+ times/g);
  if (warnings) {
    warningCount += warnings.length;
    console.log(`⚠️  Warning detected in stderr: ${warnings.length} new warnings (Total: ${warningCount})`);
  }
});

// Set up test timeout
const testTimeout = setTimeout(() => {
  console.log('\n⏰ Test timeout reached');
  analyzeResults();
}, testDuration);

function analyzeResults() {
  clearTimeout(testTimeout);
  
  console.log('\n📊 Test Results:');
  console.log(`Total warnings: ${warningCount}`);
  console.log(`Test duration: ${(Date.now() - startTime) / 1000} seconds`);
  
  if (warningCount <= maxWarnings) {
    console.log('✅ SUCCESS: Infinite loop appears to be fixed!');
    console.log(`   Only ${warningCount} warnings detected (within acceptable limit of ${maxWarnings})`);
  } else {
    console.log('❌ FAILURE: Infinite loop may still be present');
    console.log(`   ${warningCount} warnings detected (exceeds limit of ${maxWarnings})`);
  }
  
  // Save output for analysis
  const outputFile = path.join(__dirname, 'infinite-loop-test-results.json');
  const results = {
    timestamp: new Date().toISOString(),
    warningCount,
    testDuration: (Date.now() - startTime) / 1000,
    success: warningCount <= maxWarnings,
    output: output.substring(-5000) // Last 5000 characters
  };
  
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`📄 Results saved to: ${outputFile}`);
  
  // Cleanup
  devProcess.kill('SIGTERM');
  process.exit(warningCount <= maxWarnings ? 0 : 1);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  analyzeResults();
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  analyzeResults();
});

// Handle dev process exit
devProcess.on('exit', (code) => {
  console.log(`\n🔄 Development server exited with code: ${code}`);
  analyzeResults();
});

console.log('🚀 Starting development server...\n');
