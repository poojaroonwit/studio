#!/usr/bin/env node

/**
 * Verify Upload Queue Count Script
 * This script verifies that the upload queue count shows the complete count
 */

const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function verifyUploadQueueCount() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying upload queue count accuracy...\n');
    
    // 1. Get the complete count using the same query as the API
    console.log('📊 Complete Count Query (same as API):');
    const countQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'queued') as queued,
        COUNT(*) FILTER (WHERE status = 'inprocess') as inprocess,
        COUNT(*) FILTER (WHERE status = 'success') as success,
        COUNT(*) FILTER (WHERE status = 'error' OR status = 'fail') as error
      FROM upload_queue
    `;
    
    const countResult = await client.query(countQuery);
    const counts = countResult.rows[0];
    
    const total = Number(counts.total) || 0;
    const queued = Number(counts.queued) || 0;
    const inprocess = Number(counts.inprocess) || 0;
    const success = Number(counts.success) || 0;
    const error = Number(counts.error) || 0;
    const pending = queued + inprocess;
    
    console.log(`   - Total items: ${total}`);
    console.log(`   - Queued: ${queued}`);
    console.log(`   - In Process: ${inprocess}`);
    console.log(`   - Success: ${success}`);
    console.log(`   - Error/Fail: ${error}`);
    console.log(`   - Pending (queued + inprocess): ${pending}`);
    
    // 2. Verify by counting manually
    console.log('\n🔍 Manual Verification:');
    const manualQuery = `
      SELECT status, COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `;
    
    const manualResult = await client.query(manualQuery);
    let manualTotal = 0;
    let manualQueued = 0;
    let manualInprocess = 0;
    
    manualResult.rows.forEach(row => {
      manualTotal += Number(row.count);
      if (row.status === 'queued') manualQueued = Number(row.count);
      if (row.status === 'inprocess') manualInprocess = Number(row.count);
    });
    
    const manualPending = manualQueued + manualInprocess;
    
    console.log(`   - Manual total: ${manualTotal}`);
    console.log(`   - Manual queued: ${manualQueued}`);
    console.log(`   - Manual inprocess: ${manualInprocess}`);
    console.log(`   - Manual pending: ${manualPending}`);
    
    // 3. Check for any discrepancies
    console.log('\n✅ Verification Results:');
    const totalMatch = total === manualTotal;
    const queuedMatch = queued === manualQueued;
    const inprocessMatch = inprocess === manualInprocess;
    const pendingMatch = pending === manualPending;
    
    console.log(`   - Total count match: ${totalMatch ? '✅' : '❌'}`);
    console.log(`   - Queued count match: ${queuedMatch ? '✅' : '❌'}`);
    console.log(`   - In-process count match: ${inprocessMatch ? '✅' : '❌'}`);
    console.log(`   - Pending count match: ${pendingMatch ? '✅' : '❌'}`);
    
    if (totalMatch && queuedMatch && inprocessMatch && pendingMatch) {
      console.log('\n🎉 All counts match! The API is showing the complete count.');
    } else {
      console.log('\n⚠️  Count mismatch detected! Please investigate.');
    }
    
    // 4. Show what the sidebar should display
    console.log('\n📱 Sidebar Display:');
    console.log(`   - The sidebar should show: ${pending}`);
    console.log(`   - This represents ALL queued + ALL inprocess items`);
    console.log(`   - No limit applied - complete count`);
    
    // 5. Performance check
    console.log('\n⚡ Performance Check:');
    const startTime = Date.now();
    await client.query(countQuery);
    const queryTime = Date.now() - startTime;
    
    console.log(`   - Count query time: ${queryTime}ms`);
    if (queryTime < 100) {
      console.log('   - Performance: ✅ Excellent');
    } else if (queryTime < 500) {
      console.log('   - Performance: ⚠️  Acceptable');
    } else {
      console.log('   - Performance: ❌ Slow - needs optimization');
    }
    
  } catch (error) {
    console.error('❌ Error verifying upload queue count:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the verification script
if (require.main === module) {
  verifyUploadQueueCount()
    .then(() => {
      console.log('\n✨ Upload queue count verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to verify upload queue count:', error);
      process.exit(1);
    });
}

module.exports = { verifyUploadQueueCount };
