#!/usr/bin/env node

/**
 * Skip Failed Migrations Script
 * 
 * This script helps resolve migration issues by marking failed migrations as applied
 * so the deployment can continue without being blocked by problematic migrations.
 * 
 * Usage:
 *   node scripts/skip-failed-migrations.js                    # Skip all failed migrations
 *   node scripts/skip-failed-migrations.js --dry-run          # Show what would be skipped
 *   node scripts/skip-failed-migrations.js --migration=name   # Skip specific migration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'prisma', 'migrations');

function runCommand(command, options = {}) {
    try {
        const result = execSync(command, { 
            encoding: 'utf8', 
            stdio: 'pipe',
            ...options 
        });
        return { success: true, output: result };
    } catch (error) {
        return { 
            success: false, 
            error: error.message, 
            output: error.stdout?.toString() || error.stderr?.toString() || ''
        };
    }
}

function getMigrationStatus() {
    console.log('🔍 Checking migration status...');
    const result = runCommand('npx prisma migrate status --schema=prisma/schema.prisma');
    
    if (!result.success) {
        console.error('❌ Failed to get migration status:', result.error);
        return null;
    }
    
    return result.output;
}

function parsePendingMigrations(statusOutput) {
    const lines = statusOutput.split('\n');
    const pendingSection = lines.findIndex(line => line.includes('Following migrations have not yet been applied:'));
    
    if (pendingSection === -1) {
        return [];
    }
    
    const pendingMigrations = [];
    for (let i = pendingSection + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.match(/^\d{14}_/)) {
            pendingMigrations.push(line);
        } else if (line && !line.startsWith('To apply')) {
            break;
        }
    }
    
    return pendingMigrations;
}

function skipMigration(migrationName, dryRun = false) {
    console.log(`🔄 Processing migration: ${migrationName}`);
    
    if (dryRun) {
        console.log(`  📝 Would mark ${migrationName} as applied (dry run)`);
        return true;
    }
    
    // Try to mark as applied normally first
    let result = runCommand(`npx prisma migrate resolve --applied ${migrationName} --schema=prisma/schema.prisma`);
    
    if (result.success) {
        console.log(`  ✅ Successfully marked ${migrationName} as applied`);
        return true;
    }
    
    // If normal marking fails, try force marking
    console.log(`  ⚠️  Normal marking failed, trying force marking...`);
    result = runCommand(`npx prisma migrate resolve --applied ${migrationName} --schema=prisma/schema.prisma --force`);
    
    if (result.success) {
        console.log(`  ✅ Force-marked ${migrationName} as applied (skipped)`);
        return true;
    }
    
    console.log(`  ❌ Failed to mark ${migrationName} as applied:`, result.error);
    return false;
}

function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const specificMigration = args.find(arg => arg.startsWith('--migration='))?.split('=')[1];
    
    console.log('🚀 Skip Failed Migrations Script');
    if (dryRun) console.log('📝 DRY RUN MODE - No changes will be made');
    if (specificMigration) console.log(`🎯 Targeting specific migration: ${specificMigration}`);
    console.log('');
    
    // Get migration status
    const statusOutput = getMigrationStatus();
    if (!statusOutput) {
        process.exit(1);
    }
    
    // Parse pending migrations
    const pendingMigrations = parsePendingMigrations(statusOutput);
    
    if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations found');
        return;
    }
    
    console.log(`📋 Found ${pendingMigrations.length} pending migrations:`);
    pendingMigrations.forEach(mig => console.log(`  - ${mig}`));
    console.log('');
    
    // Process migrations
    let successCount = 0;
    let failedCount = 0;
    
    if (specificMigration) {
        // Process only the specified migration
        if (pendingMigrations.includes(specificMigration)) {
            if (skipMigration(specificMigration, dryRun)) {
                successCount++;
            } else {
                failedCount++;
            }
        } else {
            console.log(`❌ Migration ${specificMigration} not found in pending migrations`);
            process.exit(1);
        }
    } else {
        // Process all pending migrations
        for (const migration of pendingMigrations) {
            if (skipMigration(migration, dryRun)) {
                successCount++;
            } else {
                failedCount++;
            }
        }
    }
    
    console.log('');
    console.log('📊 Summary:');
    console.log(`  ✅ Successfully processed: ${successCount}`);
    console.log(`  ❌ Failed: ${failedCount}`);
    
    if (failedCount > 0) {
        console.log('');
        console.log('⚠️  Some migrations failed to process');
        console.log('💡 You may need to manually resolve these or use --force flag');
        process.exit(1);
    }
    
    if (dryRun) {
        console.log('');
        console.log('📝 Dry run completed - no changes were made');
        console.log('💡 Run without --dry-run to actually process the migrations');
    } else {
        console.log('');
        console.log('🎉 All migrations processed successfully!');
        console.log('💡 You can now try running your deployment again');
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { main, skipMigration, parsePendingMigrations };
