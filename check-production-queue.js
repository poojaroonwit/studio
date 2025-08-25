#!/usr/bin/env node

/**
 * Check Production Queue Status
 * This script connects to the production database to check queue status
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Production database configuration
const productionConfig = {
  host: process.env.PRODUCTION_DB_HOST || '10.111.0.4',
  port: process.env.PRODUCTION_DB_PORT || 5432,
  database: process.env.PRODUCTION_DB_NAME || 'studio_production',
  user: process.env.PRODUCTION_DB_USER || 'postgres',
  password: process.env.PRODUCTION_DB_PASSWORD || 'secure_password',
};

async function checkProductionQueue() {
  console.log('🔍 Checking Production Queue Status...\n');
  
  // Try production database first
  let pool = new Pool(productionConfig);
  
  try {
    console.log('📊 Production Database Connection:');
    console.log(`  Host: ${productionConfig.host}:${productionConfig.port}`);
    console.log(`  Database: ${productionConfig.database}`);
    console.log(`  User: ${productionConfig.user}`);
    console.log('');
    
    const client = await pool.connect();
    
    // Check queue status
    console.log('📈 Production Queue Status:');
    const statusResult = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });
    
    // Check recent jobs
    console.log('\n📋 Recent Production Jobs (last 10):');
    const recentJobs = await client.query(`
      SELECT 
        id,
        file_name,
        status,
        upload_date,
        process_date,
        completed_date,
        source
      FROM upload_queue 
      ORDER BY upload_date DESC 
      LIMIT 10
    `);
    
    recentJobs.rows.forEach(row => {
      console.log(`  ${row.file_name}: ${row.status} (${row.source}) - ${row.upload_date}`);
    });
    
    // Check stuck jobs
    console.log('\n⚠️  Stuck Jobs in Production:');
    const stuckJobs = await client.query(`
      SELECT 
        id,
        file_name,
        status,
        upload_date,
        process_date,
        EXTRACT(EPOCH FROM (NOW() - process_date))/3600 as hours_stuck
      FROM upload_queue 
      WHERE status = 'inprocess'
      ORDER BY process_date ASC
    `);
    
    if (stuckJobs.rows.length === 0) {
      console.log('  ✅ No stuck jobs found');
    } else {
      console.log(`  ❌ Found ${stuckJobs.rows.length} stuck jobs:`);
      stuckJobs.rows.forEach(row => {
        const hoursStuck = row.hours_stuck ? parseFloat(row.hours_stuck).toFixed(1) : 'unknown';
        console.log(`    - ${row.file_name}: stuck for ${hoursStuck} hours`);
      });
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error connecting to production database:', error.message);
    console.log('\n🔄 Trying local database...');
    
    // Fallback to local database
    pool.end();
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    try {
      const client = await pool.connect();
      
      console.log('📊 Local Database Queue Status:');
      const statusResult = await client.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM upload_queue 
        GROUP BY status 
        ORDER BY status
      `);
      
      statusResult.rows.forEach(row => {
        console.log(`  ${row.status}: ${row.count} jobs`);
      });
      
      client.release();
      
    } catch (localError) {
      console.error('❌ Error connecting to local database:', localError.message);
    }
  } finally {
    await pool.end();
  }
}

checkProductionQueue();
