#!/usr/bin/env node

/**
 * Check Queue Issues
 * 
 * This script checks why queued jobs are not being processed
 */

// Try to load environment variables
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, continue
}

async function getDbConnection() {
  try {
    const { Pool } = require('pg');
    
    const config = {
      host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
      port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
      database: process.env.DB_NAME || process.env.POSTGRES_DB || 'studio8',
      user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
      password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'password',
    };

    return new Pool(config);
  } catch (e) {
    throw new Error(`Failed to create database connection: ${e.message}`);
  }
}

async function checkQueueIssues() {
  let pool;
  
  try {
    console.log('🔍 Check Queue Issues');
    console.log('====================\n');

    pool = await getDbConnection();
    console.log('✅ Database connection established');

    // 1. Check system settings
    console.log('\n⚙️  System Settings:');
    const settingsResult = await pool.query(`
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key IN ('maxConcurrentProcessors', 'resumeProcessingWebhookUrl', 'resumeProcessingWebhookToken', 'resumeProcessingWebhookTimeout')
      ORDER BY key
    `);
    
    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    console.log(`  Max Concurrent Processors: ${settings.maxConcurrentProcessors || '5 (default)'}`);
    console.log(`  Webhook URL: ${settings.resumeProcessingWebhookUrl || 'Not configured'}`);
    console.log(`  Webhook Token: ${settings.resumeProcessingWebhookToken ? 'Configured' : 'Not configured'}`);
    console.log(`  Webhook Timeout: ${settings.resumeProcessingWebhookTimeout || '1800 (default 30 minutes)'} seconds`);

    // 2. Check failed jobs
    console.log('\n🚨 Failed Jobs:');
    const failedJobsResult = await pool.query(`
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
      ORDER BY upload_date DESC
      LIMIT 5
    `);
    
    if (failedJobsResult.rows.length === 0) {
      console.log('  ✅ No failed jobs found');
    } else {
      console.log(`  Found ${failedJobsResult.rows.length} failed jobs:`);
      failedJobsResult.rows.forEach(job => {
        console.log(`    - ${job.file_name}`);
        console.log(`      Error: ${job.error || 'No error message'}`);
        if (job.error_details) {
          console.log(`      Details: ${job.error_details.substring(0, 100)}...`);
        }
      });
    }

    // 3. Check queued jobs
    console.log('\n📋 Queued Jobs:');
    const queuedJobsResult = await pool.query(`
      SELECT 
        id,
        file_name,
        status,
        upload_date,
        process_date,
        source
      FROM upload_queue 
      WHERE status = 'queued'
      ORDER BY upload_date ASC
      LIMIT 5
    `);
    
    console.log(`  Found ${queuedJobsResult.rows.length} queued jobs (showing first 5):`);
    queuedJobsResult.rows.forEach(job => {
      const uploadTime = new Date(job.upload_date).toLocaleString();
      console.log(`    - ${job.file_name} (uploaded: ${uploadTime}, source: ${job.source || 'unknown'})`);
    });

    // 4. Check if there are any in-process jobs blocking the queue
    console.log('\n🔍 Checking for blocking issues:');
    const inProcessResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM upload_queue 
      WHERE status = 'inprocess'
    `);
    
    const inProcessCount = parseInt(inProcessResult.rows[0].count);
    console.log(`  In-process jobs: ${inProcessCount}`);
    
    if (inProcessCount > 0) {
      console.log('  ⚠️  There are in-process jobs that might be blocking the queue');
    } else {
      console.log('  ✅ No in-process jobs blocking the queue');
    }

    // 5. Check webhook configuration
    console.log('\n🌐 Webhook Configuration:');
    if (!settings.resumeProcessingWebhookUrl) {
      console.log('  ❌ No webhook URL configured - jobs will fail');
      console.log('  💡 Configure a webhook URL in Admin → System Settings → Automation');
    } else {
      console.log('  ✅ Webhook URL is configured');
      
      // Test webhook connectivity
      console.log('  🔍 Testing webhook connectivity...');
      try {
        const https = require('https');
        const http = require('http');
        
        const url = new URL(settings.resumeProcessingWebhookUrl);
        const client = url.protocol === 'https:' ? https : http;
        
        const testResult = await new Promise((resolve, reject) => {
          const req = client.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
            resolve({ status: res.statusCode, accessible: true });
          });
          
          req.on('error', (error) => {
            resolve({ status: null, accessible: false, error: error.message });
          });
          
          req.on('timeout', () => {
            req.destroy();
            resolve({ status: null, accessible: false, error: 'Timeout' });
          });
          
          req.end();
        });
        
        if (testResult.accessible) {
          console.log(`  ✅ Webhook is accessible (Status: ${testResult.status})`);
        } else {
          console.log(`  ❌ Webhook is not accessible: ${testResult.error}`);
        }
      } catch (error) {
        console.log(`  ❌ Could not test webhook: ${error.message}`);
      }
    }

    // 6. Recommendations
    console.log('\n💡 Recommendations:');
    
    if (!settings.resumeProcessingWebhookUrl) {
      console.log('  1. Configure a webhook URL in Admin → System Settings → Automation');
    }
    
    if (inProcessCount > 0) {
      console.log('  2. Reset any stuck in-process jobs');
    }
    
    if (failedJobsResult.rows.length > 0) {
      console.log('  3. Check the error messages from failed jobs');
      console.log('  4. Verify your webhook service is working correctly');
    }
    
    console.log('  5. Try manually triggering the queue processing');
    console.log('  6. Check if the processor service is running');

  } catch (error) {
    console.error('❌ Failed to check queue issues:', error.message);
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (e) {
        // Ignore pool end errors
      }
    }
  }
}

// Run the script
checkQueueIssues().catch(console.error);
