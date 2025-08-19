#!/usr/bin/env node

/**
 * Fix Webhook Configuration
 * 
 * This script fixes the webhook configuration by updating system settings.
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

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

async function fixWebhookConfig() {
  try {
    log('🔧 Fixing webhook configuration...', 'INFO');
    
    // First, check current settings
    const settingsUrl = `${config.baseUrl}/api/settings/system-settings`;
    const settingsResponse = await makeRequest(settingsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      }
    });

    if (settingsResponse.status !== 200) {
      log(`❌ Failed to fetch current settings: HTTP ${settingsResponse.status}`, 'ERROR');
      return;
    }

    const currentSettings = settingsResponse.data;
    log('Current webhook settings:', 'INFO');
    log(`  URL: ${currentSettings.resumeProcessingWebhookUrl || 'NOT SET'}`, 'INFO');
    log(`  Token: ${currentSettings.resumeProcessingWebhookToken ? 'SET' : 'NOT SET'}`, 'INFO');
    
    // Check if webhook URL needs fixing
    const currentUrl = currentSettings.resumeProcessingWebhookUrl;
    let needsUpdate = false;
    let newUrl = currentUrl;
    
    if (currentUrl && currentUrl.includes('n8n:8921')) {
      // Fix Docker hostname to localhost
      newUrl = currentUrl.replace('n8n:8921', 'localhost:8921');
      needsUpdate = true;
      log(`⚠️  Found Docker hostname in webhook URL, will fix to: ${newUrl}`, 'WARN');
    }
    
    if (!currentUrl) {
      // Set default webhook URL
      newUrl = 'http://localhost:8921/webhook/exe-process';
      needsUpdate = true;
      log(`⚠️  No webhook URL configured, will set to: ${newUrl}`, 'WARN');
    }
    
    if (!needsUpdate) {
      log('✅ Webhook configuration looks good', 'INFO');
      return;
    }
    
    // Update the webhook URL
    const updateUrl = `${config.baseUrl}/api/settings/system-settings`;
    const updateData = [
      { key: 'resumeProcessingWebhookUrl', value: newUrl }
    ];
    
    log(`🔄 Updating webhook URL to: ${newUrl}`, 'INFO');
    
    const updateResponse = await makeRequest(updateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
      body: JSON.stringify(updateData)
    });

    if (updateResponse.status === 200) {
      log('✅ Webhook URL updated successfully', 'INFO');
    } else {
      log(`❌ Failed to update webhook URL: HTTP ${updateResponse.status}`, 'ERROR');
      log(JSON.stringify(updateResponse.data), 'ERROR');
    }
    
    // Test the webhook URL
    log('🧪 Testing webhook URL...', 'INFO');
    try {
      const testResponse = await makeRequest(newUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (testResponse.status === 200 || testResponse.status === 404) {
        log('✅ Webhook URL is accessible', 'INFO');
      } else {
        log(`⚠️  Webhook URL returned status: ${testResponse.status}`, 'WARN');
      }
    } catch (error) {
      log(`❌ Webhook URL is not accessible: ${error.message}`, 'ERROR');
      log('   Make sure n8n is running and the webhook endpoint exists', 'ERROR');
    }
    
  } catch (error) {
    log(`❌ Error fixing webhook configuration: ${error.message}`, 'ERROR');
  }
}

// Run the fix
fixWebhookConfig(); 