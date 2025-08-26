const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkQueue() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Checking upload queue status...\n');
    
    // Test connection first
    await pool.query('SELECT 1 as test');
    console.log('✅ Database connection successful\n');
    
    // Check if table exists and has data
    const tableCheck = await pool.query(`
      SELECT COUNT(*) as total_count 
      FROM information_schema.tables 
      WHERE table_name = 'upload_queue'
    `);
    
    if (tableCheck.rows[0].total_count === 0) {
      console.log('❌ upload_queue table does not exist!');
      return;
    }
    
    console.log('✅ upload_queue table exists\n');
    
    // Check status counts
    const statusResult = await pool.query('SELECT status, COUNT(*) as count FROM upload_queue GROUP BY status ORDER BY status');
    console.log('Status Summary:');
    if (statusResult.rows.length === 0) {
      console.log('  No items in upload_queue table');
    } else {
      statusResult.rows.forEach(row => {
        console.log(`  ${row.status}: ${row.count}`);
      });
    }
    
    console.log('\nRecent upload queue items:');
    const recentResult = await pool.query(`
      SELECT id, file_name, status, upload_date, completed_date, error 
      FROM upload_queue 
      ORDER BY upload_date DESC 
      LIMIT 10
    `);
    
    if (recentResult.rows.length === 0) {
      console.log('  No recent items found');
    } else {
      recentResult.rows.forEach(row => {
        console.log(`  ${row.file_name} - ${row.status} (${row.upload_date})`);
        if (row.error) {
          console.log(`    Error: ${row.error}`);
        }
      });
    }
    
    // Check for any recent activity in the last 24 hours
    console.log('\nChecking for recent activity (last 24 hours):');
    const recentActivity = await pool.query(`
      SELECT COUNT(*) as count 
      FROM upload_queue 
      WHERE upload_date > NOW() - INTERVAL '24 hours'
    `);
    console.log(`  Items uploaded in last 24 hours: ${recentActivity.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

checkQueue();
