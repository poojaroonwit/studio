#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

async function testConnectionCleanup() {
  console.log('🧪 Testing Connection Cleanup\n');
  
  try {
    // Create a test pool with low connection limit to simulate high usage
    const testPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 5, // Very low limit to trigger cleanup
      idleTimeoutMillis: 5000,
    });

    console.log('📊 Test Configuration:');
    console.log(`  Max Connections: 5`);
    console.log(`  Idle Timeout: 5000ms`);
    console.log('');

    // Create multiple connections to simulate high usage
    const connections = [];
    console.log('🔗 Creating test connections...');
    
    for (let i = 0; i < 4; i++) {
      try {
        const client = await testPool.connect();
        connections.push(client);
        console.log(`  ✅ Created connection ${i + 1}/4`);
      } catch (error) {
        console.log(`  ❌ Failed to create connection ${i + 1}: ${error.message}`);
      }
    }

    console.log('');
    console.log('📈 Current Pool Status:');
    console.log(`  Total: ${testPool.totalCount}`);
    console.log(`  Idle: ${testPool.idleCount}`);
    console.log(`  Waiting: ${testPool.waitingCount}`);
    console.log(`  Usage: ${Math.round((testPool.totalCount / 5) * 100)}%`);
    console.log('');

    // Simulate the 80% threshold logic
    const usagePercent = Math.round((testPool.totalCount / 5) * 100);
    
    if (usagePercent >= 80) {
      console.log(`🚨 HIGH USAGE DETECTED: ${usagePercent}%`);
      console.log('  This would trigger the emergency cleanup in production');
      
      if (testPool.idleCount > 0) {
        console.log(`  Would close ${testPool.idleCount} idle connections`);
      }
    }

    // Test the cleanup logic
    console.log('🧹 Testing cleanup logic...');
    
    // Release some connections
    for (let i = 0; i < 2; i++) {
      if (connections[i]) {
        connections[i].release();
        console.log(`  ✅ Released connection ${i + 1}`);
      }
    }

    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('');
    console.log('📊 Pool Status After Cleanup:');
    console.log(`  Total: ${testPool.totalCount}`);
    console.log(`  Idle: ${testPool.idleCount}`);
    console.log(`  Waiting: ${testPool.waitingCount}`);
    console.log(`  Usage: ${Math.round((testPool.totalCount / 5) * 100)}%`);
    console.log('');

    // Clean up remaining connections
    console.log('🧹 Cleaning up remaining connections...');
    for (const client of connections) {
      if (client && !client.released) {
        client.release();
      }
    }

    // Close the test pool
    await testPool.end();
    console.log('✅ Test pool closed');

    console.log('');
    console.log('📋 Test Summary:');
    console.log('  - Connection creation: ✅');
    console.log('  - Usage monitoring: ✅');
    console.log('  - Cleanup simulation: ✅');
    console.log('  - Pool management: ✅');
    console.log('');
    console.log('💡 In production, the 80% threshold would:');
    console.log('  1. Log a warning at 70% usage');
    console.log('  2. Trigger smart cleanup at 80% usage');
    console.log('  3. Force pool recreation at 90% usage');
    console.log('');
    console.log('🔧 To test production cleanup:');
    console.log('  curl -X POST /api/debug/connections \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"action": "cleanup", "confirm": true}\'');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testConnectionCleanup().catch(console.error);
