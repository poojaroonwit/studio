#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkFailedJobs() {
  const client = await pool.connect();
  
  try {
    console.log('❌ Failed Jobs Analysis:');
    const failedJobs = await client.query(`
      SELECT 
        id,
        file_name,
        status,
        error,
        error_details,
        upload_date,
        process_date,
        completed_date
      FROM upload_queue 
      WHERE status = 'fail'
      ORDER BY upload_date ASC
    `);
    
    if (failedJobs.rows.length === 0) {
      console.log('  No failed jobs found');
      return;
    }
    
    failedJobs.rows.forEach(row => {
      console.log(`\n📄 ${row.file_name}:`);
      console.log(`  Status: ${row.status}`);
      console.log(`  Error: ${row.error || 'No error message'}`);
      if (row.error_details) {
        console.log(`  Details: ${row.error_details}`);
      }
      console.log(`  Uploaded: ${row.upload_date}`);
      console.log(`  Processed: ${row.process_date || 'Not processed'}`);
      console.log(`  Completed: ${row.completed_date || 'Not completed'}`);
    });
    
    // Check system settings
    console.log('\n⚙️  System Settings:');
    const settings = await client.query(`
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key IN ('resumeProcessingWebhookUrl', 'resumeProcessingWebhookToken', 'resumeProcessingWebhookTimeout')
      ORDER BY key
    `);
    
    settings.rows.forEach(row => {
      console.log(`  ${row.key}: ${row.value || 'Not set'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking failed jobs:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkFailedJobs();
