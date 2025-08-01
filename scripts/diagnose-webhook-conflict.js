#!/usr/bin/env node

/**
 * Diagnose Webhook Conflict Issues
 * 
 * This script helps identify potential conflicts between different webhook systems
 * that might be causing 504 errors.
 */

import https from 'https';
import http from 'http';

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

async function diagnoseWebhookConflicts() {
  try {
    log('🔍 Diagnosing webhook conflicts and 504 issues...', 'INFO');
    log('================================================', 'INFO');
    
    // 1. Check system settings
    log('1. Checking System Settings:', 'INFO');
    log('----------------------------', 'INFO');
    
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
      
      const webhookUrl = settings.resumeProcessingWebhookUrl;
      const webhookToken = settings.resumeProcessingWebhookToken;
      const responseMode = settings.resumeProcessingWebhookResponseMode;
      const maxConcurrent = settings.maxConcurrentProcessors;
      
      log(`✅ Resume Processing Webhook URL: ${webhookUrl || 'NOT SET'}`, 'INFO');
      log(`✅ Webhook Token: ${webhookToken ? 'CONFIGURED' : 'NOT SET'}`, 'INFO');
      log(`✅ Response Mode: ${responseMode || 'blocking (default)'}`, 'INFO');
      log(`✅ Max Concurrent Processors: ${maxConcurrent || '5 (default)'}`, 'INFO');
      
      // 2. Check for potential conflicts
      log('', 'INFO');
      log('2. Checking for Potential Conflicts:', 'INFO');
      log('-----------------------------------', 'INFO');
      
      if (webhookUrl) {
        // Check if this URL might be used by external webhooks too
        log(`🔍 Analyzing webhook URL: ${webhookUrl}`, 'INFO');
        
        if (webhookUrl.includes('ncc') || webhookUrl.includes('dify') || webhookUrl.includes('workflow')) {
          log('⚠️  WARNING: This appears to be a workflow service URL', 'WARN');
          log('⚠️  External webhooks might be calling the same service', 'WARN');
          log('⚠️  This could cause resource conflicts and 504 errors', 'WARN');
        }
      }
      
      // 3. Check recent upload queue errors
      log('', 'INFO');
      log('3. Checking Recent Upload Queue Errors:', 'INFO');
      log('----------------------------------------', 'INFO');
      
      const queueUrl = `${config.baseUrl}/api/upload-queue?limit=10&status=error,fail`;
      const queueResponse = await makeRequest(queueUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
        }
      });
      
      if (queueResponse.status === 200) {
        const queueData = queueResponse.data;
        const errorJobs = queueData.data || [];
        
        if (errorJobs.length > 0) {
          log(`📊 Found ${errorJobs.length} recent error jobs:`, 'INFO');
          
          const errorJobs504 = errorJobs.filter(job => 
            job.error && job.error.includes('504')
          );
          
          if (errorJobs504.length > 0) {
            log(`❌ ${errorJobs504.length} jobs with 504 errors:`, 'ERROR');
            errorJobs504.forEach(job => {
              log(`   - Job ${job.id}: ${job.file_name}`, 'ERROR');
              log(`     Error: ${job.error}`, 'ERROR');
              log(`     Details: ${job.error_details}`, 'ERROR');
            });
          } else {
            log('✅ No recent 504 errors found', 'INFO');
          }
        } else {
          log('✅ No recent error jobs found', 'INFO');
        }
      }
      
      // 4. Recommendations
      log('', 'INFO');
      log('4. Recommendations:', 'INFO');
      log('------------------', 'INFO');
      
      if (webhookUrl && (webhookUrl.includes('ncc') || webhookUrl.includes('dify'))) {
        log('🔧 RECOMMENDED ACTIONS:', 'INFO');
        log('1. Check if external webhooks are configured to call the same service', 'INFO');
        log('2. Review webhook configurations in the Webhook table', 'INFO');
        log('3. Consider implementing duplicate processing prevention', 'INFO');
        log('4. Monitor external service logs for resource exhaustion', 'INFO');
        log('5. Check if the external service has rate limits', 'INFO');
      }
      
      log('', 'INFO');
      log('5. Quick Fixes:', 'INFO');
      log('---------------', 'INFO');
      log('✅ Duplicate processing prevention has been implemented', 'INFO');
      log('✅ Timeout increased to 2 hours (configurable)', 'INFO');
      log('✅ Retry logic added for 504 errors', 'INFO');
      log('✅ Better error messages for debugging', 'INFO');
      
    } else {
      log(`❌ Failed to fetch system settings: HTTP ${settingsResponse.status}`, 'ERROR');
    }
    
  } catch (error) {
    log(`❌ Error during diagnosis: ${error.message}`, 'ERROR');
    log('💡 Make sure the server is running and accessible', 'INFO');
  }
}

// Run the diagnosis
diagnoseWebhookConflicts(); 