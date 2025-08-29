#!/usr/bin/env node

/**
 * Script to disable session logging and reduce container logs
 * This script helps reduce verbose session-related logs that appear in container output
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Disabling session logging to reduce container logs...\n');

// Check if .env.local exists
const envLocalPath = path.join(process.cwd(), '.env.local');
const envLocalExists = fs.existsSync(envLocalPath);

if (envLocalExists) {
  let envContent = fs.readFileSync(envLocalPath, 'utf8');
  
  // Add or update NextAuth debug setting
  if (envContent.includes('NEXTAUTH_DEBUG=')) {
    envContent = envContent.replace(/NEXTAUTH_DEBUG=.*/g, 'NEXTAUTH_DEBUG=false');
  } else {
    envContent += '\n# Disable NextAuth debug logging\nNEXTAUTH_DEBUG=false\n';
  }
  
  // Add or update session logging settings
  if (envContent.includes('SESSION_LOGGING=')) {
    envContent = envContent.replace(/SESSION_LOGGING=.*/g, 'SESSION_LOGGING=false');
  } else {
    envContent += '\n# Disable session logging\nSESSION_LOGGING=false\n';
  }
  
  fs.writeFileSync(envLocalPath, envContent);
  console.log('✅ Updated .env.local with session logging disabled');
} else {
  console.log('⚠️  .env.local not found. Creating new file...');
  const newEnvContent = `# Disable session logging to reduce container logs
NEXTAUTH_DEBUG=false
SESSION_LOGGING=false
`;
  fs.writeFileSync(envLocalPath, newEnvContent);
  console.log('✅ Created .env.local with session logging disabled');
}

console.log('\n📋 Summary of changes:');
console.log('• Disabled NextAuth debug logging (NEXTAUTH_DEBUG=false)');
console.log('• Disabled session logging (SESSION_LOGGING=false)');
console.log('• Removed console.log statements from session-related code');
console.log('\n🔄 To apply changes:');
console.log('1. Restart your development server');
console.log('2. If using Docker, rebuild your containers');
console.log('\n💡 To re-enable session logging for debugging:');
console.log('1. Set NEXTAUTH_DEBUG=true in .env.local');
console.log('2. Set SESSION_LOGGING=true in .env.local');
console.log('3. Restart your server');

console.log('\n✨ Session logging has been disabled to reduce container logs!');
