const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function testUpload() {
  console.log('🧪 Testing CV Upload Process...\n');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const client = await pool.connect();
    
    // Check initial state
    const initialCount = await client.query('SELECT COUNT(*) as count FROM upload_queue');
    console.log(`📊 Initial queue count: ${initialCount.rows[0].count}`);
    
    // Simulate adding a test job to the queue
    const testJob = {
      id: require('crypto').randomUUID(),
      file_name: 'test-cv.pdf',
      file_size: 1024,
      status: 'queued',
      source: 'test',
      upload_date: new Date(),
      file_path: 'uploads/test-cv.pdf',
      created_by: null,
      updated_at: new Date()
    };
    
    const insertQuery = `
      INSERT INTO upload_queue (
        id, file_name, file_size, status, source, upload_date, 
        file_path, created_by, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    await client.query(insertQuery, [
      testJob.id,
      testJob.file_name,
      testJob.file_size,
      testJob.status,
      testJob.source,
      testJob.upload_date,
      testJob.file_path,
      testJob.created_by,
      testJob.updated_at
    ]);
    
    console.log('✅ Test job added to queue');
    
    // Check final state
    const finalCount = await client.query('SELECT COUNT(*) as count FROM upload_queue');
    console.log(`📊 Final queue count: ${finalCount.rows[0].count}`);
    
    // Check the job details
    const jobDetails = await client.query('SELECT * FROM upload_queue WHERE id = $1', [testJob.id]);
    if (jobDetails.rows.length > 0) {
      console.log('\n📋 Test job details:');
      console.log(`  ID: ${jobDetails.rows[0].id}`);
      console.log(`  File: ${jobDetails.rows[0].file_name}`);
      console.log(`  Status: ${jobDetails.rows[0].status}`);
      console.log(`  Upload Date: ${jobDetails.rows[0].upload_date}`);
    }
    
    // Clean up - remove test job
    await client.query('DELETE FROM upload_queue WHERE id = $1', [testJob.id]);
    console.log('\n🧹 Test job cleaned up');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testUpload();
