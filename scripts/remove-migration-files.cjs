#!/usr/bin/env node

/**
 * Remove Migration Files Script
 * 
 * This script simply removes migration files from the prisma/migrations directory
 * without running any migrations. Useful for cleaning up deployment environments.
 */

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

function removeMigrationFiles() {
    try {
        const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
        
        if (!fs.existsSync(migrationsDir)) {
            logInfo('No migrations directory found - nothing to clean up');
            return true;
        }
        
        logInfo('Looking for migration files to remove...');
        
        // Get all migration directories
        const migrationDirs = fs.readdirSync(migrationsDir)
            .filter(item => {
                const itemPath = path.join(migrationsDir, item);
                return fs.statSync(itemPath).isDirectory() && 
                       item !== '.git' && 
                       !item.startsWith('.');
            });
        
        if (migrationDirs.length === 0) {
            logInfo('No migration directories found to remove');
            return true;
        }
        
        logInfo(`Found ${migrationDirs.length} migration directory(ies) to remove`);
        
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
        
        logSuccess('Migration files removed successfully');
        return true;
    } catch (error) {
        logError(`Failed to remove migration files: ${error.message}`);
        return false;
    }
}

function main() {
    const args = process.argv.slice(2);
    const forceMode = args.includes('--force');
    
    log('🗑️  Remove Migration Files Script', 'cyan');
    log('=====================================', 'cyan');
    console.log('');
    
    try {
        const success = removeMigrationFiles();
        
        if (!success && !forceMode) {
            logError('Failed to remove migration files');
            process.exit(1);
        }
        
        logSuccess('Migration file removal process completed');
        
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
    log('\n🛑 Migration file removal process interrupted', 'yellow');
    process.exit(130);
});

process.on('SIGTERM', () => {
    log('\n🛑 Migration file removal process terminated', 'yellow');
    process.exit(143);
});

// Run the script
if (require.main === module) {
    main();
}

module.exports = { removeMigrationFiles };
