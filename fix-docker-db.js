const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Docker Database Configuration...\n');

// Read current .env.local
const envLocalPath = path.join(__dirname, '.env.local');
const backupPath = path.join(__dirname, '.env.local.backup.docker');

if (!fs.existsSync(envLocalPath)) {
  console.error('❌ .env.local file not found');
  process.exit(1);
}

// Backup current configuration
fs.copyFileSync(envLocalPath, backupPath);
console.log('✅ Backed up current .env.local to .env.local.backup.docker');

// Read and update the configuration
let envContent = fs.readFileSync(envLocalPath, 'utf8');

// Replace the DATABASE_URL to use internal Docker network
envContent = envContent.replace(
  /DATABASE_URL=postgresql:\/\/postgres:secure_password@192\.168\.1\.37:8521\/studio_production/,
  'DATABASE_URL=postgresql://postgres:secure_password@postgres:5432/studio_production'
);

// Add POSTGRES_HOST if not present
if (!envContent.includes('POSTGRES_HOST=')) {
  envContent += '\nPOSTGRES_HOST=postgres\n';
}

// Add POSTGRES_PORT if not present
if (!envContent.includes('POSTGRES_PORT=')) {
  envContent += '\nPOSTGRES_PORT=5432\n';
}

// Add POSTGRES_USER if not present
if (!envContent.includes('POSTGRES_USER=')) {
  envContent += '\nPOSTGRES_USER=postgres\n';
}

// Add POSTGRES_PASSWORD if not present
if (!envContent.includes('POSTGRES_PASSWORD=')) {
  envContent += '\nPOSTGRES_PASSWORD=secure_password\n';
}

// Add POSTGRES_DB if not present
if (!envContent.includes('POSTGRES_DB=')) {
  envContent += '\nPOSTGRES_DB=studio_production\n';
}

// Write updated configuration
fs.writeFileSync(envLocalPath, envContent);
console.log('✅ Updated .env.local with Docker internal network configuration');

console.log('\n📊 Docker Database Configuration:');
console.log('  Internal Host: postgres:5432');
console.log('  Database: studio_production');
console.log('  User: postgres');

console.log('\n🔄 Next Steps:');
console.log('  1. Restart Docker containers: docker-compose down && docker-compose up -d');
console.log('  2. The app should now connect to the database properly');
console.log('  3. Check the positions API: http://192.168.1.37:8021/positions');

console.log('\n⚠️  Note: This uses internal Docker network addresses.');
console.log('   To switch back to external database, restore .env.local.backup.docker');
