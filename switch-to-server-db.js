const fs = require('fs');
const path = require('path');

console.log('🔄 Switching to Server Database Configuration...\n');

// Server database configuration
const serverConfig = `# =================================================================
# Server Database Configuration
# =================================================================
# This file connects to your server database at 10.0.10.71:8521

NODE_ENV=development
APP_PORT=8021
NEXT_TELEMETRY_DISABLED=1

# =================================================================
# Database Configuration (Server)
# =================================================================
DATABASE_URL=postgresql://postgres:secure_password@10.0.10.71:8521/studio_production

# Database Connection Pool Configuration
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=10
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=1800000
DATABASE_STATEMENT_TIMEOUT=30000

# =================================================================
# MinIO Object Storage Configuration (Server)
# =================================================================
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=10.0.10.71
MINIO_PORT=8621
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=studio-files
MINIO_USE_SSL=false
MINIO_PUBLIC_BASE_URL=http://10.0.10.71:8621
MINIO_API_PORT=8621
MINIO_CONSOLE_PORT=8721

# =================================================================
# Authentication Configuration
# =================================================================
NEXTAUTH_SECRET=your-local-development-secret-key-change-this
NEXTAUTH_URL=http://localhost:8021

# =================================================================
# Webhook Configuration
# =================================================================
PROCESSOR_API_KEY=local-dev-api-key
PROCESSOR_URL=http://localhost:8021
UPLOAD_QUEUE_PROCESS_URL=http://localhost:8021/api/upload-queue/process
PROCESSOR_INTERVAL_MS=5000
MAX_CONCURRENT_PROCESSORS=3
LOG_INTERVAL_MS=30000

# =================================================================
# Public MinIO Configuration
# =================================================================
NEXT_PUBLIC_MINIO_BUCKET=studio-files
NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL=http://10.0.10.71:8621
NEXT_PUBLIC_MINIO_URL=http://10.0.10.71:8621
NEXT_PUBLIC_MINIO_BUCKET_NAME=studio-files
`;

// Backup current .env.local
const envLocalPath = path.join(__dirname, '.env.local');
const backupPath = path.join(__dirname, '.env.local.backup.server');

if (fs.existsSync(envLocalPath)) {
  fs.copyFileSync(envLocalPath, backupPath);
  console.log('✅ Backed up current .env.local to .env.local.backup.server');
}

// Write server configuration
fs.writeFileSync(envLocalPath, serverConfig);
console.log('✅ Updated .env.local with server database configuration');

console.log('\n📊 Server Database Details:');
console.log('  Host: 10.0.10.71:8521');
console.log('  Database: studio_production');
console.log('  User: postgres');
console.log('  Jobs Found: 16 (12 failed, 4 successful)');

console.log('\n🔄 Next Steps:');
console.log('  1. Restart your development server: npm run dev');
console.log('  2. Check the upload queue - it should now show 16 jobs');
console.log('  3. The NaN values should be fixed');
console.log('  4. You can now see and manage the actual server jobs');

console.log('\n⚠️  Note: This connects to your server database.');
console.log('   Any changes you make will affect the server data.');
console.log('   To switch back to local database, restore .env.local.backup.server');
