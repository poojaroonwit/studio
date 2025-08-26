const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function debugQueue() {
  console.log('🔍 Debugging Upload Queue Issues...\n');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const client = await pool.connect();
    
    console.log('📊 Database Connection Info:');
    console.log(`  URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);
    console.log(`  Database: ${client.connectionParameters.database}`);
    console.log(`  Host: ${client.connectionParameters.host}`);
    console.log(`  Port: ${client.connectionParameters.port}`);
    console.log('');
    
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'upload_queue'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ upload_queue table does not exist!');
      return;
    }
    
    console.log('✅ upload_queue table exists\n');
    
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
    
    // Check for stuck jobs
    const stuckJobs = await client.query(`
      SELECT COUNT(*) as count
      FROM upload_queue 
      WHERE status = 'inprocess' 
      AND process_date < NOW() - INTERVAL '1 hour'
    `);
    
    console.log(`⚠️  Stuck jobs (>1 hour): ${stuckJobs.rows[0].count}\n`);
    
    // Check recent activity
    const recentJobs = await client.query(`
      SELECT id, file_name, status, upload_date, process_date, completed_date, error
      FROM upload_queue 
      ORDER BY upload_date DESC 
      LIMIT 5
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
    
    // Check for any jobs with null or invalid status
    const invalidJobs = await client.query(`
      SELECT COUNT(*) as count
      FROM upload_queue 
      WHERE status IS NULL OR status = ''
    `);
    
    console.log(`❌ Jobs with invalid status: ${invalidJobs.rows[0].count}\n`);
    
    // Check for any jobs without file_path
    const noFilePathJobs = await client.query(`
      SELECT COUNT(*) as count
      FROM upload_queue 
      WHERE file_path IS NULL OR file_path = ''
    `);
    
    console.log(`❌ Jobs without file_path: ${noFilePathJobs.rows[0].count}\n`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

debugQueue();
