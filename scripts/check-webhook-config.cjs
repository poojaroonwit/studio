#!/usr/bin/env node

const { Client } = require('pg');

async function checkWebhookConfig() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔍 Webhook Configuration Diagnostic\n');

    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log(`   RESUME_PROCESSING_WEBHOOK_URL: ${process.env.RESUME_PROCESSING_WEBHOOK_URL || 'NOT SET'}`);
    console.log(`   RESUME_PROCESSING_WEBHOOK_TOKEN: ${process.env.RESUME_PROCESSING_WEBHOOK_TOKEN ? '***SET***' : 'NOT SET'}`);
    console.log();

    // Check database settings
    console.log('🗄️  Database System Settings:');
    const settingsQuery = `
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key IN ('resumeProcessingWebhookUrl', 'resumeProcessingWebhookToken', 'resumeProcessingWebhookResponseMode')
      ORDER BY key
    `;
    
    const settingsResult = await client.query(settingsQuery);
    if (settingsResult.rows.length === 0) {
      console.log('   No webhook settings found in database');
    } else {
      settingsResult.rows.forEach(row => {
        const value = row.key.includes('Token') ? '***SET***' : (row.value || 'NOT SET');
        console.log(`   ${row.key}: ${value}`);
      });
    }
    console.log();

    // Check recent upload queue jobs with webhook issues
    console.log('📋 Recent Upload Queue Jobs:');
    const queueQuery = `
      SELECT id, file_name, status, error, error_details, created_at
      FROM upload_queue 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    const queueResult = await client.query(queueQuery);
    if (queueResult.rows.length === 0) {
      console.log('   No recent upload queue jobs found');
    } else {
      queueResult.rows.forEach((job, index) => {
        console.log(`   ${index + 1}. File: ${job.file_name}`);
        console.log(`      Status: ${job.status}`);
        console.log(`      Created: ${job.created_at}`);
        if (job.error) {
          console.log(`      Error: ${job.error}`);
        }
        if (job.error_details && job.error_details.includes('Webhook URL')) {
          console.log(`      Details: ${job.error_details}`);
        }
        console.log();
      });
    }

    // Test webhook URL validation logic
    console.log('🧪 Webhook URL Validation Test:');
    
    // Get the actual webhook URL using the same logic as the code
    let resumeWebhookUrl = null;
    const dbSetting = settingsResult.rows.find(row => row.key === 'resumeProcessingWebhookUrl');
    if (dbSetting && dbSetting.value) {
      resumeWebhookUrl = dbSetting.value;
      console.log(`   Using database setting: ${resumeWebhookUrl}`);
    } else {
      resumeWebhookUrl = process.env.RESUME_PROCESSING_WEBHOOK_URL || '';
      console.log(`   Using environment variable: ${resumeWebhookUrl || 'NOT SET'}`);
    }
    
    if (resumeWebhookUrl && resumeWebhookUrl.startsWith('http')) {
      console.log('   ✅ Webhook URL validation: PASSED');
      console.log(`   URL starts with http: ${resumeWebhookUrl.startsWith('http')}`);
      console.log(`   URL starts with https: ${resumeWebhookUrl.startsWith('https')}`);
    } else {
      console.log('   ❌ Webhook URL validation: FAILED');
      console.log(`   URL value: "${resumeWebhookUrl}"`);
      console.log(`   URL starts with http: ${resumeWebhookUrl ? resumeWebhookUrl.startsWith('http') : 'N/A'}`);
    }
    console.log();

    // Test success detection patterns
    console.log('🎯 Success Detection Pattern Test:');
    const testResponses = [
      {
        name: 'Your Success Response Pattern',
        response: {
          data: {
            status: 'succeeded',
            error: ''
          }
        }
      },
      {
        name: 'Alternative Success Pattern 1',
        response: {
          status: 'succeeded'
        }
      },
      {
        name: 'Alternative Success Pattern 2',
        response: {
          data: {
            status: 'succeeded'
          }
        }
      },
      {
        name: 'Error Pattern',
        response: {
          data: {
            status: 'failed',
            error: 'Something went wrong'
          }
        }
      }
    ];

    testResponses.forEach(test => {
      const webhookResJson = test.response;
      const isSuccess = (
        webhookResJson?.data?.status === 'succeeded' ||
        webhookResJson?.status === 'succeeded' ||
        (webhookResJson?.data?.status === 'succeeded' && webhookResJson?.data?.error === '') ||
        (webhookResJson?.status === 'succeeded' && webhookResJson?.error === '')
      );
      
      const isError = (
        (webhookResJson?.data?.status === 'failed' && webhookResJson?.data?.error) ||
        (webhookResJson?.status === 'failed' && webhookResJson?.error) ||
        (webhookResJson?.data?.error && webhookResJson?.data?.error !== '') ||
        (webhookResJson?.error && webhookResJson?.error !== '')
      );

      console.log(`   ${test.name}:`);
      console.log(`     Success detected: ${isSuccess ? '✅' : '❌'}`);
      console.log(`     Error detected: ${isError ? '✅' : '❌'}`);
      console.log(`     Response: ${JSON.stringify(test.response)}`);
      console.log();
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  checkWebhookConfig().catch(console.error);
}

module.exports = { checkWebhookConfig }; 