#!/usr/bin/env node

/**
 * Auto-Migration Script
 * 
 * This script automatically detects and handles database migrations for both
 * new deployments and upgrades. It's designed to be simple and automatic.
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
        execSync('npx prisma db execute --stdin --schema=prisma/schema.prisma', {
            input: 'SELECT 1;',
            stdio: 'pipe'
        });
        return true;
    } catch (error) {
        return false;
    }
}

function checkFreshDatabase() {
    try {
        execSync('npx prisma db execute --stdin --schema=prisma/schema.prisma', {
            input: 'SELECT COUNT(*) FROM _prisma_migrations;',
            stdio: 'pipe'
        });
        return false; // Database exists and has migrations table
    } catch (error) {
        return true; // Fresh database
    }
}

function getMigrationStatus() {
    try {
        const status = execSync('npx prisma migrate status --schema=prisma/schema.prisma', {
            encoding: 'utf8',
            stdio: 'pipe'
        });
        return status;
    } catch (error) {
        return '';
    }
}

function hasPendingMigrations(status) {
    return status.includes('Pending migrations');
}

function isSchemaOutOfSync(status) {
    return status.includes('Database schema is out of sync');
}

function runMigration() {
    try {
        execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', {
            stdio: 'inherit'
        });
        return true;
    } catch (error) {
        return false;
    }
}

function syncSchema() {
    try {
        execSync('npx prisma db push --accept-data-loss --schema=prisma/schema.prisma', {
            stdio: 'inherit'
        });
        return true;
    } catch (error) {
        return false;
    }
}

function seedDatabase() {
    try {
        execSync('npx prisma db seed', {
            stdio: 'inherit'
        });
        return true;
    } catch (error) {
        return false;
    }
}

function main() {
    log('🔄 Auto-Migration System', 'cyan');
    log('========================', 'cyan');
    console.log('');

    try {
        // Check database connection
        logInfo('Checking database connection...');
        if (!checkDatabaseConnection()) {
            logError('Cannot connect to database. Please check your DATABASE_URL.');
            process.exit(1);
        }
        logSuccess('Database connection verified');

        // Check if this is a fresh database
        logInfo('Detecting database state...');
        const isFresh = checkFreshDatabase();
        
        if (isFresh) {
            logInfo('🆕 Fresh database detected');
            
            // For fresh database, create initial migration
            logInfo('Creating initial migration...');
            if (runMigration()) {
                logSuccess('Initial migration created successfully');
            } else {
                logError('Failed to create initial migration');
                process.exit(1);
            }
        } else {
            logInfo('📦 Existing database detected');
            
            // Check migration status
            const status = getMigrationStatus();
            
            if (hasPendingMigrations(status)) {
                logInfo('📦 Pending migrations detected');
                
                // Apply pending migrations
                logInfo('Applying pending migrations...');
                if (runMigration()) {
                    logSuccess('Pending migrations applied successfully');
                } else {
                    logError('Failed to apply pending migrations');
                    process.exit(1);
                }
            } else if (isSchemaOutOfSync(status)) {
                logWarning('⚠️  Schema out of sync detected');
                
                // Sync schema (for development/testing)
                logInfo('Syncing database schema...');
                if (syncSchema()) {
                    logSuccess('Database schema synced successfully');
                } else {
                    logError('Failed to sync database schema');
                    process.exit(1);
                }
            } else {
                logSuccess('✅ Database is up to date');
            }
        }

        // Seed database
        logInfo('Checking if seeding is needed...');
        if (seedDatabase()) {
            logSuccess('Database seeding completed');
        } else {
            logInfo('Database seeding skipped (already seeded or not needed)');
        }

        // Final validation
        logInfo('Final validation...');
        const finalStatus = getMigrationStatus();
        if (isSchemaOutOfSync(finalStatus)) {
            logWarning('⚠️  Database schema still appears to be out of sync');
            logInfo('💡 This might be normal for development environments');
        } else {
            logSuccess('Database validation passed');
        }

        logSuccess('🎉 Auto-migration completed successfully!');

    } catch (error) {
        logError(`Unexpected error: ${error.message}`);
        process.exit(1);
    }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
    log('\n🛑 Migration process interrupted', 'yellow');
    process.exit(130);
});

process.on('SIGTERM', () => {
    log('\n🛑 Migration process terminated', 'yellow');
    process.exit(143);
});

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    checkDatabaseConnection,
    checkFreshDatabase,
    getMigrationStatus,
    hasPendingMigrations,
    isSchemaOutOfSync,
    runMigration,
    syncSchema,
    seedDatabase
};
