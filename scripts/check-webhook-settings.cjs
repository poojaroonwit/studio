#!/usr/bin/env node

/**
 * Check Webhook Settings
 * 
 * This script checks if the webhook settings are properly configured in the system.
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  apiKey: process.env.PROCESSOR_API_KEY || 'dev-key',
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000); // 10 second timeout

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function checkWebhookSettings() {
  try {
    log('Checking webhook settings...', 'INFO');
    
    // Check system settings
    const settingsUrl = `${config.baseUrl}/api/settings/system-settings`;
    const settingsResponse = await makeRequest(settingsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      }
    });

    if (settingsResponse.status === 200) {
      const settings = settingsResponse.data;
      
      log('System Settings Check:', 'INFO');
      log('====================', 'INFO');
      
      // Check webhook URL
      const webhookUrl = settings.resumeProcessingWebhookUrl;
      if (webhookUrl) {
        log(`✅ Webhook URL: ${webhookUrl}`, 'INFO');
      } else {
        log('❌ Webhook URL: NOT CONFIGURED', 'ERROR');
        log('   Please configure resumeProcessingWebhookUrl in System Settings', 'ERROR');
      }
      
      // Check webhook token
      const webhookToken = settings.resumeProcessingWebhookToken;
      if (webhookToken) {
        log('✅ Webhook Token: CONFIGURED', 'INFO');
      } else {
        log('❌ Webhook Token: NOT CONFIGURED', 'ERROR');
        log('   Please configure resumeProcessingWebhookToken in System Settings', 'ERROR');
      }
      
      // Check response mode
      const responseMode = settings.resumeProcessingWebhookResponseMode;
      log(`ℹ️  Response Mode: ${responseMode || 'blocking (default)'}`, 'INFO');
      
      // Check max concurrent processors
      const maxConcurrent = settings.maxConcurrentProcessors;
      log(`ℹ️  Max Concurrent Processors: ${maxConcurrent || '5 (default)'}`, 'INFO');
      
      // Check environment variables as fallback
      log('Environment Variables Check:', 'INFO');
      log('==========================', 'INFO');
      
      const envWebhookUrl = process.env.RESUME_PROCESSING_WEBHOOK_URL;
      if (envWebhookUrl) {
        log(`ℹ️  ENV Webhook URL: ${envWebhookUrl}`, 'INFO');
      } else {
        log('ℹ️  ENV Webhook URL: NOT SET', 'INFO');
      }
      
      const envWebhookToken = process.env.RESUME_PROCESSING_WEBHOOK_TOKEN;
      if (envWebhookToken) {
        log('ℹ️  ENV Webhook Token: SET', 'INFO');
      } else {
        log('ℹ️  ENV Webhook Token: NOT SET', 'INFO');
      }
      
      // Summary
      log('Summary:', 'INFO');
      log('=======', 'INFO');
      
      if (webhookUrl) {
        log('✅ Webhook is properly configured in system settings', 'INFO');
        log('✅ Jobs will be sent to the configured webhook', 'INFO');
      } else if (envWebhookUrl) {
        log('⚠️  Webhook URL is configured via environment variable (fallback)', 'WARN');
        log('⚠️  Consider moving to system settings for better management', 'WARN');
      } else {
        log('❌ No webhook URL configured anywhere', 'ERROR');
        log('❌ Jobs will fail with "webhook not configured" error', 'ERROR');
        log('❌ Please configure webhook URL in System Settings', 'ERROR');
      }
      
    } else {
      log(`Failed to fetch system settings: HTTP ${settingsResponse.status}`, 'ERROR');
      log(JSON.stringify(settingsResponse.data), 'ERROR');
    }
    
  } catch (error) {
    log(`Error checking webhook settings: ${error.message}`, 'ERROR');
  }
}

// Run the check
checkWebhookSettings(); 