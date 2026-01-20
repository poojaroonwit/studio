#!/usr/bin/env node

/**
 * Warning Conditions Initialization Script Wrapper
 * 
 * This script uses tsx to run the TypeScript version of the warning conditions initialization
 */

// Use tsx to run TypeScript files directly
const { spawn } = require('child_process');
const path = require('path');

// Function to run TypeScript files using tsx
async function runTypeScriptFile(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const tsxPath = path.join(__dirname, '..', 'node_modules', '.bin', 'tsx');
    const fullScriptPath = path.join(__dirname, '..', scriptPath);

    console.log(`Running TypeScript script: ${scriptPath}`);

    const child = spawn(tsxPath, [fullScriptPath, ...args], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ TypeScript script completed successfully: ${scriptPath}`);
        resolve();
      } else {
        console.error(`✗ TypeScript script failed with code ${code}: ${scriptPath}`);
        reject(new Error(`Script failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`✗ Failed to run TypeScript script: ${scriptPath}`, error.message);
      reject(error);
    });
  });
}

async function main() {
  const fs = require('fs');
  const possiblePaths = [
    'src/scripts/initialize-warning-conditions.ts',
    'scripts/initialize-warning-conditions.ts'
  ];

  let scriptToRun = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(__dirname, '..', p))) {
      scriptToRun = p;
      break;
    }
  }

  if (!scriptToRun) {
    console.warn('⚠️ Warning: Could not find initialization script in source or scripts directory.');
    console.warn('   Checked: ' + possiblePaths.join(', '));
    console.warn('   Skipping warning conditions initialization.');
    return;
  }

  try {
    await runTypeScriptFile(scriptToRun);
    console.log('Warning conditions initialization completed!');
  } catch (error) {
    console.error('ERROR: Warning conditions initialization failed!');
    console.error(error);
    process.exit(1);
  }
}

// Run the main function
main();
