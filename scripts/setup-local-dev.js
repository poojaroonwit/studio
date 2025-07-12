#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, existsSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 Setting up local development environment...\n');

// Check if .env.local exists
const envLocalPath = join(projectRoot, '.env.local');
if (!existsSync(envLocalPath)) {
    console.error('❌ .env.local file not found!');
    console.log('Please copy env.local.template to .env.local:');
    console.log('cp env.local.template .env.local');
    process.exit(1);
}

console.log('✅ .env.local file found');

// Define originalEnvPath outside try block for cleanup
const originalEnvPath = join(projectRoot, '.env');

// Load environment variables from .env.local
try {
    const envContent = readFileSync(envLocalPath, 'utf8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
            const [key, ...valueParts] = trimmedLine.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=');
                process.env[key] = value;
            }
        }
    }
    
    console.log('✅ Environment variables loaded from .env.local');
    
    // Create a temporary .env file for Prisma commands
    const envFileContent = Object.entries(process.env)
        .filter(([key, value]) => {
            // Filter out problematic Windows system variables
            if (!value || value === undefined) return false;
            if (key.includes('(') || key.includes(')')) return false; // Skip variables with parentheses
            if (key.includes('=')) return false; // Skip variables with equals signs in name
            if (key.startsWith('CHROME_')) return false; // Skip Chrome-related variables
            if (key.startsWith('CURSOR_')) return false; // Skip Cursor-related variables
            if (key === 'COLOR' || key === 'COLORTERM') return false; // Skip color variables
            return true;
        })
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    // Backup original .env if it exists
    if (existsSync(originalEnvPath)) {
        const originalContent = readFileSync(originalEnvPath, 'utf8');
        writeFileSync(join(projectRoot, '.env.backup'), originalContent);
    }
    
    // Write our environment variables to .env
    writeFileSync(originalEnvPath, envFileContent);
    console.log('✅ Created temporary .env file for Prisma commands');
    
} catch (error) {
    console.error('❌ Error loading .env.local:', error.message);
    process.exit(1);
}

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set in .env.local');
    process.exit(1);
}

console.log(`📊 Using database: ${process.env.DATABASE_URL.replace(/\/\/.*@/, '//***:***@')}`);

try {
    // Generate Prisma client
    console.log('\n🔨 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit', cwd: projectRoot, env: { ...process.env } });

    // Check if migrations exist, if not create initial migration
    console.log('\n🔍 Checking for existing migrations...');
    const migrationsDir = join(projectRoot, 'prisma', 'migrations');
    
    if (!existsSync(migrationsDir) || readdirSync(migrationsDir).length === 0) {
        console.log('No existing migrations found, creating initial migration...');
        execSync('npx prisma migrate dev --name init', { stdio: 'inherit', cwd: projectRoot, env: { ...process.env } });
    } else {
        console.log('Existing migrations found, deploying...');
        execSync('npx prisma migrate deploy', { stdio: 'inherit', cwd: projectRoot, env: { ...process.env } });
    }

    // Seed the database
    console.log('\n🌱 Seeding database with initial data...');
    execSync('npx prisma db seed', { stdio: 'inherit', cwd: projectRoot, env: { ...process.env } });

    console.log('\n✅ Local development setup complete!');
    
    // Cleanup: restore original .env if backup exists
    const backupPath = join(projectRoot, '.env.backup');
    if (existsSync(backupPath)) {
        const backupContent = readFileSync(backupPath, 'utf8');
        writeFileSync(originalEnvPath, backupContent);
        writeFileSync(backupPath, ''); // Clear backup
        console.log('✅ Restored original .env file');
    }
    
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Start the required services:');
    console.log('   docker-compose up -d postgres minio redis');
    console.log('');
    console.log('2. Start your application:');
    console.log('   npm run dev');
    console.log('');
    console.log('3. Access the application at: http://localhost:8021');
    console.log('4. Login with: admin@ncc.com / nccadmin');
    console.log('');
    console.log('🔍 If you encounter any issues, check:');
    console.log(`- Database connection: ${process.env.DATABASE_URL.replace(/\/\/.*@/, '//***:***@')}`);
    console.log('- Application logs for detailed error messages');

} catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('');
    console.log('🔍 Troubleshooting:');
    console.log('1. Ensure PostgreSQL is running (docker-compose up -d postgres)');
    console.log('2. Verify DATABASE_URL is correct in .env.local');
    console.log('3. Check if the database exists');
    console.log('4. Ensure the postgres user has proper permissions');
    process.exit(1);
} 