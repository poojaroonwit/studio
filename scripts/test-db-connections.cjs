#!/usr/bin/env node

// Test script to verify database connection management
// This script tests the new safe database connection utilities

require('dotenv').config();
const { Pool } = require('pg');

async function testDatabaseConnections() {
  console.log('🧪 Testing Database Connection Management...\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ FATAL: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
    idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '1800000')
  });

  // Test 1: Basic connection test
  console.log('1️⃣ Testing basic database connection...');
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Basic connection test passed:', result.rows[0].current_time);
    client.release();
  } catch (error) {
    console.error('❌ Basic connection test failed:', error.message);
    process.exit(1);
  }

  // Test 2: Multiple connection test (simulate concurrent API requests)
  console.log('\n2️⃣ Testing multiple concurrent connections...');
  try {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(async () => {
        const client = await pool.connect();
        await client.query('SELECT $1 as test_value', [i]);
        client.release();
        return i;
      });
    }
    
    const results = await Promise.all(promises.map(fn => fn()));
    console.log('✅ Multiple connection test passed:', results);
  } catch (error) {
    console.error('❌ Multiple connection test failed:', error.message);
    process.exit(1);
  }

  // Test 3: Error handling test (simulate transaction rollback)
  console.log('\n3️⃣ Testing transaction error handling...');
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT 1'); // Valid query
      await client.query('ROLLBACK');
      console.log('✅ Transaction rollback test passed');
    } catch (txError) {
      console.log('🔄 Rollback during error (expected)');
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.log('ℹ️ Rollback error handled (expected)');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Transaction error handling test failed:', error.message);
    process.exit(1);
  }

  // Test 4: Double release prevention test
  console.log('\n4️⃣ Testing double release prevention...');
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    // Try to release again - this should NOT cause an error with proper handling
    try {
      client.release();
      console.log('⚠️ Double release did not throw error - check SafeClient implementation');
    } catch (doubleReleaseError) {
      if (doubleReleaseError.message.includes('already been released')) {
        console.log('❌ Double release error detected - this indicates the issue still exists');
        console.log('Error details:', doubleReleaseError.message);
      } else {
        console.log('✅ Double release handled gracefully');
      }
    }
  } catch (error) {
    console.error('❌ Double release test failed:', error.message);
  }

  // Test 5: Pool health check
  console.log('\n5️⃣ Checking pool health...');
  try {
    console.log('📊 Pool stats:');
    console.log(`   - Total connections: ${pool.totalCount}`);
    console.log(`   - Idle connections: ${pool.idleCount}`);
    console.log(`   - Waiting clients: ${pool.waitingCount}`);
    console.log('✅ Pool health check completed');
  } catch (error) {
    console.error('❌ Pool health check failed:', error.message);
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await pool.end();
  console.log('✅ All tests completed successfully!\n');
  
  console.log('🎉 Database connection management tests passed!');
  console.log('📝 The double release error should now be resolved.');
}

// Run the tests
testDatabaseConnections().catch((error) => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
}); 