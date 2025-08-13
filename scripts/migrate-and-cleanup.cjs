#!/usr/bin/env node

/**
 * Migration and Cleanup Script
 * 
 * This script runs Prisma migrations and then removes the migration files
 * after successful completion to keep the deployment clean.
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

function checkMigrationFiles() {
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
        logWarning('No prisma/migrations directory found');
        return { hasFiles: false, reason: 'directory_missing' };
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(item => {
            const itemPath = path.join(migrationsDir, item);
            return fs.statSync(itemPath).isDirectory() && 
                   item !== '.git' && 
                   !item.startsWith('.');
        });
    
    if (migrationFiles.length === 0) {
        logWarning('No migration files found in prisma/migrations directory');
        return { hasFiles: false, reason: 'no_migrations' };
    }
    
    logInfo(`Found ${migrationFiles.length} migration(s): ${migrationFiles.join(', ')}`);
    return { hasFiles: true, count: migrationFiles.length, files: migrationFiles };
}

function runMigrations() {
    try {
        logInfo('Running Prisma migrations...');
        
        // Use prisma migrate deploy for production
        execSync('npx prisma migrate deploy', { 
            stdio: 'inherit',
            env: { ...process.env }
        });
        
        logSuccess('Database migrations completed successfully');
        return true;
    } catch (error) {
        logError(`Migration failed: ${error.message}`);
        return false;
    }
}

function cleanupMigrationFiles() {
    try {
        const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
        
        if (!fs.existsSync(migrationsDir)) {
            logInfo('No migrations directory to clean up');
            return true;
        }
        
        logInfo('Cleaning up migration files...');
        
        // Get all migration directories
        const migrationDirs = fs.readdirSync(migrationsDir)
            .filter(item => {
                const itemPath = path.join(migrationsDir, item);
                return fs.statSync(itemPath).isDirectory() && 
                       item !== '.git' && 
                       !item.startsWith('.');
            });
        
        if (migrationDirs.length === 0) {
            logInfo('No migration directories to remove');
            return true;
        }
        
        // Remove each migration directory
        for (const dir of migrationDirs) {
            const dirPath = path.join(migrationsDir, dir);
            logInfo(`Removing migration directory: ${dir}`);
            
            // Remove directory recursively
            fs.rmSync(dirPath, { recursive: true, force: true });
        }
        
        // Check if migrations directory is now empty (except for .git and hidden files)
        const remainingItems = fs.readdirSync(migrationsDir)
            .filter(item => !item.startsWith('.') && item !== '.git');
        
        if (remainingItems.length === 0) {
            logInfo('Migrations directory is now empty');
        } else {
            logWarning(`Migrations directory still contains: ${remainingItems.join(', ')}`);
        }
        
        logSuccess('Migration files cleaned up successfully');
        return true;
    } catch (error) {
        logError(`Failed to clean up migration files: ${error.message}`);
        return false;
    }
}

function main() {
    const args = process.argv.slice(2);
    const forceMode = args.includes('--force');
    const skipCleanup = args.includes('--skip-cleanup') || 
                       process.env.SKIP_MIGRATION_CLEANUP === 'true' || 
                       process.env.REMOVE_MIGRATION_FILES === 'false';
    
    log('🔄 Migration and Cleanup Script', 'cyan');
    log('=====================================', 'cyan');
    console.log('');
    
    try {
        // Check for migration files
        const migrationCheck = checkMigrationFiles();
        
        if (!migrationCheck.hasFiles) {
            logWarning('No migration files found - nothing to migrate');
            process.exit(0);
        }
        
        // Run migrations
        const migrationSuccess = runMigrations();
        
        if (!migrationSuccess) {
            if (forceMode) {
                logWarning('Migration failed, but continuing due to --force flag');
            } else {
                logError('Migration failed');
                process.exit(1);
            }
        }
        
        // Clean up migration files if migration was successful
        if (migrationSuccess && !skipCleanup) {
            const cleanupSuccess = cleanupMigrationFiles();
            if (!cleanupSuccess && !forceMode) {
                logWarning('Migration cleanup failed, but migration was successful');
            }
        } else if (skipCleanup) {
            if (process.env.REMOVE_MIGRATION_FILES === 'false') {
                logInfo('Skipping migration cleanup (REMOVE_MIGRATION_FILES=false)');
            } else if (process.env.SKIP_MIGRATION_CLEANUP === 'true') {
                logInfo('Skipping migration cleanup (SKIP_MIGRATION_CLEANUP=true)');
            } else {
                logInfo('Skipping migration cleanup (--skip-cleanup flag)');
            }
        }
        
        logSuccess('Migration and cleanup process completed');
        
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

module.exports = { checkMigrationFiles, runMigrations, cleanupMigrationFiles };
