#!/usr/bin/env node

/**
 * Upload Queue Diagnostic Script
 * 
 * This script helps diagnose issues with the upload queue getting stuck.
 * It checks the current state of jobs, system settings, and provides recommendations.
 */

const { Pool } = require('pg');

// Configuration - update these values for your environment
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'studio8',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

async function diagnoseUploadQueue() {
  const pool = new Pool(config);
  
  try {
    console.log('🔍 Upload Queue Diagnostic Report');
    console.log('=====================================\n');

    // 1. Check current job statuses
    console.log('📊 Current Job Status Summary:');
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        MIN(upload_date) as oldest_job,
        MAX(upload_date) as newest_job
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `;
    const statusResult = await pool.query(statusQuery);
    
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
      if (row.oldest_job) {
        console.log(`    Oldest: ${row.oldest_job}`);
        console.log(`    Newest: ${row.newest_job}`);
      }
    });
    console.log('');

    // 2. Check stuck jobs (inprocess for more than 1 hour)
    console.log('⚠️  Potentially Stuck Jobs (inprocess > 1 hour):');
    const stuckQuery = `
      SELECT 
        id,
        file_name,
        status,
        upload_date,
        process_date,
        EXTRACT(EPOCH FROM (NOW() - process_date))/3600 as hours_stuck,
        error,
        error_details
      FROM upload_queue 
      WHERE status = 'inprocess' 
      AND process_date < NOW() - INTERVAL '1 hour'
      ORDER BY process_date ASC
    `;
    const stuckResult = await pool.query(stuckQuery);
    
    if (stuckResult.rows.length === 0) {
      console.log('  ✅ No stuck jobs found');
    } else {
      stuckResult.rows.forEach(row => {
        console.log(`  🔴 Job ${row.id}: ${row.file_name}`);
        console.log(`     Stuck for: ${row.hours_stuck.toFixed(1)} hours`);
        console.log(`     Process date: ${row.process_date}`);
        if (row.error) {
          console.log(`     Error: ${row.error}`);
        }
        console.log('');
      });
    }

    // 3. Check system settings
    console.log('⚙️  System Settings:');
    const settingsQuery = `
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key IN ('maxConcurrentProcessors', 'resumeProcessingWebhookUrl', 'resumeProcessingWebhookTimeout')
      ORDER BY key
    `;
    const settingsResult = await pool.query(settingsQuery);
    
    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    console.log(`  Max Concurrent Processors: ${settings.maxConcurrentProcessors || '5 (default)'}`);
    console.log(`  Webhook URL: ${settings.resumeProcessingWebhookUrl || 'Not configured'}`);
    console.log(`  Webhook Timeout: ${settings.resumeProcessingWebhookTimeout || '7200 (default 2 hours)'} seconds`);
    console.log('');

    // 4. Check recent errors
    console.log('🚨 Recent Errors (last 24 hours):');
    const errorsQuery = `
      SELECT 
        id,
        file_name,
        status,
        error,
        error_details,
        upload_date,
        completed_date
      FROM upload_queue 
      WHERE (error IS NOT NULL OR status = 'error')
      AND upload_date > NOW() - INTERVAL '24 hours'
      ORDER BY upload_date DESC
      LIMIT 10
    `;
    const errorsResult = await pool.query(errorsQuery);
    
    if (errorsResult.rows.length === 0) {
      console.log('  ✅ No recent errors found');
    } else {
      errorsResult.rows.forEach(row => {
        console.log(`  ❌ Job ${row.id}: ${row.file_name}`);
        console.log(`     Status: ${row.status}`);
        console.log(`     Error: ${row.error || 'No error message'}`);
        if (row.error_details) {
          console.log(`     Details: ${row.error_details.substring(0, 100)}...`);
        }
        console.log('');
      });
    }

    // 5. Check webhook connectivity (if configured)
    if (settings.resumeProcessingWebhookUrl) {
      console.log('🌐 Webhook Connectivity Test:');
      try {
        const response = await fetch(settings.resumeProcessingWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.resumeProcessingWebhookToken || 'no-token'}`
          },
          body: JSON.stringify({
            test: true,
            timestamp: new Date().toISOString()
          }),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        console.log(`  ✅ Webhook accessible: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.log(`  ❌ Webhook error: ${error.message}`);
      }
      console.log('');
    }

    // 6. Recommendations
    console.log('💡 Recommendations:');
    
    const inProcessCount = statusResult.rows.find(r => r.status === 'inprocess')?.count || 0;
    const maxConcurrent = parseInt(settings.maxConcurrentProcessors || '5');
    
    if (inProcessCount >= maxConcurrent) {
      console.log('  🔴 All processing slots are occupied. Consider:');
      console.log('     - Resetting stuck jobs manually');
      console.log('     - Reducing maxConcurrentProcessors setting');
      console.log('     - Checking webhook service status');
    }
    
    if (stuckResult.rows.length > 0) {
      console.log('  🔴 Stuck jobs detected. Consider:');
      console.log('     - Manually resetting stuck jobs to "queued" status');
      console.log('     - Checking webhook timeout settings');
      console.log('     - Verifying external service availability');
    }
    
    if (!settings.resumeProcessingWebhookUrl) {
      console.log('  ⚠️  No webhook URL configured. Jobs will fail without processing.');
    }
    
    console.log('  📝 General recommendations:');
    console.log('     - Monitor webhook response times');
    console.log('     - Set appropriate timeout values');
    console.log('     - Implement retry logic for failed jobs');
    console.log('     - Consider reducing concurrent processing during high load');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the diagnostic
diagnoseUploadQueue().catch(console.error);
