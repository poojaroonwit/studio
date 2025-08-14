#!/usr/bin/env node

/**
 * Diagnose Webhook 504 Errors
 * 
 * This script helps diagnose and troubleshoot webhook 504 errors in bulk upload candidates.
 * It checks system settings, recent upload queue jobs, and provides recommendations.
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

async function diagnoseWebhook504() {
  try {
    log('🔍 Diagnosing webhook 504 errors in bulk upload candidates...', 'INFO');
    log('============================================================', 'INFO');
    
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
      const timeout = settings.resumeProcessingWebhookTimeout;
      const maxConcurrent = settings.maxConcurrentProcessors;
      
      log(`✅ Resume Processing Webhook URL: ${webhookUrl || 'NOT SET'}`, 'INFO');
      log(`✅ Webhook Token: ${webhookToken ? 'CONFIGURED' : 'NOT SET'}`, 'INFO');
      log(`✅ Response Mode: ${responseMode || 'blocking (default)'}`, 'INFO');
      log(`✅ Webhook Timeout: ${timeout || '7200 (default)'} seconds`, 'INFO');
      log(`✅ Max Concurrent Processors: ${maxConcurrent || '5 (default)'}`, 'INFO');
      
      // 2. Check recent upload queue jobs with 504 errors
      log('', 'INFO');
      log('2. Checking Recent Upload Queue Jobs:', 'INFO');
      log('------------------------------------', 'INFO');
      
      const queueUrl = `${config.baseUrl}/api/upload-queue`;
      const queueResponse = await makeRequest(queueUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
        }
      });

      if (queueResponse.status === 200) {
        const queueData = queueResponse.data;
        const jobs = queueData.jobs || [];
        
        // Filter jobs with 504 errors
        const jobsWith504 = jobs.filter(job => 
          job.error && job.error.includes('504') || 
          job.error_details && job.error_details.includes('504')
        );
        
        if (jobsWith504.length > 0) {
          log(`❌ Found ${jobsWith504.length} jobs with 504 errors:`, 'ERROR');
          jobsWith504.slice(0, 5).forEach((job, index) => {
            log(`   ${index + 1}. Job ID: ${job.id}`, 'ERROR');
            log(`      File: ${job.file_name}`, 'ERROR');
            log(`      Status: ${job.status}`, 'ERROR');
            log(`      Error: ${job.error}`, 'ERROR');
            log(`      Created: ${job.created_at}`, 'ERROR');
            log('', 'ERROR');
          });
          
          if (jobsWith504.length > 5) {
            log(`   ... and ${jobsWith504.length - 5} more jobs with 504 errors`, 'ERROR');
          }
        } else {
          log('✅ No recent jobs with 504 errors found', 'INFO');
        }
        
        // Check current processing jobs
        const processingJobs = jobs.filter(job => job.status === 'inprocess');
        log(`ℹ️  Currently processing: ${processingJobs.length} jobs`, 'INFO');
        
        // Check queued jobs
        const queuedJobs = jobs.filter(job => job.status === 'queued');
        log(`ℹ️  Queued for processing: ${queuedJobs.length} jobs`, 'INFO');
        
      } else {
        log('❌ Failed to fetch upload queue data', 'ERROR');
      }
      
      // 3. Test webhook connectivity
      log('', 'INFO');
      log('3. Testing Webhook Connectivity:', 'INFO');
      log('-------------------------------', 'INFO');
      
      if (webhookUrl) {
        try {
          const testPayload = {
            inputs: {
              test: true,
              timestamp: new Date().toISOString(),
              message: "This is a connectivity test from NCC Candidate Management System"
            },
            response_mode: 'blocking',
            user: 'system-test'
          };
          
          const headers = { 'Content-Type': 'application/json' };
          if (webhookToken) {
            headers['Authorization'] = `Bearer ${webhookToken}`;
          }
          
          log(`Testing webhook URL: ${webhookUrl}`, 'INFO');
          
          const startTime = Date.now();
          const testResponse = await makeRequest(webhookUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(testPayload)
          });
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          if (testResponse.status === 200) {
            log(`✅ Webhook test successful! Response time: ${responseTime}ms`, 'INFO');
          } else {
            log(`❌ Webhook test failed with status ${testResponse.status}`, 'ERROR');
            log(`   Response time: ${responseTime}ms`, 'ERROR');
          }
          
        } catch (error) {
          log(`❌ Webhook test failed: ${error.message}`, 'ERROR');
        }
      } else {
        log('❌ No webhook URL configured for testing', 'ERROR');
      }
      
      // 4. Recommendations
      log('', 'INFO');
      log('4. Recommendations:', 'INFO');
      log('------------------', 'INFO');
      
      if (jobsWith504.length > 0) {
        log('🔧 Based on the analysis, here are recommendations to fix 504 errors:', 'INFO');
        log('', 'INFO');
        
        log('1. Check External Service Status:', 'INFO');
        log('   - Verify the external webhook service is running and accessible', 'INFO');
        log('   - Check if the service has any known issues or maintenance windows', 'INFO');
        log('', 'INFO');
        
        log('2. Adjust Timeout Settings:', 'INFO');
        log(`   - Current timeout: ${timeout || 7200} seconds`, 'INFO');
        log('   - If the external service is slow but reliable, consider increasing the timeout', 'INFO');
        log('   - If the service is consistently fast, you can reduce the timeout', 'INFO');
        log('', 'INFO');
        
        log('3. Reduce Concurrent Processing:', 'INFO');
        log(`   - Current max concurrent: ${maxConcurrent || 5}`, 'INFO');
        log('   - Try reducing this to 1-2 to reduce load on the external service', 'INFO');
        log('', 'INFO');
        
        log('4. Check Network Connectivity:', 'INFO');
        log('   - Ensure stable network connection between your server and the external service', 'INFO');
        log('   - Check for any firewall or proxy issues', 'INFO');
        log('', 'INFO');
        
        log('5. Monitor and Retry:', 'INFO');
        log('   - Failed jobs can be retried manually from the upload queue interface', 'INFO');
        log('   - Monitor the queue for patterns in 504 errors', 'INFO');
        log('', 'INFO');
        
        log('6. Contact Service Provider:', 'INFO');
        log('   - If 504 errors persist, contact the external service provider', 'INFO');
        log('   - Provide them with the error details and request investigation', 'INFO');
        
      } else {
        log('✅ No immediate issues detected. The system appears to be working correctly.', 'INFO');
        log('', 'INFO');
        log('💡 Preventive measures:', 'INFO');
        log('   - Monitor the upload queue regularly', 'INFO');
        log('   - Keep timeout settings appropriate for your external service', 'INFO');
        log('   - Consider implementing retry logic for failed jobs', 'INFO');
      }
      
    } else {
      log('❌ Failed to fetch system settings', 'ERROR');
    }
    
  } catch (error) {
    log(`❌ Error during diagnosis: ${error.message}`, 'ERROR');
    console.error(error);
  }
}

// Run the diagnosis
diagnoseWebhook504().then(() => {
  log('Diagnosis complete', 'INFO');
  process.exit(0);
}).catch((error) => {
  log(`Diagnosis failed: ${error.message}`, 'ERROR');
  process.exit(1);
});
