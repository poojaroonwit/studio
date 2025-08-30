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

// Use tsx to run TypeScript files directly
const { spawn } = require('child_process');
const path = require('path');

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
 * Run TypeScript file with tsx
 */
function runTypeScriptFile(filePath, args = []) {
    return new Promise((resolve, reject) => {
        const tsxPath = path.join(__dirname, '../node_modules/.bin/tsx');
        const scriptPath = path.join(__dirname, filePath);
        
        const child = spawn(tsxPath, [scriptPath, ...args], {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Process exited with code ${code}`));
            }
        });
        
        child.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Main execution function
 */
async function main() {
    log('🔧 Starting permission alignment fix...', 'cyan');
    
    try {
        // Run the TypeScript version of this script
        await runTypeScriptFile('../src/scripts/fix-permission-alignment.ts');
        logSuccess('Permission alignment fix completed successfully');
        process.exit(0);
    } catch (error) {
        logError(`Permission alignment fix failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch((error) => {
        logError(`Unexpected error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
}
