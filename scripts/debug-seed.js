#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging seed execution...');
console.log('📋 Environment check:');
console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  - DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
console.log(`  - Current directory: ${process.cwd()}`);

// Check if seed file exists
const seedPath = path.join(process.cwd(), 'prisma', 'seed.ts');
console.log(`  - Seed file exists: ${fs.existsSync(seedPath)}`);

// Check if tsx is available
try {
    const tsxVersion = execSync('npx tsx --version', { encoding: 'utf8' });
    console.log(`  - tsx version: ${tsxVersion.trim()}`);
} catch (error) {
    console.log('  - tsx not available or failed to run');
}

// Check if prisma is available
try {
    const prismaVersion = execSync('npx prisma --version', { encoding: 'utf8' });
    console.log(`  - prisma version: ${prismaVersion.trim()}`);
} catch (error) {
    console.log('  - prisma not available or failed to run');
}

// Check database connection
console.log('\n🔍 Testing database connection...');
try {
    const dbTest = execSync('npx prisma db execute --stdin --schema=prisma/schema.prisma', {
        input: 'SELECT 1 as test;',
        encoding: 'utf8'
    });
    console.log('  ✅ Database connection successful');
    console.log(`  - Test result: ${dbTest.trim()}`);
} catch (error) {
    console.log('  ❌ Database connection failed');
    console.log(`  - Error: ${error.message}`);
}

// Try to run seed with detailed output
console.log('\n🌱 Attempting to run seed...');
try {
    console.log('📋 Running: npx prisma db seed');
    const seedResult = execSync('npx prisma db seed', { 
        encoding: 'utf8',
        stdio: 'pipe'
    });
    console.log('✅ Seed completed successfully');
    console.log('📄 Output:', seedResult);
} catch (error) {
    console.log('❌ Seed failed');
    console.log(`📄 Error output: ${error.stdout || error.message}`);
    
    // Try manual execution
    console.log('\n🔍 Trying manual seed execution...');
    try {
        const manualResult = execSync('npx tsx prisma/seed.ts', { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        console.log('✅ Manual seed completed successfully');
        console.log('📄 Output:', manualResult);
    } catch (manualError) {
        console.log('❌ Manual seed also failed');
        console.log(`📄 Error output: ${manualError.stdout || manualError.message}`);
    }
}

console.log('\n�� Debug complete');
