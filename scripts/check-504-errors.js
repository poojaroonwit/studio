#!/usr/bin/env node

/**
 * Check 504 Errors
 * 
 * This script checks for recent 504 errors in the upload queue
 * and provides diagnostic information.
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

async function check504Errors() {
  try {
    log('🔍 Checking for recent 504 errors...', 'INFO');
    log('====================================', 'INFO');
    
    // Check recent upload queue errors
    const queueUrl = `${config.baseUrl}/api/upload-queue?limit=50&status=error,fail`;
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
          
          // Group by time to see patterns
          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
          const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
          
          const recent504 = errorJobs504.filter(job => {
            const completedDate = new Date(job.completed_date);
            return completedDate > tenMinutesAgo;
          });
          
          const lastHour504 = errorJobs504.filter(job => {
            const completedDate = new Date(job.completed_date);
            return completedDate > oneHourAgo;
          });
          
          log(`   - Last 10 minutes: ${recent504.length} 504 errors`, 'ERROR');
          log(`   - Last hour: ${lastHour504.length} 504 errors`, 'ERROR');
          
          // Show details of recent errors
          recent504.slice(0, 5).forEach(job => {
            log(`   - Job ${job.id}: ${job.file_name}`, 'ERROR');
            log(`     Error: ${job.error}`, 'ERROR');
            log(`     Details: ${job.error_details}`, 'ERROR');
            log(`     Completed: ${job.completed_date}`, 'ERROR');
          });
          
          if (recent504.length >= 5) {
            log('', 'WARN');
            log('⚠️  WARNING: High number of 504 errors detected!', 'WARN');
            log('⚠️  The external service appears to be overloaded.', 'WARN');
            log('⚠️  Circuit breaker may be activated.', 'WARN');
          }
        } else {
          log('✅ No recent 504 errors found', 'INFO');
        }
        
        // Check for other error patterns
        const otherErrors = errorJobs.filter(job => 
          job.error && !job.error.includes('504')
        );
        
        if (otherErrors.length > 0) {
          log('', 'INFO');
          log('📊 Other error types found:', 'INFO');
          const errorTypes = {};
          otherErrors.forEach(job => {
            const errorType = job.error.split(' ')[0];
            errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
          });
          
          Object.entries(errorTypes).forEach(([type, count]) => {
            log(`   - ${type}: ${count} errors`, 'INFO');
          });
        }
      } else {
        log('✅ No recent error jobs found', 'INFO');
      }
    } else {
      log(`❌ Failed to fetch queue data: HTTP ${queueResponse.status}`, 'ERROR');
    }
    
    // Check system settings for circuit breaker
    log('', 'INFO');
    log('🔧 Checking Circuit Breaker Status:', 'INFO');
    log('==================================', 'INFO');
    
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
      
      // Look for circuit breaker setting
      const circuitBreakerData = settings.resumeProcessingWebhookCircuitBreaker;
      if (circuitBreakerData) {
        try {
          const circuitBreaker = JSON.parse(circuitBreakerData);
          if (circuitBreaker.isOpen) {
            const until = new Date(circuitBreaker.until);
            const now = new Date();
            
            if (now < until) {
              log('❌ Circuit breaker is OPEN', 'ERROR');
              log(`   - Will remain open until: ${until}`, 'ERROR');
              log(`   - Error count: ${circuitBreaker.errorCount}`, 'ERROR');
            } else {
              log('✅ Circuit breaker is CLOSED (expired)', 'INFO');
            }
          } else {
            log('✅ Circuit breaker is CLOSED', 'INFO');
          }
        } catch (e) {
          log('⚠️  Invalid circuit breaker data', 'WARN');
        }
      } else {
        log('ℹ️  No circuit breaker data found', 'INFO');
      }
    }
    
    // Recommendations
    log('', 'INFO');
    log('💡 Recommendations:', 'INFO');
    log('==================', 'INFO');
    
    if (errorJobs504 && errorJobs504.length > 0) {
      log('1. Check external service status and health', 'INFO');
      log('2. Verify webhook URL and authentication', 'INFO');
      log('3. Consider reducing concurrent requests', 'INFO');
      log('4. Monitor external service logs', 'INFO');
      log('5. Contact external service provider', 'INFO');
    } else {
      log('✅ No immediate action needed', 'INFO');
    }
    
  } catch (error) {
    log(`❌ Error during check: ${error.message}`, 'ERROR');
    log('💡 Make sure the server is running and accessible', 'INFO');
  }
}

// Run the check
check504Errors(); 