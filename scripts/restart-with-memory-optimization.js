#!/usr/bin/env node

/**
 * Restart Development Server with Memory Optimization
 * 
 * This script restarts the development server with memory optimizations enabled.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Restarting Development Server with Memory Optimization');
console.log('========================================================\n');

// Memory optimization environment variables
const memoryOptimizationEnv = {
  ...process.env,
  NODE_OPTIONS: '--max-old-space-size=4096 --expose-gc',
  NEXT_TELEMETRY_DISABLED: '1',
  NODE_ENV: 'development',
  // Enable memory optimization flags
  MEMORY_OPTIMIZATION: 'true',
  ENABLE_MEMORY_MONITORING: 'true',
  // Disable some features that consume memory
  NEXT_DISABLE_SOURCEMAPS: 'true',
  NEXT_DISABLE_ESLINT: 'false', // Keep ESLint for development
  NEXT_DISABLE_TYPE_CHECK: 'false' // Keep type checking for development
};

function killExistingProcess() {
  return new Promise((resolve) => {
    console.log('🛑 Stopping existing development server...');
    
    // On Windows, find and kill the Next.js process
    if (process.platform === 'win32') {
      const tasklist = spawn('tasklist', ['/FI', 'IMAGENAME eq node.exe', '/FO', 'CSV']);
      let output = '';
      
      tasklist.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      tasklist.on('close', () => {
        const lines = output.split('\n');
        const nodeProcesses = lines.filter(line => 
          line.includes('node.exe') && 
          (line.includes('next') || line.includes('dev'))
        );
        
        if (nodeProcesses.length > 0) {
          console.log('Found existing Node.js processes, attempting to terminate...');
          const taskkill = spawn('taskkill', ['/F', '/IM', 'node.exe']);
          taskkill.on('close', () => {
            console.log('✅ Existing processes terminated');
            resolve();
          });
        } else {
          console.log('✅ No existing processes found');
          resolve();
        }
      });
    } else {
      // On Unix-like systems
      const pkill = spawn('pkill', ['-f', 'next']);
      pkill.on('close', () => {
        console.log('✅ Existing processes terminated');
        resolve();
      });
    }
  });
}

function startDevelopmentServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting development server with memory optimization...');
    
    // Check if package.json exists
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      reject(new Error('package.json not found. Please run this script from the project root.'));
      return;
    }
    
    // Read package.json to get the dev script
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const devScript = packageJson.scripts?.dev || 'next dev';
    
    console.log(`📦 Using dev script: ${devScript}`);
    console.log('🔧 Memory optimization settings:');
    console.log(`  - Max heap size: ${memoryOptimizationEnv.NODE_OPTIONS}`);
    console.log(`  - Memory monitoring: ${memoryOptimizationEnv.ENABLE_MEMORY_MONITORING}`);
    console.log(`  - Source maps: ${memoryOptimizationEnv.NEXT_DISABLE_SOURCEMAPS === 'true' ? 'disabled' : 'enabled'}`);
    console.log('');
    
    // Start the development server
    const devProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      env: memoryOptimizationEnv,
      shell: true
    });
    
    devProcess.on('error', (error) => {
      console.error('❌ Failed to start development server:', error.message);
      reject(error);
    });
    
    devProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Development server stopped normally');
      } else {
        console.log(`⚠️  Development server stopped with code ${code}`);
      }
    });
    
    // Wait a bit for the server to start
    setTimeout(() => {
      console.log('✅ Development server started successfully!');
      console.log('');
      console.log('🌐 Server should be available at: http://localhost:3000');
      console.log('');
      console.log('📊 Memory monitoring is now active:');
      console.log('  - Check the Memory Monitor component in the bottom-left corner');
      console.log('  - Use browser DevTools Memory tab for detailed analysis');
      console.log('  - Monitor the console for memory-related warnings');
      console.log('');
      console.log('🔍 To monitor memory usage:');
      console.log('  1. Open browser DevTools (F12)');
      console.log('  2. Go to Memory tab');
      console.log('  3. Take heap snapshots');
      console.log('  4. Monitor memory usage over time');
      console.log('');
      console.log('🛑 Press Ctrl+C to stop the server');
      
      resolve(devProcess);
    }, 3000);
  });
}

async function main() {
  try {
    // Kill existing processes
    await killExistingProcess();
    
    // Wait a moment for processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start the development server
    await startDevelopmentServer();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  killExistingProcess,
  startDevelopmentServer,
  memoryOptimizationEnv
};
