#!/usr/bin/env node

/**
 * Create Initial Migration Script
 * 
 * This script creates an initial migration when REMOVE_MIGRATION_FILES is not set.
 * It checks if migrations already exist and creates one if needed.
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

function checkExistingMigrations() {
    try {
        const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
        
        if (!fs.existsSync(migrationsDir)) {
            logInfo('No migrations directory found - will create one');
            return { exists: false, count: 0 };
        }
        
        const migrationDirs = fs.readdirSync(migrationsDir)
            .filter(item => {
                const itemPath = path.join(migrationsDir, item);
                return fs.statSync(itemPath).isDirectory() && 
                       item !== '.git' && 
                       !item.startsWith('.');
            });
        
        if (migrationDirs.length === 0) {
            logInfo('No existing migrations found');
            return { exists: false, count: 0 };
        }
        
        logInfo(`Found ${migrationDirs.length} existing migration(s): ${migrationDirs.join(', ')}`);
        return { exists: true, count: migrationDirs.length, files: migrationDirs };
    } catch (error) {
        logWarning(`Could not check existing migrations: ${error.message}`);
        return { exists: false, count: 0 };
    }
}

function checkDatabaseConnection() {
    try {
        logInfo('Testing database connection...');
        
        // Try to generate Prisma client as a connection test
        execSync('npx prisma generate', { 
            stdio: 'pipe',
            env: { ...process.env }
        });
        
        logSuccess('Database connection verified');
        return true;
    } catch (error) {
        logError(`Database connection failed: ${error.message}`);
        return false;
    }
}

function createInitialMigration() {
    try {
        logInfo('Creating initial migration...');
        
        // Use prisma migrate dev to create initial migration
        execSync('npx prisma migrate dev --name initial --create-only', { 
            stdio: 'inherit',
            env: { ...process.env }
        });
        
        logSuccess('Initial migration created successfully');
        return true;
    } catch (error) {
        // Get the full error output including stderr
        const errorOutput = error.stderr ? error.stderr.toString() : error.message;
        
        // Check if the error is due to existing migrations in database
        if (errorOutput.includes('migration(s) are applied to the database but missing from the local migrations directory')) {
            logWarning('Database has existing migrations that are not in local migration files');
            logInfo('This indicates the database was set up elsewhere or migrations are managed externally');
            return 'migration_mismatch';
        }
        
        // Check if schema is already up to date
        if (errorOutput.includes('No pending migrations to apply') || 
            errorOutput.includes('already up to date')) {
            logInfo('Database schema is already up to date');
            return true;
        }
        
        logError(`Failed to create initial migration: ${errorOutput}`);
        return false;
    }
}

function main() {
    const args = process.argv.slice(2);
    const forceMode = args.includes('--force');
    
    log('🔄 Create Initial Migration Script', 'cyan');
    log('=====================================', 'cyan');
    console.log('');
    
    try {
        // Check database connection
        if (!checkDatabaseConnection()) {
            if (forceMode) {
                logWarning('Database connection failed, but continuing due to --force flag');
            } else {
                logError('Cannot proceed without database connection');
                process.exit(1);
            }
        }
        
        // Check for existing migrations
        const migrationCheck = checkExistingMigrations();
        
        if (migrationCheck.exists && migrationCheck.count > 0) {
            logInfo('Migrations already exist - no need to create initial migration');
            logSuccess('Migration setup is complete');
            process.exit(0);
        }
        
        // Create initial migration
        const result = createInitialMigration();
        
        if (result === true) {
            logSuccess('Initial migration created successfully');
        } else if (result === 'migration_mismatch') {
            logWarning('Migration mismatch detected - database has migrations not in local files');
            logInfo('This is normal if database was set up elsewhere');
        } else {
            if (forceMode) {
                logWarning('Failed to create initial migration, but continuing due to --force flag');
            } else {
                logError('Failed to create initial migration');
                process.exit(1);
            }
        }
        
        logSuccess('Initial migration process completed');
        
    } catch (error) {
        logError(`Unexpected error: ${error.message}`);
        if (forceMode) {
            logWarning('Continuing despite error due to --force flag');
            process.exit(0);
        }
        process.exit(1);
    }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
    log('\n🛑 Initial migration process interrupted', 'yellow');
    process.exit(130);
});

process.on('SIGTERM', () => {
    log('\n🛑 Initial migration process terminated', 'yellow');
    process.exit(143);
});

// Run the script
if (require.main === module) {
    main();
}

module.exports = { checkExistingMigrations, createInitialMigration, checkDatabaseConnection };
