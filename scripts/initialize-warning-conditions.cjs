#!/usr/bin/env node

/**
 * Warning Conditions Initialization Script
 * 
 * This script:
 * 1. Initializes warning conditions for all users
 * 2. Sets up default warning configurations
 * 3. Ensures all users have proper warning system access
 */

require('dotenv').config({ path: '.env.local' });

const { getPool } = require('../src/lib/db');

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
 * Initialize warning conditions for all users
 */
async function initializeWarningConditions() {
    const client = await getPool().connect();
    
    try {
        logInfo('Starting warning conditions initialization...');
        
        // Check if warning conditions are already initialized
        const existingConditionsResult = await client.query(`
            SELECT COUNT(*) as count
            FROM "WarningConfiguration"
            WHERE "isInitialized" = true
        `);
        
        const existingCount = existingConditionsResult.rows[0].count;
        if (existingCount > 0) {
            logInfo(`Warning conditions already initialized for ${existingCount} configurations`);
            return true;
        }
        
        // Get all users
        const usersResult = await client.query(`
            SELECT id, email, role
            FROM "User"
            WHERE "isActive" = true
        `);
        
        const users = usersResult.rows;
        logInfo(`Found ${users.length} active users to initialize warning conditions for`);
        
        // Get default warning configurations
        const defaultConfigsResult = await client.query(`
            SELECT id, name, description, "warningLevel", "isActive"
            FROM "WarningConfiguration"
            WHERE "isDefault" = true
        `);
        
        const defaultConfigs = defaultConfigsResult.rows;
        logInfo(`Found ${defaultConfigs.length} default warning configurations`);
        
        let initializedUsers = 0;
        let skippedUsers = 0;
        
        for (const user of users) {
            logInfo(`Initializing warning conditions for user: ${user.email}`);
            
            // Check if user already has warning conditions
            const existingUserConditionsResult = await client.query(`
                SELECT COUNT(*) as count
                FROM "WarningConfiguration"
                WHERE "userId" = $1
            `, [user.id]);
            
            const existingUserConditions = existingUserConditionsResult.rows[0].count;
            
            if (existingUserConditions > 0) {
                logInfo(`User ${user.email} already has ${existingUserConditions} warning conditions, skipping`);
                skippedUsers++;
                continue;
            }
            
            // Create warning conditions for this user based on default configurations
            for (const config of defaultConfigs) {
                try {
                    await client.query(`
                        INSERT INTO "WarningConfiguration" (
                            id, name, description, "warningLevel", "isActive", 
                            "userId", "isDefault", "isInitialized", "createdAt", "updatedAt"
                        ) VALUES (
                            gen_random_uuid(), $1, $2, $3, $4, $5, false, true, NOW(), NOW()
                        )
                    `, [
                        config.name,
                        config.description,
                        config.warningLevel,
                        config.isActive,
                        user.id
                    ]);
                } catch (error) {
                    if (error.message.includes('duplicate key')) {
                        logInfo(`Warning configuration already exists for user ${user.email}, skipping`);
                    } else {
                        logWarning(`Failed to create warning configuration for user ${user.email}: ${error.message}`);
                    }
                }
            }
            
            logSuccess(`Initialized warning conditions for user: ${user.email}`);
            initializedUsers++;
        }
        
        logSuccess(`Warning conditions initialization completed: ${initializedUsers} users initialized, ${skippedUsers} users skipped`);
        
        return true;
        
    } catch (error) {
        logError(`Warning conditions initialization failed: ${error.message}`);
        console.error(error);
        return false;
    } finally {
        client.release();
    }
}

/**
 * Verify warning system integrity
 */
async function verifyWarningSystem() {
    const client = await getPool().connect();
    
    try {
        logInfo('Verifying warning system integrity...');
        
        // Check for users without warning conditions
        const usersWithoutConditionsResult = await client.query(`
            SELECT u.id, u.email
            FROM "User" u
            LEFT JOIN "WarningConfiguration" wc ON u.id = wc."userId"
            WHERE u."isActive" = true
            AND wc.id IS NULL
        `);
        
        const usersWithoutConditions = usersWithoutConditionsResult.rows;
        if (usersWithoutConditions.length > 0) {
            logWarning(`Found ${usersWithoutConditions.length} users without warning conditions:`);
            for (const user of usersWithoutConditions) {
                logWarning(`  - ${user.email} (ID: ${user.id})`);
            }
        } else {
            logSuccess('All active users have warning conditions');
        }
        
        // Check for inactive warning configurations
        const inactiveConfigsResult = await client.query(`
            SELECT COUNT(*) as count
            FROM "WarningConfiguration"
            WHERE "isActive" = false
        `);
        
        const inactiveCount = inactiveConfigsResult.rows[0].count;
        logInfo(`Found ${inactiveCount} inactive warning configurations`);
        
        // Check for warning configurations without conditions
        const configsWithoutConditionsResult = await client.query(`
            SELECT wc.id, wc.name, wc."userId"
            FROM "WarningConfiguration" wc
            LEFT JOIN "WarningCondition" wcond ON wc.id = wcond."warningConfigurationId"
            WHERE wcond.id IS NULL
        `);
        
        const configsWithoutConditions = configsWithoutConditionsResult.rows;
        if (configsWithoutConditions.length > 0) {
            logWarning(`Found ${configsWithoutConditions.length} warning configurations without conditions`);
        } else {
            logSuccess('All warning configurations have conditions defined');
        }
        
        logSuccess('Warning system integrity verification completed');
        return true;
        
    } catch (error) {
        logError(`Warning system verification failed: ${error.message}`);
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
    log('🚨 Starting warning conditions initialization...', 'cyan');
    
    try {
        // Step 1: Initialize warning conditions
        logInfo('Step 1: Initializing warning conditions for all users...');
        const initSuccess = await initializeWarningConditions();
        
        // Step 2: Verify warning system
        logInfo('Step 2: Verifying warning system integrity...');
        const verifySuccess = await verifyWarningSystem();
        
        if (initSuccess && verifySuccess) {
            logSuccess('Warning conditions initialization completed successfully');
            process.exit(0);
        } else {
            logWarning('Some warning initialization steps failed, but continuing...');
            process.exit(0); // Don't fail deployment for warning issues
        }
        
    } catch (error) {
        logError(`Warning conditions initialization failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Export functions for use in other scripts
module.exports = {
    initializeWarningConditions,
    verifyWarningSystem
};

// Run if called directly
if (require.main === module) {
    main().catch((error) => {
        logError(`Unexpected error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
}
