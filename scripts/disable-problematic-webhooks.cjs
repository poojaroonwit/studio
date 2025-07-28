#!/usr/bin/env node

/**
 * Disable Problematic Webhooks
 * 
 * This script disables webhooks that are configured to use environment URLs
 * instead of system settings, to prevent conflicts.
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

async function disableProblematicWebhooks() {
  try {
    log('Checking for problematic webhooks...', 'INFO');
    
    // Get all webhooks
    const webhooksUrl = `${config.baseUrl}/api/settings/webhooks`;
    const webhooksResponse = await makeRequest(webhooksUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      }
    });

    if (webhooksResponse.status === 200) {
      const webhooks = webhooksResponse.data;
      
      log(`Found ${webhooks.length} webhooks`, 'INFO');
      
      let disabledCount = 0;
      
      for (const webhook of webhooks) {
        // Check if webhook is active and uses problematic URLs
        const problematicUrls = [
          'ncc-dify.qsncc.com',
          'https://ncc-dify.qsncc.com',
          'http://ncc-dify.qsncc.com'
        ];
        
        const isProblematic = problematicUrls.some(url => 
          webhook.url && webhook.url.includes(url)
        );
        
        if (webhook.is_active && isProblematic) {
          log(`Found problematic webhook: ${webhook.name} (${webhook.url})`, 'WARN');
          
          // Disable the webhook
          const disableUrl = `${config.baseUrl}/api/settings/webhooks/${webhook.id}`;
          const disableResponse = await makeRequest(disableUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.apiKey,
            },
            body: JSON.stringify({
              is_active: false,
              name: `${webhook.name} (DISABLED - Use System Settings)`
            })
          });
          
          if (disableResponse.status === 200) {
            log(`✅ Disabled webhook: ${webhook.name}`, 'INFO');
            disabledCount++;
          } else {
            log(`❌ Failed to disable webhook: ${webhook.name}`, 'ERROR');
          }
        }
      }
      
      if (disabledCount === 0) {
        log('✅ No problematic webhooks found', 'INFO');
      } else {
        log(`✅ Disabled ${disabledCount} problematic webhooks`, 'INFO');
      }
      
    } else {
      log(`Failed to fetch webhooks: HTTP ${webhooksResponse.status}`, 'ERROR');
    }
    
  } catch (error) {
    log(`Error disabling problematic webhooks: ${error.message}`, 'ERROR');
  }
}

// Run the script
disableProblematicWebhooks(); 