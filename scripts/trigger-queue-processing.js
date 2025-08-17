#!/usr/bin/env node

/**
 * Trigger Queue Processing
 * 
 * This script manually triggers the queue processing to test and debug
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

async function triggerQueueProcessing() {
  let pool;
  
  try {
    console.log('🚀 Trigger Queue Processing');
    console.log('==========================\n');

    pool = await getDbConnection();
    console.log('✅ Database connection established');

    // Check current status
    console.log('\n📊 Current queue status:');
    const statusResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });

    // Get the oldest queued job
    console.log('\n📋 Oldest queued job:');
    const oldestJobResult = await pool.query(`
      SELECT 
        id,
        file_name,
        status,
        upload_date,
        source,
        file_path
      FROM upload_queue 
      WHERE status = 'queued'
      ORDER BY upload_date ASC
      LIMIT 1
    `);
    
    if (oldestJobResult.rows.length === 0) {
      console.log('  ✅ No queued jobs to process');
      return;
    }

    const oldestJob = oldestJobResult.rows[0];
    console.log(`  File: ${oldestJob.file_name}`);
    console.log(`  ID: ${oldestJob.id}`);
    console.log(`  Upload Date: ${oldestJob.upload_date}`);
    console.log(`  Source: ${oldestJob.source}`);
    console.log(`  File Path: ${oldestJob.file_path}`);

    // Check webhook configuration
    console.log('\n🌐 Webhook Configuration:');
    const webhookResult = await pool.query(`
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key IN ('resumeProcessingWebhookUrl', 'resumeProcessingWebhookToken', 'resumeProcessingWebhookTimeout')
      ORDER BY key
    `);
    
    const webhookConfig = {};
    webhookResult.rows.forEach(row => {
      webhookConfig[row.key] = row.value;
    });
    
    console.log(`  URL: ${webhookConfig.resumeProcessingWebhookUrl}`);
    console.log(`  Token: ${webhookConfig.resumeProcessingWebhookToken ? 'Configured' : 'Not configured'}`);
    console.log(`  Timeout: ${webhookConfig.resumeProcessingWebhookTimeout || '1800'} seconds`);

    // Test webhook with a simple request
    console.log('\n🧪 Testing webhook with simple request...');
    try {
      const https = require('https');
      const http = require('http');
      
      const url = new URL(webhookConfig.resumeProcessingWebhookUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const testPayload = {
        test: true,
        message: "Testing webhook connectivity",
        timestamp: new Date().toISOString()
      };
      
      const testResult = await new Promise((resolve, reject) => {
        const req = client.request(url, { 
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${webhookConfig.resumeProcessingWebhookToken || ''}`
          },
          timeout: 10000 
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            resolve({ 
              status: res.statusCode, 
              accessible: true, 
              response: data,
              headers: res.headers
            });
          });
        });
        
        req.on('error', (error) => {
          resolve({ status: null, accessible: false, error: error.message });
        });
        
        req.on('timeout', () => {
          req.destroy();
          resolve({ status: null, accessible: false, error: 'Timeout' });
        });
        
        req.write(JSON.stringify(testPayload));
        req.end();
      });
      
      if (testResult.accessible) {
        console.log(`  ✅ Webhook responded with status: ${testResult.status}`);
        console.log(`  Response: ${testResult.response.substring(0, 200)}...`);
        console.log(`  Headers: ${JSON.stringify(testResult.headers, null, 2)}`);
        
        if (testResult.status === 404) {
          console.log('  ❌ Webhook endpoint not found (404)');
          console.log('  💡 Check if the webhook URL path is correct');
        } else if (testResult.status >= 500) {
          console.log('  ❌ Webhook server error (5xx)');
          console.log('  💡 Check your webhook service logs');
        }
      } else {
        console.log(`  ❌ Webhook error: ${testResult.error}`);
      }
    } catch (error) {
      console.log(`  ❌ Could not test webhook: ${error.message}`);
    }

    // Ask if user wants to try processing
    console.log('\n🔧 Manual Queue Processing:');
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('Do you want to try processing the oldest queued job? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Skipping manual processing');
      return;
    }

    // Try to process the oldest job manually
    console.log('\n🔄 Attempting to process oldest job...');
    
    // Update job to inprocess status
    await pool.query(`
      UPDATE upload_queue 
      SET 
        status = 'inprocess',
        process_date = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `, [oldestJob.id]);

    console.log(`✅ Updated job ${oldestJob.id} to inprocess status`);
    console.log('💡 Check your application logs for processing details');
    console.log('💡 The job should now be processed by your webhook service');

  } catch (error) {
    console.error('❌ Failed to trigger queue processing:', error.message);
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
triggerQueueProcessing().catch(console.error);
