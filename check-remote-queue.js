const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local.remote' });

async function checkRemoteQueue() {
  console.log('🔍 Checking Remote Database Upload Queue...\n');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const client = await pool.connect();
    
    console.log('📊 Remote Database Connection Info:');
    console.log(`  URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);
    console.log(`  Database: ${client.connectionParameters.database}`);
    console.log(`  Host: ${client.connectionParameters.host}`);
    console.log(`  Port: ${client.connectionParameters.port}`);
    console.log('');
    
    // Check total count
    const totalCount = await client.query('SELECT COUNT(*) as count FROM upload_queue');
    console.log(`📈 Total items in upload_queue: ${totalCount.rows[0].count}\n`);
    
    // Check status breakdown
    const statusBreakdown = await client.query(`
      SELECT status, COUNT(*) as count 
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('📋 Status Breakdown:');
    statusBreakdown.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });
    console.log('');
    
    // Check recent jobs
    const recentJobs = await client.query(`
      SELECT id, file_name, status, upload_date, process_date, completed_date, error
      FROM upload_queue 
      ORDER BY upload_date DESC 
      LIMIT 10
    `);
    
    console.log('🕒 Recent Jobs:');
    if (recentJobs.rows.length === 0) {
      console.log('  No recent jobs found');
    } else {
      recentJobs.rows.forEach((job, index) => {
        console.log(`  ${index + 1}. ${job.file_name}`);
        console.log(`     Status: ${job.status}`);
        console.log(`     Upload: ${job.upload_date}`);
        if (job.process_date) console.log(`     Process: ${job.process_date}`);
        if (job.completed_date) console.log(`     Completed: ${job.completed_date}`);
        if (job.error) console.log(`     Error: ${job.error}`);
        console.log('');
      });
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

checkRemoteQueue();
