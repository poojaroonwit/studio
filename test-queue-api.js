const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testQueueAPI() {
  console.log('🧪 Testing Upload Queue API...\n');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const client = await pool.connect();
    
    console.log('📊 Database Connection Info:');
    console.log(`  URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);
    console.log(`  Database: ${client.connectionParameters.database}`);
    console.log(`  Host: ${client.connectionParameters.host}`);
    console.log(`  Port: ${client.connectionParameters.port}`);
    console.log('');
    
    // Test the exact query from the API
    console.log('🔍 Testing API Query Logic...');
    
    // Test the summary query (same as API)
    const summaryRes = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'queued') as queued,
        COUNT(*) FILTER (WHERE status = 'inprocess') as inprocess,
        COUNT(*) FILTER (WHERE status = 'success') as success,
        COUNT(*) FILTER (WHERE status = 'error' OR status = 'fail') as error
      FROM upload_queue
    `);
    
    const summary = summaryRes.rows[0];
    console.log('📋 Summary Query Result:');
    console.log(`  Total: ${summary.total}`);
    console.log(`  Queued: ${summary.queued}`);
    console.log(`  In Process: ${summary.inprocess}`);
    console.log(`  Success: ${summary.success}`);
    console.log(`  Error: ${summary.error}`);
    console.log('');
    
    // Test the data query (same as API)
    const dataRes = await client.query(`
      SELECT uq.*, p.title as position_title 
      FROM upload_queue uq 
      LEFT JOIN "Position" p ON uq.position_id = p.id 
      ORDER BY uq.upload_date DESC 
      LIMIT 20 OFFSET 0
    `);
    
    console.log(`📄 Data Query Result: ${dataRes.rows.length} items`);
    
    if (dataRes.rows.length > 0) {
      console.log('  Recent items:');
      dataRes.rows.slice(0, 3).forEach((item, index) => {
        console.log(`    ${index + 1}. ${item.file_name} - ${item.status} (${item.upload_date})`);
      });
    }
    
    // Test what the API would return
    const apiResponse = {
      data: dataRes.rows,
      total: parseInt(summary.total, 10),
      summary: {
        total: parseInt(summary.total, 10),
        queued: parseInt(summary.queued, 10) || 0,
        inprocess: parseInt(summary.inprocess, 10) || 0,
        success: parseInt(summary.success, 10) || 0,
        error: parseInt(summary.error, 10) || 0,
      }
    };
    
    console.log('\n📤 Simulated API Response:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    // Test frontend parsing
    console.log('\n🔍 Frontend Parsing Test:');
    const frontendSummary = {
      total: parseInt(apiResponse.summary.total) || 0,
      queued: parseInt(apiResponse.summary.queued) || 0,
      inprocess: parseInt(apiResponse.summary.inprocess) || 0,
      success: parseInt(apiResponse.summary.success) || 0,
      error: parseInt(apiResponse.summary.error) || 0
    };
    
    console.log('  Frontend Summary:');
    console.log(`    Total: ${frontendSummary.total}`);
    console.log(`    Queued: ${frontendSummary.queued}`);
    console.log(`    In Process: ${frontendSummary.inprocess}`);
    console.log(`    Success: ${frontendSummary.success}`);
    console.log(`    Error: ${frontendSummary.error}`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testQueueAPI();
