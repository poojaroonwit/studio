#!/usr/bin/env node

/**
 * Fix Schema Sync Script
 * 
 * This script helps fix schema synchronization issues between Prisma schema
 * and the database, particularly for the SystemPromptCategory and SystemPrompt models.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function runCommand(command, description) {
    try {
        logInfo(description);
        execSync(command, { stdio: 'inherit' });
        logSuccess(`${description} completed`);
        return true;
    } catch (error) {
        logError(`${description} failed: ${error.message}`);
        return false;
    }
}

function main() {
    log('🔧 Fix Schema Sync Script', 'cyan');
    log('========================', 'cyan');
    console.log('');

    try {
        // Step 1: Generate Prisma client
        if (!runCommand('npx prisma generate', 'Generating Prisma client...')) {
            logError('Failed to generate Prisma client');
            process.exit(1);
        }

        // Step 2: Check database connection
        if (!runCommand('npx prisma db execute --stdin --schema=prisma/schema.prisma', 'Checking database connection...')) {
            logError('Cannot connect to database');
            process.exit(1);
        }

        // Step 3: Check migration status
        logInfo('Checking migration status...');
        let migrationStatus = '';
        try {
            migrationStatus = execSync('npx prisma migrate status', { 
                encoding: 'utf8',
                stdio: 'pipe'
            });
        } catch (error) {
            migrationStatus = error.stdout || '';
        }

        // Step 4: Handle different scenarios
        if (migrationStatus.includes('Database schema is out of sync')) {
            logWarning('Schema out of sync detected');
            
            // Try to sync schema
            if (runCommand('npx prisma db push --accept-data-loss', 'Syncing database schema...')) {
                logSuccess('Schema sync completed');
            } else {
                logError('Schema sync failed');
                logInfo('💡 You may need to manually run: npx prisma db push --accept-data-loss');
                process.exit(1);
            }
        } else if (migrationStatus.includes('Pending migrations')) {
            logWarning('Pending migrations detected');
            
            // Apply pending migrations
            if (runCommand('npx prisma migrate deploy', 'Applying pending migrations...')) {
                logSuccess('Migrations applied successfully');
            } else {
                logError('Failed to apply migrations');
                process.exit(1);
            }
        } else {
            logSuccess('Database schema is up to date');
        }

        // Step 5: Verify the fix
        logInfo('Verifying schema sync...');
        try {
            const finalStatus = execSync('npx prisma migrate status', { 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            if (finalStatus.includes('Database schema is out of sync')) {
                logWarning('Schema still appears to be out of sync');
                logInfo('💡 You may need to manually check the database schema');
            } else {
                logSuccess('Schema sync verification passed');
            }
        } catch (error) {
            logWarning('Could not verify schema sync status');
        }

        logSuccess('🎉 Schema sync fix completed!');

    } catch (error) {
        logError(`Unexpected error: ${error.message}`);
        process.exit(1);
    }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
    log('\n🛑 Process interrupted', 'yellow');
    process.exit(130);
});

process.on('SIGTERM', () => {
    log('\n🛑 Process terminated', 'yellow');
    process.exit(143);
});

// Run the script
if (require.main === module) {
    main();
}

module.exports = { runCommand };
