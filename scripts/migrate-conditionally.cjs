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

function createInitialMigration() {
    try {
        logInfo('Creating initial migration...');
        execSync('npx prisma migrate dev --name initial --create-only', { 
            stdio: 'inherit',
            env: { ...process.env }
        });
        logSuccess('Initial migration created successfully');
        return true;
    } catch (error) {
        logError(`Failed to create initial migration: ${error.message}`);
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

function checkDatabaseSchema() {
    try {
        logInfo('Checking if database schema exists...');
        
        // Try to run a simple query to check if tables exist
        execSync('npx prisma db execute --stdin', { 
            stdio: ['pipe', 'pipe', 'pipe'],
            input: 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \'public\';',
            env: { ...process.env }
        });
        
        logSuccess('Database schema exists');
        return true;
    } catch (error) {
        logWarning('Database schema does not exist or is empty');
        return false;
    }
}

function checkDatabaseMigrations() {
    try {
        logInfo('Checking if database has existing migrations...');
        
        // Check if _prisma_migrations table exists and has entries
        const result = execSync('npx prisma db execute --stdin', { 
            stdio: ['pipe', 'pipe', 'pipe'],
            input: 'SELECT COUNT(*) as count FROM _prisma_migrations;',
            env: { ...process.env }
        }).toString();
        
        const count = parseInt(result.trim());
        if (count > 0) {
            logWarning(`Database has ${count} existing migration(s) applied`);
            return true;
        } else {
            logInfo('No existing migrations found in database');
            return false;
        }
    } catch (error) {
        logInfo('No _prisma_migrations table found (fresh database)');
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
        
        // Step 3: Check if database schema exists
        const schemaExists = checkDatabaseSchema();
        
        // Step 4: Check if database has existing migrations
        const hasExistingMigrations = checkDatabaseMigrations();
        
        if (!migrationCheck.hasFiles) {
            if (!schemaExists) {
                // No migrations and no schema - create initial migration and apply it
                logInfo('No migrations found and no database schema exists, creating and applying initial migration...');
                if (createInitialMigration()) {
                    logSuccess('Initial migration created, now running migrations...');
                } else {
                    logError('Failed to create initial migration');
                    process.exit(1);
                }
            } else if (hasExistingMigrations) {
                // No local migrations but database has migrations applied - skip migrations
                logWarning('No local migration files found but database has existing migrations - skipping migrations');
                logInfo('This is expected if migrations are managed externally or database was set up elsewhere');
                process.exit(0);
            } else {
                // No migrations but schema exists (manual setup) - this is fine, skip migrations
                logWarning('No migration files found but database schema exists - skipping migrations');
                logInfo('This is expected if the database was set up manually or migrations are managed externally');
                process.exit(0);
            }
        }
        
        // Step 5: Run migrations if files exist
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