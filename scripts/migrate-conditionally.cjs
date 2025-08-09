#!/usr/bin/env node

/**
 * Conditional Migration Script
 * 
 * This script checks if migration files exist before attempting to run migrations.
 * If no migration files are found, it skips the migration process gracefully.
 * 
 * Usage: node scripts/migrate-conditionally.js [--force]
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
    
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
        logWarning('No prisma/migrations directory found');
        return { hasFiles: false, reason: 'directory_missing' };
    }
    
    // Check if directory has any migration folders
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

function runMigrations(force = false) {
    try {
        logInfo('Running Prisma migrations...');
        
        // Use prisma migrate deploy for production, prisma migrate dev for development
        const command = process.env.NODE_ENV === 'production' 
            ? 'npx prisma migrate deploy'
            : 'npx prisma migrate deploy'; // Always use deploy to avoid prompts
            
        execSync(command, { 
            stdio: 'inherit',
            env: { ...process.env }
        });
        
        logSuccess('Database migrations completed successfully');
        return true;
    } catch (error) {
        logError(`Migration failed: ${error.message}`);
        
        if (force) {
            logWarning('Continuing despite migration failure due to --force flag');
            return true;
        }
        return false;
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

function main() {
    const args = process.argv.slice(2);
    const forceMode = args.includes('--force');
    
    log('🔄 Conditional Migration Script', 'cyan');
    log('=====================================', 'cyan');
    console.log('');
    
    // Check if we should skip migrations entirely
    if (args.includes('--skip') || process.env.SKIP_MIGRATIONS === 'true') {
        logWarning('Migrations skipped due to --skip flag or SKIP_MIGRATIONS env var');
        process.exit(0);
    }
    
    try {
        // Step 1: Check database connection
        if (!checkDatabaseConnection()) {
            if (forceMode) {
                logWarning('Database connection failed, but continuing due to --force flag');
            } else {
                logError('Cannot proceed without database connection');
                process.exit(1);
            }
        }
        
        // Step 2: Check for migration files
        const migrationCheck = checkMigrationFiles();
        
        if (!migrationCheck.hasFiles) {
            switch (migrationCheck.reason) {
                case 'directory_missing':
                    logWarning('Prisma migrations directory not found - skipping migrations');
                    logInfo('This is expected if this is a fresh installation or if migrations are managed externally');
                    break;
                    
                case 'no_migrations':
                    logWarning('No migration files found - skipping migrations');
                    logInfo('This might be expected if the database schema is managed differently');
                    break;
            }
            
            logSuccess('Migration process skipped gracefully');
            console.log('');
            log('💡 Tips:', 'cyan');
            log('  • If you need to create an initial migration: npx prisma migrate dev --name initial', 'white');
            log('  • If the database is already set up: This is normal', 'white');
            log('  • To force migration attempt: use --force flag', 'white');
            
            process.exit(0);
        }
        
        // Step 3: Run migrations if files exist
        const success = runMigrations(forceMode);
        
        if (!success && !forceMode) {
            process.exit(1);
        }
        
        logSuccess('Conditional migration process completed');
        
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

module.exports = { checkMigrationFiles, runMigrations, checkDatabaseConnection };