#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkQueueStatus() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Current Queue Status:');
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
    console.log('\n📋 Recent Jobs (last 10):');
    const recentJobs = await client.query(`
      SELECT 
        id,
        file_name,
        status,
        upload_date,
        process_date,
        completed_date
      FROM upload_queue 
      ORDER BY upload_date DESC 
      LIMIT 10
    `);
    
    recentJobs.rows.forEach(row => {
      console.log(`  ${row.file_name}: ${row.status} (uploaded: ${row.upload_date})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking queue status:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkQueueStatus();
