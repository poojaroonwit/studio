#!/usr/bin/env tsx

/**
 * Permission Reset and Verification Script
 * 
 * This script:
 * 1. Resets all user group permissions to the granular format defined in PLATFORM_MODULES
 * 2. Verifies permission integrity across the system
 * 3. Ensures all permissions in the database are valid according to the current schema
 */

import 'dotenv/config';
import { getPool } from '@/lib/db';
import { PLATFORM_MODULES } from '@/lib/types';

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

function log(message: string, color: keyof typeof colors = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message: string) {
    log(`✅ ${message}`, 'green');
}

function logWarning(message: string) {
    log(`⚠️  ${message}`, 'yellow');
}

function logError(message: string) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message: string) {
    log(`ℹ️  ${message}`, 'blue');
}

/**
 * Reset permissions to granular format
 */
async function resetPermissions() {
    let client: any = null;
    
    try {
        client = await getPool().connect();
        logInfo('Starting permission reset process...');
        
        // Get all valid permission IDs from PLATFORM_MODULES
        const validPermissionIds = PLATFORM_MODULES.map(module => module.id);
        logInfo(`Found ${validPermissionIds.length} valid permissions in PLATFORM_MODULES`);
        
        // Get all user groups
        const groupsResult = await client.query(`
            SELECT id, name, permissions, "is_system_role"
            FROM "UserGroup"
            ORDER BY "is_system_role" DESC, name ASC
        `);
        
        const groups = groupsResult.rows;
        logInfo(`Found ${groups.length} user groups to process`);
        
        let updatedGroups = 0;
        let skippedGroups = 0;
        
        for (const group of groups) {
            logInfo(`Processing group: ${group.name}`);
            
            // Filter out invalid permissions
            const currentPermissions = group.permissions || [];
            const validPermissions = currentPermissions.filter((permission: string) => 
                validPermissionIds.includes(permission)
            );
            
            const invalidPermissions = currentPermissions.filter((permission: string) => 
                !validPermissionIds.includes(permission)
            );
            
            if (invalidPermissions.length > 0) {
                logWarning(`Group "${group.name}" has ${invalidPermissions.length} invalid permissions: ${invalidPermissions.join(', ')}`);
            }
            
            // Update group with only valid permissions
            if (JSON.stringify(validPermissions.sort()) !== JSON.stringify(currentPermissions.sort())) {
                await client.query(`
                    UPDATE "UserGroup"
                    SET permissions = $1, "updatedAt" = NOW()
                    WHERE id = $2
                `, [validPermissions, group.id]);
                
                logSuccess(`Updated group "${group.name}" permissions: ${validPermissions.length} valid permissions`);
                updatedGroups++;
            } else {
                logInfo(`Group "${group.name}" permissions are already valid`);
                skippedGroups++;
            }
        }
        
        logSuccess(`Permission reset completed: ${updatedGroups} groups updated, ${skippedGroups} groups skipped`);
        
        return true;
        
    } catch (error: any) {
        logError(`Permission reset failed: ${error.message}`);
        console.error(error);
        return false;
    } finally {
        // ✅ CRITICAL FIX: Always release the database client
        if (client) {
            try {
                client.release();
            } catch (releaseError) {
                console.error('Error releasing database client:', releaseError);
            }
        }
    }
}

/**
 * Verify permission integrity across the system
 */
async function verifyPermissions() {
    let client: any = null;
    
    try {
        client = await getPool().connect();
        logInfo('Starting permission verification...');
        
        // Get all valid permission IDs from PLATFORM_MODULES
        const validPermissionIds = PLATFORM_MODULES.map(module => module.id);
        
        // Get all permissions currently in use in the database
        const dbPermissionsResult = await client.query(`
            SELECT DISTINCT unnest(permissions) as permission
            FROM "UserGroup"
            WHERE permissions IS NOT NULL AND array_length(permissions, 1) > 0
        `);
        
        const dbPermissions = dbPermissionsResult.rows.map((row: any) => row.permission);
        logInfo(`Found ${dbPermissions.length} unique permissions in database`);
        
        // Check for invalid permissions in database
        const invalidPermissions = dbPermissions.filter((permission: string) => 
            !validPermissionIds.includes(permission)
        );
        
        if (invalidPermissions.length > 0) {
            logWarning(`Found ${invalidPermissions.length} invalid permissions in database: ${invalidPermissions.join(', ')}`);
        } else {
            logSuccess('All permissions in database are valid');
        }
        
        // Check for unused permissions in PLATFORM_MODULES
        const unusedPermissions = validPermissionIds.filter((permission: string) => 
            !dbPermissions.includes(permission)
        );
        
        if (unusedPermissions.length > 0) {
            logInfo(`Found ${unusedPermissions.length} unused permissions: ${unusedPermissions.join(', ')}`);
        } else {
            logSuccess('All PLATFORM_MODULES permissions are in use');
        }
        
        return {
            totalPermissions: validPermissionIds.length,
            dbPermissions: dbPermissions.length,
            invalidPermissions: invalidPermissions.length,
            unusedPermissions: unusedPermissions.length
        };
        
    } catch (error: any) {
        logError(`Permission verification failed: ${error.message}`);
        console.error(error);
        return null;
    } finally {
        // ✅ CRITICAL FIX: Always release the database client
        if (client) {
            try {
                client.release();
            } catch (releaseError) {
                console.error('Error releasing database client:', releaseError);
            }
        }
    }
}

/**
 * Main execution function
 */
async function main() {
    const command = process.argv[2];
    
    if (command === 'reset') {
        log('🔄 Resetting permissions to granular format...', 'cyan');
        const success = await resetPermissions();
        process.exit(success ? 0 : 1);
    } else if (command === 'verify') {
        log('🔍 Verifying permission integrity...', 'cyan');
        const isValid = await verifyPermissions();
        process.exit(isValid ? 0 : 1);
    } else {
        log('Usage:', 'cyan');
        log('  tsx src/scripts/reset-permissions.ts reset   - Reset permissions to granular format', 'white');
        log('  tsx src/scripts/reset-permissions.ts verify  - Verify permission integrity', 'white');
        process.exit(1);
    }
}

// Export functions for use in other scripts
export {
    resetPermissions,
    verifyPermissions
};

// Run if called directly
if (require.main === module) {
    main().catch((error: any) => {
        logError(`Unexpected error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
}
