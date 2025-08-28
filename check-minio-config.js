#!/usr/bin/env node

/**
 * MinIO Configuration Diagnostic Script
 * This script helps diagnose MinIO configuration issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 MinIO Configuration Diagnostic\n');

// Check environment files
const envFiles = [
  '.env.local',
  '.env.production',
  '.env.internal'
];

console.log('📁 Environment Files:');
envFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - Found`);
    
    // Read and parse env file
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const minioConfig = {};
    lines.forEach(line => {
      if (line.startsWith('MINIO_') || line.startsWith('NEXT_PUBLIC_MINIO_')) {
        const [key, value] = line.split('=');
        if (key && value) {
          minioConfig[key.trim()] = value.trim();
        }
      }
    });
    
    if (Object.keys(minioConfig).length > 0) {
      console.log(`   MinIO Configuration in ${file}:`);
      Object.entries(minioConfig).forEach(([key, value]) => {
        console.log(`   ${key}=${value}`);
      });
    }
  } else {
    console.log(`❌ ${file} - Not found`);
  }
  console.log('');
});

// Check docker-compose configuration
console.log('🐳 Docker Compose Configuration:');
const dockerComposePath = path.join(__dirname, 'docker-compose.yml');
if (fs.existsSync(dockerComposePath)) {
  console.log('✅ docker-compose.yml - Found');
  
  const content = fs.readFileSync(dockerComposePath, 'utf8');
  const lines = content.split('\n');
  
  let inMinioService = false;
  lines.forEach(line => {
    if (line.includes('minio:')) {
      inMinioService = true;
      console.log('   MinIO service configuration:');
    } else if (inMinioService && line.trim().startsWith('-')) {
      console.log(`   ${line.trim()}`);
    } else if (inMinioService && line.trim() === '') {
      inMinioService = false;
    }
  });
} else {
  console.log('❌ docker-compose.yml - Not found');
}

console.log('\n🔧 Recommendations:');
console.log('1. Ensure MINIO_PORT and MINIO_PUBLIC_BASE_URL use consistent ports');
console.log('2. Check that MinIO is running and accessible');
console.log('3. Verify network connectivity between app and MinIO');
console.log('4. Check firewall settings if using remote MinIO');

console.log('\n📋 Common Issues:');
console.log('- Port mismatch between API (9000) and public URL (8621)');
console.log('- MinIO not running or not accessible');
console.log('- Network connectivity issues');
console.log('- Incorrect environment variables');

console.log('\n🚀 Next Steps:');
console.log('1. Run: docker-compose ps (to check if MinIO is running)');
console.log('2. Run: curl http://localhost:9000 (to test MinIO API)');
console.log('3. Check browser console for specific error messages');
console.log('4. Verify environment variables are loaded correctly');
