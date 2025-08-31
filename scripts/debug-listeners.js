#!/usr/bin/env node

/**
 * Debug script to monitor process event listeners
 * Run this to check for potential memory leaks with SIGINT/SIGTERM listeners
 */

console.log('🔍 Process Listener Debug Tool');
console.log('==============================');

// Check current listener counts
const signals = ['SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2', 'uncaughtException', 'unhandledRejection'];

console.log('\n📊 Current Process Listeners:');
signals.forEach(signal => {
  const count = process.listenerCount(signal);
  if (count > 0) {
    console.log(`  ${signal}: ${count} listener(s)`);
    
    // If there are many listeners, show a warning
    if (count > 5) {
      console.log(`    ⚠️  Warning: High listener count for ${signal}`);
    }
  }
});

// Check max listeners setting
console.log(`\n⚙️  Max Listeners Setting: ${process.getMaxListeners()}`);

// Show process memory usage
const memUsage = process.memoryUsage();
console.log('\n💾 Memory Usage:');
console.log(`  RSS: ${Math.round(memUsage.rss / 1024 / 1024)} MB`);
console.log(`  Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`);
console.log(`  Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`);

// Show uptime
console.log(`\n⏱️  Process Uptime: ${Math.round(process.uptime())} seconds`);

// Check if we're in development mode
if (process.env.NODE_ENV === 'development') {
  console.log('\n🔧 Development Mode Detected');
  console.log('  💡 Hot reloading may cause listener accumulation');
  console.log('  💡 Consider restarting the development server periodically');
}

console.log('\n✅ Debug complete');
console.log('\n💡 To fix listener leaks:');
console.log('  1. Restart your development server');
console.log('  2. Check for duplicate signal handlers in your code');
console.log('  3. Use the ProcessManager utility for signal handling');
console.log('  4. Consider increasing max listeners if needed: process.setMaxListeners(20)');
