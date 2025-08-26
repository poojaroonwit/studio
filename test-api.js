const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testAPI() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Testing upload queue API response format...\n');
    
    // Simulate the API query logic
    const client = await pool.connect();
    
    // Test the exact query from the API
    const dataRes = await client.query(`
      SELECT uq.*, p.title as position_title 
      FROM upload_queue uq 
      LEFT JOIN "Position" p ON uq.position_id = p.id 
      ORDER BY uq.upload_date DESC 
      LIMIT 20 OFFSET 0
    `);
    
    console.log(`Found ${dataRes.rows.length} items in database`);
    
    // Test the summary query
    const summaryRes = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE uq.status = 'queued') as queued,
        COUNT(*) FILTER (WHERE uq.status = 'inprocess') as inprocess,
        COUNT(*) FILTER (WHERE uq.status = 'success') as success,
        COUNT(*) FILTER (WHERE uq.status = 'error' OR uq.status = 'fail') as error
      FROM upload_queue uq 
    `);
    
    const summary = summaryRes.rows[0];
    console.log('\nSummary data:');
    console.log(`  total: ${summary.total} (type: ${typeof summary.total})`);
    console.log(`  queued: ${summary.queued} (type: ${typeof summary.queued})`);
    console.log(`  inprocess: ${summary.inprocess} (type: ${typeof summary.inprocess})`);
    console.log(`  success: ${summary.success} (type: ${typeof summary.success})`);
    console.log(`  error: ${summary.error} (type: ${typeof summary.error})`);
    
    // Check for any null or undefined values
    const safeSummary = {
      total: parseInt(summary.total, 10) || 0,
      queued: Number(summary.queued) || 0,
      inprocess: Number(summary.inprocess) || 0,
      success: Number(summary.success) || 0,
      error: Number(summary.error) || 0,
    };
    
    console.log('\nProcessed summary:');
    console.log(JSON.stringify(safeSummary, null, 2));
    
    // Show first few items
    if (dataRes.rows.length > 0) {
      console.log('\nFirst 3 items:');
      dataRes.rows.slice(0, 3).forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.file_name} - ${row.status} (${row.upload_date})`);
      });
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testAPI();
