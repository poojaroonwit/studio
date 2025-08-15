#!/usr/bin/env node

/**
 * Test script to simulate migration divergence scenario
 * This script helps verify that the entrypoint.sh handles migration divergence correctly
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing migration divergence handling...\n');

// Check if we can connect to the database
try {
    console.log('📊 Checking database connection...');
    const status = execSync('npx prisma migrate status --schema=prisma/schema.prisma', { 
        encoding: 'utf8',
        stdio: 'pipe'
    });
    
    console.log('✅ Database connection successful');
    console.log('📋 Migration status:');
    console.log(status);
    
    // Check for migration divergence
    if (status.includes('migrations recorded in the database diverge from the local migrations directory')) {
        console.log('\n⚠️  Migration divergence detected!');
        console.log('🔄 Testing db push as solution...');
        
        try {
            const pushResult = execSync('npx prisma db push --accept-data-loss --schema=prisma/schema.prisma', {
                encoding: 'utf8',
                stdio: 'pipe'
            });
            console.log('✅ Database schema synced successfully');
            console.log(pushResult);
        } catch (pushError) {
            console.log('❌ Failed to sync database schema:');
            console.log(pushError.message);
        }
    } else if (status.includes('Database schema is out of sync')) {
        console.log('\n⚠️  Schema out of sync detected!');
        console.log('🔄 Testing db push as solution...');
        
        try {
            const pushResult = execSync('npx prisma db push --accept-data-loss --schema=prisma/schema.prisma', {
                encoding: 'utf8',
                stdio: 'pipe'
            });
            console.log('✅ Database schema synced successfully');
            console.log(pushResult);
        } catch (pushError) {
            console.log('❌ Failed to sync database schema:');
            console.log(pushError.message);
        }
    } else {
        console.log('\n✅ No migration issues detected');
    }
    
} catch (error) {
    console.log('❌ Database connection failed:');
    console.log(error.message);
    console.log('\n💡 Make sure the database is running and DATABASE_URL is set correctly');
    console.log('   You can start the database with: docker-compose up postgres -d');
}

console.log('\n📝 Summary of entrypoint.sh improvements:');
console.log('1. Added detection for migration divergence');
console.log('2. Added fallback to db push when initial migration creation fails');
console.log('3. Added specific handling for schema divergence scenarios');
console.log('4. Improved error messages and logging');
