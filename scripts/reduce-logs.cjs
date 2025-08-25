#!/usr/bin/env node

/**
 * Reduce Verbose Logs Script
 * 
 * This script helps reduce the verbose logging from the upload queue processor
 * and health check services by setting appropriate environment variables.
 */

const fs = require('fs');
const path = require('path');

console.log('🔇 Reducing Verbose Logs Configuration\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('📁 Found existing .env.local file');
  
  // Read current content
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check for existing settings
  const hasProcessorQuiet = envContent.includes('PROCESSOR_QUIET_MODE');
  const hasHealthQuiet = envContent.includes('HEALTH_CHECK_QUIET_MODE');
  const hasEmptyBatchInterval = envContent.includes('EMPTY_BATCH_LOG_INTERVAL_MS');
  
  console.log('\n📊 Current settings:');
  console.log(`  PROCESSOR_QUIET_MODE: ${hasProcessorQuiet ? 'Set' : 'Not set'}`);
  console.log(`  HEALTH_CHECK_QUIET_MODE: ${hasHealthQuiet ? 'Set' : 'Not set'}`);
  console.log(`  EMPTY_BATCH_LOG_INTERVAL_MS: ${hasEmptyBatchInterval ? 'Set' : 'Not set'}`);
  
  // Add missing settings
  let updated = false;
  
  if (!hasProcessorQuiet) {
    envContent += '\n# Reduce processor logs\nPROCESSOR_QUIET_MODE=true\n';
    updated = true;
  }
  
  if (!hasHealthQuiet) {
    envContent += '\n# Reduce health check logs\nHEALTH_CHECK_QUIET_MODE=true\n';
    updated = true;
  }
  
  if (!hasEmptyBatchInterval) {
    envContent += '\n# Log empty batches only every 2 minutes\nEMPTY_BATCH_LOG_INTERVAL_MS=120000\n';
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Updated .env.local with quiet mode settings');
  } else {
    console.log('\nℹ️  All quiet mode settings are already configured');
  }
  
} else {
  console.log('📁 Creating new .env.local file with quiet mode settings');
  
  const newEnvContent = `# Upload Queue Processor - Quiet Mode Settings
# Reduce verbose logging for better performance and cleaner logs

# Enable quiet mode for processor (reduces "Batch processed" logs when no jobs)
PROCESSOR_QUIET_MODE=true

# Enable quiet mode for health checks (reduces repetitive error messages)
HEALTH_CHECK_QUIET_MODE=true

# Log empty batches only every 2 minutes instead of every 5 seconds
EMPTY_BATCH_LOG_INTERVAL_MS=120000

# Optional: Increase health check interval to reduce frequency
# HEALTH_CHECK_INTERVAL_MS=120000

# Optional: Increase processor interval if needed
# PROCESSOR_INTERVAL_MS=10000
`;
  
  fs.writeFileSync(envPath, newEnvContent);
  console.log('✅ Created .env.local with quiet mode settings');
}

console.log('\n📋 What these settings do:');
console.log('  • PROCESSOR_QUIET_MODE=true: Reduces "Batch processed" logs when no jobs are available');
console.log('  • HEALTH_CHECK_QUIET_MODE=true: Reduces repetitive "Queue processor is not running" messages');
console.log('  • EMPTY_BATCH_LOG_INTERVAL_MS=120000: Logs empty batches only every 2 minutes instead of every 5 seconds');

console.log('\n🔄 To apply these changes:');
console.log('  1. Restart your upload queue processor');
console.log('  2. Restart your health check service');
console.log('  3. Or restart your entire application');

console.log('\n🔍 To monitor logs with reduced noise:');
console.log('  • Check logs every few minutes instead of every few seconds');
console.log('  • Look for actual errors and important status messages');
console.log('  • Empty batch logs will now appear only every 2 minutes');

console.log('\n⚠️  Note: These settings reduce log verbosity but maintain all functionality.');
console.log('    Important errors and status updates will still be logged.');

console.log('\n🎉 Log reduction configuration complete!');
