#!/usr/bin/env node

/**
 * Check Upload Queue Status
 * 
 * This script checks the current status of the upload queue
 * and identifies any stuck jobs.
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Configuration - use DATABASE_URL from environment
const config = {
  connectionString: process.env.DATABASE_URL,
};

async function checkQueueStatus() {
  const pool = new Pool(config);
  
  try {
    console.log('🔍 Upload Queue Status Check');
    console.log('===========================\n');

    // 1. Check current queue status
    console.log('📊 Current Queue Status:');
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `;
    const statusResult = await pool.query(statusQuery);
    
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });
    console.log('');

    // 2. Check stuck jobs (inprocess for more than 1 hour)
    console.log('⚠️  Stuck Jobs Analysis:');
    const stuckQuery = `
      SELECT 
        id,
        file_name,
        status,
        upload_date,
        process_date,
        CASE 
          WHEN process_date IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (NOW() - process_date))/3600 
          ELSE NULL 
        END as hours_stuck,
        error,
        error_details
      FROM upload_queue 
      WHERE status = 'inprocess'
      ORDER BY process_date ASC
    `;
    const stuckResult = await pool.query(stuckQuery);
    
    if (stuckResult.rows.length === 0) {
      console.log('  ✅ No stuck jobs found');
    } else {
      console.log(`  ❌ Found ${stuckResult.rows.length} stuck jobs:`);
      stuckResult.rows.forEach(row => {
        const hoursStuck = row.hours_stuck ? parseFloat(row.hours_stuck).toFixed(1) : 'unknown';
        console.log(`    - ${row.file_name} (ID: ${row.id}) - Stuck for ${hoursStuck} hours`);
        if (row.error) {
          console.log(`      Error: ${row.error}`);
        }
      });
    }
    console.log('');

    // 3. Check system settings
    console.log('⚙️  System Settings:');
    const settingsQuery = `
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key IN ('maxConcurrentProcessors', 'resumeProcessingWebhookUrl', 'resumeProcessingWebhookTimeout')
      ORDER BY key
    `;
    const settingsResult = await pool.query(settingsQuery);
    
    if (settingsResult.rows.length === 0) {
      console.log('  ⚠️  No relevant system settings found');
    } else {
      settingsResult.rows.forEach(row => {
        console.log(`  ${row.key}: ${row.value}`);
      });
    }
    console.log('');

    // 4. Check recent activity
    console.log('📈 Recent Activity (last 10 jobs):');
    const recentQuery = `
      SELECT 
        id,
        file_name,
        status,
        upload_date,
        process_date,
        completed_date,
        error
      FROM upload_queue 
      ORDER BY upload_date DESC
      LIMIT 10
    `;
    const recentResult = await pool.query(recentQuery);
    
    recentResult.rows.forEach(row => {
      const statusIcon = row.status === 'success' ? '✅' : 
                        row.status === 'fail' ? '❌' : 
                        row.status === 'error' ? '💥' : 
                        row.status === 'inprocess' ? '⏳' : '⏸️';
      console.log(`  ${statusIcon} ${row.file_name} - ${row.status} (${row.upload_date})`);
      if (row.error) {
        console.log(`      Error: ${row.error}`);
      }
    });

  } catch (error) {
    console.error('❌ Error checking queue status:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure your database is running and DATABASE_URL is correct in .env.local');
    }
  } finally {
    await pool.end();
  }
}

checkQueueStatus();
