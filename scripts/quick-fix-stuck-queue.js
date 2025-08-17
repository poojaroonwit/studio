#!/usr/bin/env node

/**
 * Quick Fix Stuck Queue
 * 
 * This script uses the existing database connection to fix stuck jobs
 */

// Try to use the existing database connection from the app
let dbConfig;

// Try to load environment variables
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, continue
}

// Try different database connection methods
async function getDbConnection() {
  // Method 1: Try to use the existing db module
  try {
    const { getPool } = require('../src/lib/db');
    return getPool();
  } catch (e) {
    console.log('Could not import existing db module, trying direct connection...');
  }

  // Method 2: Direct PostgreSQL connection
  try {
    const { Pool } = require('pg');
    
    // Try to get config from environment or use defaults
    const config = {
      host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
      port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
      database: process.env.DB_NAME || process.env.POSTGRES_DB || 'studio8',
      user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
      password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'password',
    };

    console.log('Database config:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password ? '***' : 'not set'
    });

    return new Pool(config);
  } catch (e) {
    throw new Error(`Failed to create database connection: ${e.message}`);
  }
}

async function quickFixStuckQueue() {
  let pool;
  
  try {
    console.log('🔧 Quick Fix Stuck Queue');
    console.log('========================\n');

    // Get database connection
    pool = await getDbConnection();
    console.log('✅ Database connection established');

    // Check current status
    console.log('\n📊 Checking current queue status...');
    const statusResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('Current queue status:');
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });

    // Check stuck jobs
    const stuckResult = await pool.query(`
      SELECT COUNT(*) as stuck_count
      FROM upload_queue 
      WHERE status = 'inprocess'
    `);
    
    const stuckCount = parseInt(stuckResult.rows[0].stuck_count);
    console.log(`\n🔴 Found ${stuckCount} stuck jobs`);

    if (stuckCount === 0) {
      console.log('✅ No stuck jobs to fix');
      return;
    }

    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question(`\nDo you want to reset ${stuckCount} stuck jobs to queued status? (y/N): `, resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled');
      return;
    }

    // Reset all stuck jobs
    console.log('\n🔄 Resetting stuck jobs...');
    const resetResult = await pool.query(`
      UPDATE upload_queue 
      SET 
        status = 'queued',
        process_date = NULL,
        updated_at = NOW(),
        error = 'Reset due to queue stuck - will retry',
        error_details = 'All jobs were reset due to queue processing issue'
      WHERE status = 'inprocess'
      RETURNING id, file_name
    `);

    console.log(`✅ Successfully reset ${resetResult.rows.length} jobs`);

    // Reduce concurrent processors to prevent future issues
    console.log('\n⚙️  Reducing max concurrent processors to 1...');
    await pool.query(`
      INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
      VALUES ('maxConcurrentProcessors', '1', NOW(), NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = '1',
        "updatedAt" = NOW()
    `);

    // Show final status
    console.log('\n📊 Final queue status:');
    const finalStatusResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    
    finalStatusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });

    console.log('\n✅ Queue fix completed successfully!');
    console.log('💡 Next steps:');
    console.log('  1. Go to your application and check the upload queue');
    console.log('  2. Try processing the queue again');
    console.log('  3. Check your webhook configuration if jobs still fail');

  } catch (error) {
    console.error('❌ Failed to fix stuck queue:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Database connection failed. Please check:');
      console.log('  1. Is your database running?');
      console.log('  2. Are the database credentials correct?');
      console.log('  3. Try running the SQL commands manually in your database client');
    }
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Database host not found. Please check your DB_HOST setting.');
    }
    
    if (error.code === '28P01') {
      console.log('\n💡 Authentication failed. Please check your database username and password.');
    }
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (e) {
        // Ignore pool end errors
      }
    }
  }
}

// Run the script
quickFixStuckQueue().catch(console.error);
