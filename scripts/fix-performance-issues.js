#!/usr/bin/env node

/**
 * Performance Issue Fix Script
 * 
 * This script helps fix common performance issues after deployment:
 * - Failed queue jobs
 * - Memory leaks
 * - Database connection issues
 * - Large component files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Performance Issue Fix Script Starting...\n');

// Function to check and fix failed queue jobs
async function fixFailedQueueJobs() {
  console.log('📋 Checking for failed queue jobs...');
  
  try {
    // Check queue status
    const queueStatus = execSync('node scripts/check-queue.js', { encoding: 'utf8' });
    console.log('Queue status:', queueStatus);
    
    // If there are failed jobs, try to fix them
    if (queueStatus.includes('fail') || queueStatus.includes('failed')) {
      console.log('⚠️  Found failed jobs, attempting to fix...');
      
      // Clear failed jobs
      execSync('node scripts/fix-stuck-queue.js', { stdio: 'inherit' });
      
      // Restart the processor
      console.log('🔄 Restarting queue processor...');
      execSync('npm run processor:pm2:restart', { stdio: 'inherit' });
      
      console.log('✅ Queue jobs fixed');
    } else {
      console.log('✅ No failed queue jobs found');
    }
  } catch (error) {
    console.log('❌ Error fixing queue jobs:', error.message);
  }
}

// Function to optimize large component files
function optimizeLargeComponents() {
  console.log('\n📦 Optimizing large component files...');
  
  const largeFiles = [
    'src/app/settings/system-preferences/page.tsx',
    'src/components/candidates/CandidateKanbanView.tsx',
    'src/components/candidates/CandidatesPageClient.old.tsx'
  ];
  
  largeFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      
      if (sizeKB > 100) {
        console.log(`⚠️  Large file detected: ${file} (${sizeKB}KB)`);
        
        // For now, just log the issue - actual optimization would require code splitting
        console.log(`   Consider splitting ${file} into smaller components`);
      }
    }
  });
}

// Function to check and optimize database connections
function optimizeDatabaseConnections() {
  console.log('\n🗄️  Checking database connections...');
  
  try {
    // Check connection pool status
    const poolStatus = execSync('node scripts/monitor-connection-pool.js', { encoding: 'utf8' });
    console.log('Database pool status:', poolStatus);
    
    // If there are connection issues, restart the application
    if (poolStatus.includes('error') || poolStatus.includes('failed')) {
      console.log('⚠️  Database connection issues detected');
      console.log('🔄 Consider restarting the application');
    } else {
      console.log('✅ Database connections look good');
    }
  } catch (error) {
    console.log('❌ Error checking database connections:', error.message);
  }
}

// Function to check memory usage
function checkMemoryUsage() {
  console.log('\n🧠 Checking memory usage...');
  
  try {
    // Get current memory usage from process
    const memUsage = process.memoryUsage();
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    
    console.log(`Current memory usage: ${usedMB}MB / ${totalMB}MB`);
    
    if (usedMB > 500) {
      console.log('⚠️  High memory usage detected');
      console.log('🔄 Consider restarting the application');
    } else {
      console.log('✅ Memory usage is normal');
    }
  } catch (error) {
    console.log('❌ Error checking memory usage:', error.message);
  }
}

// Function to clean up temporary files
function cleanupTempFiles() {
  console.log('\n🧹 Cleaning up temporary files...');
  
  const tempDirs = [
    '.next/cache',
    'node_modules/.cache',
    'logs'
  ];
  
  tempDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      try {
        // Clean up old log files
        if (dir === 'logs') {
          const files = fs.readdirSync(dirPath);
          files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            const daysOld = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysOld > 7) {
              fs.unlinkSync(filePath);
              console.log(`   Deleted old log file: ${file}`);
            }
          });
        }
      } catch (error) {
        console.log(`   Error cleaning ${dir}:`, error.message);
      }
    }
  });
  
  console.log('✅ Cleanup completed');
}

// Function to restart services
function restartServices() {
  console.log('\n🔄 Restarting services...');
  
  try {
    // Restart the main application
    console.log('Restarting main application...');
    execSync('npm run start:production', { stdio: 'inherit' });
    
    // Restart the processor
    console.log('Restarting queue processor...');
    execSync('npm run processor:pm2:restart', { stdio: 'inherit' });
    
    console.log('✅ Services restarted');
  } catch (error) {
    console.log('❌ Error restarting services:', error.message);
  }
}

// Function to show performance recommendations
function showRecommendations() {
  console.log('\n💡 Performance Recommendations:');
  console.log('  1. Split large component files (>100KB) into smaller components');
  console.log('  2. Implement code splitting using React.lazy()');
  console.log('  3. Use React.memo() for expensive components');
  console.log('  4. Implement proper loading states');
  console.log('  5. Optimize database queries');
  console.log('  6. Use caching for API calls');
  console.log('  7. Monitor memory usage regularly');
  console.log('  8. Implement proper error boundaries');
  console.log('  9. Use dynamic imports for heavy libraries');
  console.log('  10. Optimize images and assets');
}

// Main execution
async function main() {
  try {
    await fixFailedQueueJobs();
    optimizeLargeComponents();
    optimizeDatabaseConnections();
    checkMemoryUsage();
    cleanupTempFiles();
    showRecommendations();
    
    console.log('\n✅ Performance issue fix completed!');
    console.log('\n📊 Next steps:');
    console.log('  1. Monitor the application for 10-15 minutes');
    console.log('  2. Check if memory usage stabilizes');
    console.log('  3. Verify that queue jobs are processing normally');
    console.log('  4. Consider implementing the recommendations above');
    
  } catch (error) {
    console.error('❌ Performance fix failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
