#!/usr/bin/env node

/**
 * Migration Validator Script
 * 
 * This script validates migration files against best practices before deployment.
 * It checks naming conventions, SQL syntax, potential issues, and rollback compatibility.
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

// Migration naming pattern validation
const MIGRATION_NAME_PATTERN = /^\d{14}_[a-z_]+\.sql$/;
const DESCRIPTIVE_VERBS = [
    'create', 'add', 'modify', 'remove', 'migrate', 'update', 'drop', 'alter',
    'rename', 'index', 'constraint', 'foreign', 'primary', 'unique'
];

function validateMigrationNaming(migrationName) {
    const issues = [];
    
    // Check basic pattern
    if (!MIGRATION_NAME_PATTERN.test(migrationName)) {
        issues.push('Migration name does not follow pattern: YYYYMMDDHHMMSS_descriptive_name.sql');
    }
    
    // Check for descriptive verbs
    const nameWithoutTimestamp = migrationName.replace(/^\d{14}_/, '').replace('.sql', '');
    const hasDescriptiveVerb = DESCRIPTIVE_VERBS.some(verb => nameWithoutTimestamp.includes(verb));
    
    if (!hasDescriptiveVerb) {
        issues.push('Migration name should include descriptive verbs like: create, add, modify, remove, migrate');
    }
    
    // Check for generic names
    const genericNames = ['update', 'change', 'fix', 'modify'];
    const isGeneric = genericNames.some(generic => nameWithoutTimestamp === generic);
    
    if (isGeneric) {
        issues.push('Migration name is too generic. Be more specific about what is being changed.');
    }
    
    return {
        isValid: issues.length === 0,
        issues
    };
}

// SQL validation patterns
const SQL_PATTERNS = {
    DROP_TABLE: /DROP\s+TABLE\s+["`]?(\w+)["`]?/gi,
    DROP_COLUMN: /DROP\s+COLUMN\s+["`]?(\w+)["`]?/gi,
    ALTER_TABLE: /ALTER\s+TABLE\s+["`]?(\w+)["`]?/gi,
    CREATE_INDEX: /CREATE\s+(UNIQUE\s+)?INDEX\s+["`]?(\w+)["`]?/gi,
    FOREIGN_KEY: /FOREIGN\s+KEY\s*\([^)]+\)\s+REFERENCES/gi,
    CASCADE: /ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT)/gi,
    UUID_DEFAULT: /@default\(uuid\(\)\)/gi,
    TIMESTAMP_DEFAULT: /@default\(now\(\)\)/gi
};

function validateSQLContent(sqlContent, migrationName) {
    const issues = [];
    const warnings = [];
    
    // Check for dangerous operations
    const dropTableMatches = sqlContent.match(SQL_PATTERNS.DROP_TABLE);
    if (dropTableMatches) {
        warnings.push(`DROP TABLE operations detected: ${dropTableMatches.join(', ')}`);
    }
    
    const dropColumnMatches = sqlContent.match(SQL_PATTERNS.DROP_COLUMN);
    if (dropColumnMatches) {
        warnings.push(`DROP COLUMN operations detected: ${dropColumnMatches.join(', ')}`);
    }
    
    // Check for missing indexes on frequently queried columns
    const alterTableMatches = sqlContent.match(SQL_PATTERNS.ALTER_TABLE);
    if (alterTableMatches && !sqlContent.match(SQL_PATTERNS.CREATE_INDEX)) {
        warnings.push('ALTER TABLE detected but no CREATE INDEX found. Consider adding indexes for performance.');
    }
    
    // Check for missing foreign key constraints
    const addColumnMatches = sqlContent.match(/ADD\s+COLUMN\s+["`]?(\w+)["`]?\s+UUID/gi);
    if (addColumnMatches && !sqlContent.match(SQL_PATTERNS.FOREIGN_KEY)) {
        warnings.push('UUID column added but no foreign key constraint found. Consider adding proper constraints.');
    }
    
    // Check for missing cascade options
    const foreignKeyMatches = sqlContent.match(SQL_PATTERNS.FOREIGN_KEY);
    if (foreignKeyMatches && !sqlContent.match(SQL_PATTERNS.CASCADE)) {
        warnings.push('Foreign key constraint found but no cascade options specified. Consider adding ON DELETE/UPDATE.');
    }
    
    // Check for proper defaults
    if (sqlContent.includes('UUID') && !sqlContent.match(SQL_PATTERNS.UUID_DEFAULT)) {
        warnings.push('UUID column detected without @default(uuid()). Consider adding default value.');
    }
    
    if (sqlContent.includes('TIMESTAMP') && !sqlContent.match(SQL_PATTERNS.TIMESTAMP_DEFAULT)) {
        warnings.push('TIMESTAMP column detected without @default(now()). Consider adding default value.');
    }
    
    // Check for large migrations
    const lineCount = sqlContent.split('\n').length;
    if (lineCount > 100) {
        warnings.push(`Large migration detected (${lineCount} lines). Consider breaking into smaller, atomic migrations.`);
    }
    
    // Check for rollback comments
    if (!sqlContent.includes('-- Rollback') && !sqlContent.includes('-- Revert')) {
        warnings.push('No rollback instructions found in comments. Consider documenting rollback steps.');
    }
    
    return {
        isValid: issues.length === 0,
        issues,
        warnings
    };
}

function validateMigrationFile(migrationPath) {
    const migrationName = path.basename(migrationPath);
    const migrationDir = path.dirname(migrationPath);
    
    logInfo(`Validating migration: ${migrationName}`);
    
    // Check if migration.sql exists
    const sqlFilePath = path.join(migrationPath, 'migration.sql');
    if (!fs.existsSync(sqlFilePath)) {
        return {
            isValid: false,
            issues: ['migration.sql file not found'],
            warnings: []
        };
    }
    
    // Read SQL content
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Validate naming
    const namingValidation = validateMigrationNaming(migrationName);
    
    // Validate SQL content
    const sqlValidation = validateSQLContent(sqlContent, migrationName);
    
    // Combine results
    const allIssues = [...namingValidation.issues, ...sqlValidation.issues];
    const allWarnings = [...sqlValidation.warnings];
    
    return {
        isValid: namingValidation.isValid && sqlValidation.isValid,
        issues: allIssues,
        warnings: allWarnings
    };
}

function getAllMigrations() {
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
        logError('prisma/migrations directory not found');
        return [];
    }
    
    return fs.readdirSync(migrationsDir)
        .filter(item => {
            const itemPath = path.join(migrationsDir, item);
            return fs.statSync(itemPath).isDirectory() && 
                   item !== '.git' && 
                   !item.startsWith('.');
        })
        .map(migration => path.join(migrationsDir, migration));
}

function validatePrismaSchema() {
    try {
        logInfo('Validating Prisma schema...');
        execSync('npx prisma validate', { stdio: 'pipe' });
        logSuccess('Prisma schema is valid');
        return true;
    } catch (error) {
        logError('Prisma schema validation failed');
        return false;
    }
}

function checkMigrationStatus() {
    try {
        logInfo('Checking migration status...');
        const status = execSync('npx prisma migrate status', { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        
        if (status.includes('Database schema is out of sync')) {
            logWarning('Database schema is out of sync with Prisma schema');
            return false;
        }
        
        if (status.includes('Pending migrations')) {
            logInfo('Pending migrations detected');
        }
        
        logSuccess('Migration status check completed');
        return true;
    } catch (error) {
        logError('Failed to check migration status');
        return false;
    }
}

function main() {
    const args = process.argv.slice(2);
    const forceMode = args.includes('--force');
    const skipSchemaValidation = args.includes('--skip-schema');
    
    log('🔍 Migration Validator', 'cyan');
    log('====================', 'cyan');
    console.log('');
    
    let overallValid = true;
    const allIssues = [];
    const allWarnings = [];
    
    try {
        // Validate Prisma schema
        if (!skipSchemaValidation) {
            const schemaValid = validatePrismaSchema();
            if (!schemaValid && !forceMode) {
                logError('Schema validation failed. Use --force to continue.');
                process.exit(1);
            }
        }
        
        // Check migration status
        const statusValid = checkMigrationStatus();
        if (!statusValid && !forceMode) {
            logWarning('Migration status check failed. Use --force to continue.');
        }
        
        // Get all migrations
        const migrations = getAllMigrations();
        
        if (migrations.length === 0) {
            logInfo('No migrations found to validate');
            return;
        }
        
        logInfo(`Found ${migrations.length} migration(s) to validate`);
        console.log('');
        
        // Validate each migration
        for (const migrationPath of migrations) {
            const validation = validateMigrationFile(migrationPath);
            
            if (validation.isValid) {
                logSuccess(`✅ ${path.basename(migrationPath)} - Valid`);
            } else {
                logError(`❌ ${path.basename(migrationPath)} - Invalid`);
                overallValid = false;
            }
            
            if (validation.issues.length > 0) {
                validation.issues.forEach(issue => {
                    logError(`   • ${issue}`);
                    allIssues.push(`${path.basename(migrationPath)}: ${issue}`);
                });
            }
            
            if (validation.warnings.length > 0) {
                validation.warnings.forEach(warning => {
                    logWarning(`   ⚠️  ${warning}`);
                    allWarnings.push(`${path.basename(migrationPath)}: ${warning}`);
                });
            }
            
            console.log('');
        }
        
        // Summary
        log('📊 Validation Summary', 'cyan');
        log('==================', 'cyan');
        
        if (overallValid) {
            logSuccess(`All ${migrations.length} migrations are valid`);
        } else {
            logError(`${allIssues.length} issues found in migrations`);
        }
        
        if (allWarnings.length > 0) {
            logWarning(`${allWarnings.length} warnings found in migrations`);
        }
        
        // Recommendations
        if (allIssues.length > 0 || allWarnings.length > 0) {
            console.log('');
            log('💡 Recommendations:', 'cyan');
            
            if (allIssues.some(issue => issue.includes('naming'))) {
                logInfo('• Follow migration naming convention: YYYYMMDDHHMMSS_descriptive_action_name.sql');
            }
            
            if (allWarnings.some(warning => warning.includes('index'))) {
                logInfo('• Add indexes for frequently queried columns to improve performance');
            }
            
            if (allWarnings.some(warning => warning.includes('foreign key'))) {
                logInfo('• Add proper foreign key constraints with cascade options');
            }
            
            if (allWarnings.some(warning => warning.includes('rollback'))) {
                logInfo('• Document rollback steps in migration comments');
            }
            
            if (allWarnings.some(warning => warning.includes('large migration'))) {
                logInfo('• Break large migrations into smaller, atomic changes');
            }
        }
        
        // Exit with appropriate code
        if (!overallValid && !forceMode) {
            logError('Migration validation failed. Fix issues or use --force to continue.');
            process.exit(1);
        }
        
        if (overallValid) {
            logSuccess('Migration validation completed successfully');
        }
        
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
    log('\n🛑 Validation process interrupted', 'yellow');
    process.exit(130);
});

process.on('SIGTERM', () => {
    log('\n🛑 Validation process terminated', 'yellow');
    process.exit(143);
});

// Run the script
if (require.main === module) {
    main();
}

module.exports = { 
    validateMigrationNaming, 
    validateSQLContent, 
    validateMigrationFile,
    validatePrismaSchema,
    checkMigrationStatus
};
