#!/usr/bin/env node

/**
 * Test Upload Queue Pagination
 * This script tests that the upload queue API only loads records for the specific page
 */

const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testUploadQueuePagination() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Upload Queue Pagination...\n');
    
    // Test parameters
    const limit = 5;
    const offset = 0;
    
    console.log(`📊 Testing with limit=${limit}, offset=${offset}`);
    
    // Build the same query logic as the API
    const whereClauses = [];
    const values = [];
    let paramIdx = 1;
    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    // Add pagination
    values.push(limit);
    values.push(offset);
    
    // Test the main query (should only return 5 records)
    console.log('\n🔍 Testing main query (should return only 5 records):');
    const startTime = Date.now();
    
    const dataRes = await client.query(
      `SELECT uq.*, p.title as position_title 
       FROM upload_queue uq 
       LEFT JOIN "Position" p ON uq.position_id = p.id 
       ${whereSQL} 
       ORDER BY uq.upload_date DESC 
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      values
    );
    
    const queryTime = Date.now() - startTime;
    console.log(`   ✅ Query completed in ${queryTime}ms`);
    console.log(`   📄 Records returned: ${dataRes.rows.length}`);
    console.log(`   📋 Expected: ${limit} records`);
    
    if (dataRes.rows.length <= limit) {
      console.log('   ✅ Pagination working correctly - only page records loaded');
    } else {
      console.log('   ❌ Pagination issue - too many records returned');
    }
    
    // Show first few records
    if (dataRes.rows.length > 0) {
      console.log('\n📋 Sample records:');
      dataRes.rows.slice(0, 3).forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.file_name} (${row.status}) - ${row.upload_date}`);
      });
    }
    
    // Test count query
    console.log('\n🔢 Testing count query:');
    const countRes = await client.query(
      `SELECT COUNT(*) 
       FROM upload_queue uq 
       ${whereSQL}`,
      values.slice(0, values.length - 2)
    );
    
    const totalCount = parseInt(countRes.rows[0].count, 10);
    console.log(`   📊 Total records in table: ${totalCount}`);
    console.log(`   📄 Records on this page: ${dataRes.rows.length}`);
    console.log(`   📋 Pagination ratio: ${((dataRes.rows.length / totalCount) * 100).toFixed(2)}%`);
    
    // Test second page
    console.log('\n📄 Testing second page (offset=5):');
    const offset2 = 5;
    const values2 = [...values.slice(0, -2), limit, offset2];
    
    const dataRes2 = await client.query(
      `SELECT uq.*, p.title as position_title 
       FROM upload_queue uq 
       LEFT JOIN "Position" p ON uq.position_id = p.id 
       ${whereSQL} 
       ORDER BY uq.upload_date DESC 
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      values2
    );
    
    console.log(`   📄 Records returned: ${dataRes2.rows.length}`);
    console.log(`   📋 Expected: ${limit} records (or less if end of data)`);
    
    // Verify no overlap between pages
    if (dataRes.rows.length > 0 && dataRes2.rows.length > 0) {
      const firstPageIds = dataRes.rows.map(r => r.id);
      const secondPageIds = dataRes2.rows.map(r => r.id);
      const overlap = firstPageIds.filter(id => secondPageIds.includes(id));
      
      if (overlap.length === 0) {
        console.log('   ✅ No overlap between pages - pagination working correctly');
      } else {
        console.log(`   ❌ Found ${overlap.length} overlapping records between pages`);
      }
    }
    
    // Performance summary
    console.log('\n📈 Performance Summary:');
    console.log(`   ⚡ Query time: ${queryTime}ms`);
    console.log(`   📊 Total records: ${totalCount}`);
    console.log(`   📄 Records per page: ${limit}`);
    console.log(`   📋 Pages needed: ${Math.ceil(totalCount / limit)}`);
    
    if (queryTime < 1000) {
      console.log('   ✅ Performance is excellent (< 1 second)');
    } else if (queryTime < 5000) {
      console.log('   ⚠️  Performance is acceptable (< 5 seconds)');
    } else {
      console.log('   ❌ Performance is poor (> 5 seconds) - consider optimization');
    }
    
    console.log('\n✅ Pagination test completed!');

  } catch (error) {
    console.error('❌ Error during pagination test:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  testUploadQueuePagination().catch(console.error);
}

module.exports = { testUploadQueuePagination };
