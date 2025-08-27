#!/usr/bin/env node

/**
 * Local Development Startup Script
 * 
 * This script helps set up the local environment and starts the application
 * with proper memory settings to prevent heap out of memory errors.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Check if .env.local exists
const envLocalPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.log('⚠️  .env.local file not found!');
  console.log('📝 Creating .env.local from template...');
  
  const templatePath = path.join(__dirname, 'env.local.template');
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, envLocalPath);
    console.log('✅ Created .env.local from template');
    console.log('🔧 Please review and update .env.local with your specific configuration');
  } else {
    console.log('❌ env.local.template not found!');
    console.log('📝 Please create .env.local manually with the following minimum configuration:');
    console.log('');
    console.log('NODE_ENV=development');
    console.log('APP_PORT=8021');
    console.log('DATABASE_URL=postgresql://studio_user:local_dev_password@localhost:5432/studio_dev');
    console.log('NEXTAUTH_SECRET=your-local-development-secret-key-change-this');
    console.log('NEXTAUTH_URL=http://localhost:8021');
    console.log('PROCESSOR_URL=http://localhost:8021');
    console.log('');
    process.exit(1);
  }
}

// Function to start the main application
function startMainApp() {
  console.log('🚀 Starting main application with increased memory...');
  
  const child = spawn('node', [
    '--max-old-space-size=4096',
    '--optimize-for-size',
    './node_modules/.bin/next',
    'start',
    '-p', '8021'
  ], {
    stdio: 'inherit',
    shell: true
  });
  
  child.on('error', (error) => {
    console.error('❌ Failed to start main application:', error.message);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    console.log(`📱 Main application exited with code ${code}`);
    process.exit(code);
  });
  
  return child;
}

// Function to start the processor
function startProcessor() {
  console.log('⚙️  Starting upload queue processor...');
  
  const child = spawn('node', [
    '--max-old-space-size=2048',
    './scripts/process-upload-queue.cjs'
  ], {
    stdio: 'inherit',
    shell: true
  });
  
  child.on('error', (error) => {
    console.error('❌ Failed to start processor:', error.message);
  });
  
  child.on('exit', (code) => {
    console.log(`⚙️  Processor exited with code ${code}`);
  });
  
  return child;
}

// Main execution
console.log('🎯 Local Development Startup');
console.log('============================');

// Check if we should start both or just the main app
const args = process.argv.slice(2);
const startBoth = args.includes('--with-processor') || args.includes('-p');

if (startBoth) {
  console.log('📋 Starting both main application and processor...');
  
  const mainApp = startMainApp();
  const processor = startProcessor();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    mainApp.kill('SIGINT');
    processor.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    mainApp.kill('SIGTERM');
    processor.kill('SIGTERM');
  });
} else {
  console.log('📋 Starting main application only...');
  console.log('💡 Use --with-processor flag to start both app and processor');
  
  const mainApp = startMainApp();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    mainApp.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    mainApp.kill('SIGTERM');
  });
}
