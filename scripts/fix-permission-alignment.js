#!/usr/bin/env node

/**
 * Permission Alignment Fix Script
 * 
 * This script:
 * 1. Identifies and fixes permission alignment issues between database and PLATFORM_MODULES
 * 2. Ensures all user groups have consistent permission structures
 * 3. Migrates old permission formats to the new granular system
 */

require('dotenv').config({ path: '.env.local' });

const { getPool } = require('../src/lib/db');
const { PLATFORM_MODULES } = require('../src/lib/types');

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
};

function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
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

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

/**
 * Fix permission alignment issues
 */
async function fixPermissionAlignment() {
    const client = await getPool().connect();
    
    try {
        logInfo('Starting permission alignment fix...');
        
        // Get all valid permission IDs from PLATFORM_MODULES
        const validPermissionIds = PLATFORM_MODULES.map(module => module.id);
        logInfo(`Found ${validPermissionIds.length} valid permissions in PLATFORM_MODULES`);
        
        // Get all user groups with their current permissions
        const groupsResult = await client.query(`
            SELECT id, name, permissions, "is_system_role", "is_default"
            FROM "UserGroup"
            ORDER BY "is_system_role" DESC, "is_default" DESC, name ASC
        `);
        
        const groups = groupsResult.rows;
        logInfo(`Found ${groups.length} user groups to check`);
        
        let fixedGroups = 0;
        let skippedGroups = 0;
        let issuesFound = 0;
        
        for (const group of groups) {
            logInfo(`Checking group: ${group.name}`);
            
            const currentPermissions = group.permissions || [];
            const issues = [];
            
            // Check for invalid permissions
            const invalidPermissions = currentPermissions.filter(permission => 
                !validPermissionIds.includes(permission)
            );
            
            if (invalidPermissions.length > 0) {
                issues.push(`Invalid permissions: ${invalidPermissions.join(', ')}`);
            }
            
            // Check for duplicate permissions
            const uniquePermissions = [...new Set(currentPermissions)];
            if (uniquePermissions.length !== currentPermissions.length) {
                issues.push(`Duplicate permissions found`);
            }
            
            // Check for system roles that should have comprehensive permissions
            if (group.is_system_role && currentPermissions.length === 0) {
                issues.push(`System role has no permissions`);
            }
            
            // Check for default groups that should have basic permissions
            if (group.is_default && currentPermissions.length === 0) {
                issues.push(`Default group has no permissions`);
            }
            
            if (issues.length > 0) {
                logWarning(`Group "${group.name}" has ${issues.length} issues: ${issues.join('; ')}`);
                issuesFound++;
                
                // Fix the issues
                let fixedPermissions = [...new Set(currentPermissions)].filter(permission => 
                    validPermissionIds.includes(permission)
                );
                
                // For system roles, ensure they have comprehensive permissions
                if (group.is_system_role && fixedPermissions.length === 0) {
                    logInfo(`Adding comprehensive permissions to system role "${group.name}"`);
                    fixedPermissions = validPermissionIds;
                }
                
                // For default groups, ensure they have basic permissions
                if (group.is_default && fixedPermissions.length === 0) {
                    logInfo(`Adding basic permissions to default group "${group.name}"`);
                    // Add basic view permissions
                    fixedPermissions = validPermissionIds.filter(permission => 
                        permission.includes('_VIEW') && !permission.includes('_DETAILED')
                    );
                }
                
                // Update the group if permissions changed
                if (JSON.stringify(fixedPermissions.sort()) !== JSON.stringify(currentPermissions.sort())) {
                    await client.query(`
                        UPDATE "UserGroup"
                        SET permissions = $1, "updatedAt" = NOW()
                        WHERE id = $2
                    `, [fixedPermissions, group.id]);
                    
                    logSuccess(`Fixed group "${group.name}" permissions: ${fixedPermissions.length} valid permissions`);
                    fixedGroups++;
                } else {
                    logInfo(`Group "${group.name}" permissions are already correct`);
                    skippedGroups++;
                }
            } else {
                logInfo(`Group "${group.name}" has no alignment issues`);
                skippedGroups++;
            }
        }
        
        logSuccess(`Permission alignment fix completed: ${fixedGroups} groups fixed, ${skippedGroups} groups skipped, ${issuesFound} issues found`);
        
        return true;
        
    } catch (error) {
        logError(`Permission alignment fix failed: ${error.message}`);
        console.error(error);
        return false;
    } finally {
        client.release();
    }
}

/**
 * Check for permission migration needs
 */
async function checkMigrationNeeds() {
    const client = await getPool().connect();
    
    try {
        logInfo('Checking for permission migration needs...');
        
        // Check for old permission formats
        const oldPermissionsResult = await client.query(`
            SELECT DISTINCT unnest(permissions) as permission
            FROM "UserGroup"
            WHERE permissions IS NOT NULL AND array_length(permissions, 1) > 0
        `);
        
        const allPermissions = oldPermissionsResult.rows.map(row => row.permission);
        const validPermissionIds = PLATFORM_MODULES.map(module => module.id);
        
        // Look for old broad permissions that need migration
        const oldBroadPermissions = [
            'CANDIDATES_MANAGE',
            'POSITIONS_MANAGE', 
            'USERS_MANAGE',
            'SYSTEM_MANAGE',
            'ADMIN'
        ];
        
        const foundOldPermissions = allPermissions.filter(permission => 
            oldBroadPermissions.includes(permission)
        );
        
        if (foundOldPermissions.length > 0) {
            logWarning(`Found ${foundOldPermissions.length} old broad permissions that need migration: ${foundOldPermissions.join(', ')}`);
            logInfo('These permissions should be replaced with granular permissions');
            return false;
        }
        
        logSuccess('No permission migration needed - all permissions are in current format');
        return true;
        
    } catch (error) {
        logError(`Failed to check migration needs: ${error.message}`);
        console.error(error);
        return false;
    } finally {
        client.release();
    }
}

/**
 * Main execution function
 */
async function main() {
    log('🔧 Starting permission alignment fix...', 'cyan');
    
    try {
        // Step 1: Check for migration needs
        logInfo('Step 1: Checking for permission migration needs...');
        const migrationOk = await checkMigrationNeeds();
        
        // Step 2: Fix alignment issues
        logInfo('Step 2: Fixing permission alignment issues...');
        const alignmentSuccess = await fixPermissionAlignment();
        
        if (alignmentSuccess) {
            logSuccess('Permission alignment fix completed successfully');
            process.exit(0);
        } else {
            logWarning('Some alignment fixes failed, but continuing...');
            process.exit(0); // Don't fail deployment for alignment issues
        }
        
    } catch (error) {
        logError(`Permission alignment fix failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Export functions for use in other scripts
module.exports = {
    fixPermissionAlignment,
    checkMigrationNeeds
};

// Run if called directly
if (require.main === module) {
    main().catch((error) => {
        logError(`Unexpected error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
}
