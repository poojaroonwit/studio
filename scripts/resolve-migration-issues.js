#!/usr/bin/env node

/**
 * Migration Issue Resolution Script
 * 
 * This script helps resolve common Prisma migration issues including:
 * - Failed migrations
 * - Migration conflicts
 * - Database connection issues
 * 
 * Usage: node scripts/resolve-migration-issues.js [--resolve-failed] [--reset] [--force]
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

function checkDatabaseConnection() {
    try {
        logInfo('Testing database connection...');
        execSync('echo "SELECT 1;" | npx prisma db execute --stdin --schema=prisma/schema.prisma', { 
            stdio: 'pipe'
        });
        logSuccess('Database connection verified');
        return true;
    } catch (error) {
        logError(`Database connection failed: ${error.message}`);
        return false;
    }
}

function getMigrationStatus() {
    try {
        const output = execSync('npx prisma migrate status --json', { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        return JSON.parse(output);
    } catch (error) {
        logWarning('Could not get migration status');
        return null;
    }
}

function resolveFailedMigrations() {
    logInfo('Checking for failed migrations...');
    
    const status = getMigrationStatus();
    if (!status) {
        logWarning('Could not determine migration status');
        return false;
    }
    
    let resolved = 0;
    
    // Check for failed migrations in the status
    if (status.migrations) {
        for (const migration of status.migrations) {
            if (migration.applied === 0 && migration.finishedAt === null) {
                logInfo(`Found failed migration: ${migration.migrationId}`);
                try {
                    execSync(`npx prisma migrate resolve --applied ${migration.migrationId}`, {
                        stdio: 'inherit'
                    });
                    logSuccess(`Resolved migration: ${migration.migrationId}`);
                    resolved++;
                } catch (error) {
                    logError(`Failed to resolve migration ${migration.migrationId}: ${error.message}`);
                }
            }
        }
    }
    
    if (resolved > 0) {
        logSuccess(`Resolved ${resolved} failed migration(s)`);
        return true;
    } else {
        logInfo('No failed migrations found');
        return false;
    }
}

function resetMigrations() {
    logWarning('This will reset all migrations and data in the database!');
    logWarning('Are you sure you want to continue? (y/N)');
    
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question('', (answer) => {
            rl.close();
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                try {
                    logInfo('Resetting migrations...');
                    execSync('npx prisma migrate reset --force', {
                        stdio: 'inherit'
                    });
                    logSuccess('Migrations reset successfully');
                    resolve(true);
                } catch (error) {
                    logError(`Failed to reset migrations: ${error.message}`);
                    resolve(false);
                }
            } else {
                logInfo('Migration reset cancelled');
                resolve(false);
            }
        });
    });
}

function runMigrations() {
    try {
        logInfo('Running migrations...');
        execSync('npx prisma migrate deploy', {
            stdio: 'inherit'
        });
        logSuccess('Migrations completed successfully');
        return true;
    } catch (error) {
        logError(`Migration failed: ${error.message}`);
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const resolveFailed = args.includes('--resolve-failed');
    const reset = args.includes('--reset');
    const force = args.includes('--force');
    
    log('🔧 Migration Issue Resolution Script', 'cyan');
    log('=====================================', 'cyan');
    console.log('');
    
    // Check database connection first
    if (!checkDatabaseConnection()) {
        if (force) {
            logWarning('Database connection failed, but continuing due to --force flag');
        } else {
            logError('Cannot proceed without database connection');
            process.exit(1);
        }
    }
    
    try {
        if (reset) {
            // Reset migrations
            if (await resetMigrations()) {
                // Run migrations after reset
                runMigrations();
            }
        } else if (resolveFailed) {
            // Resolve failed migrations
            if (resolveFailedMigrations()) {
                // Try running migrations again
                runMigrations();
            } else {
                logInfo('No failed migrations to resolve');
            }
        } else {
            // Default: check and resolve issues
            logInfo('Checking migration status...');
            const status = getMigrationStatus();
            
            if (status) {
                logInfo(`Database: ${status.databaseState}`);
                logInfo(`Migrations: ${status.migrations?.length || 0} total`);
                
                const failedCount = status.migrations?.filter(m => m.applied === 0 && m.finishedAt === null).length || 0;
                if (failedCount > 0) {
                    logWarning(`Found ${failedCount} failed migration(s)`);
                    logInfo('Use --resolve-failed to automatically resolve them');
                }
            }
            
            // Try running migrations
            runMigrations();
        }
        
    } catch (error) {
        logError(`Unexpected error: ${error.message}`);
        if (force) {
            logWarning('Continuing despite error due to --force flag');
            process.exit(0);
        }
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

module.exports = { 
    checkDatabaseConnection, 
    getMigrationStatus, 
    resolveFailedMigrations, 
    resetMigrations, 
    runMigrations 
};
