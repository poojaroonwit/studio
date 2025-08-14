#!/usr/bin/env node

/**
 * Debug script for upload queue issues
 * Helps identify jobs with incorrect status and webhook response problems
 */

const config = require('./config.js');

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const http = require('http');
    
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        ...options.headers
      }
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function debugUploadQueue() {
  try {
    log('🔍 Debugging upload queue issues...', 'INFO');
    log('====================================', 'INFO');
    
    // Get recent upload queue jobs
    const queueUrl = `${config.baseUrl}/api/upload-queue?limit=100`;
    const queueResponse = await makeRequest(queueUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      }
    });
    
    if (queueResponse.status === 200) {
      const queueData = queueResponse.data;
      const jobs = queueData.data || [];
      
      log(`📊 Found ${jobs.length} upload queue jobs`, 'INFO');
      
      // Analyze jobs by status
      const statusCounts = {};
      const errorJobs = [];
      const successJobs = [];
      const processingJobs = [];
      
      jobs.forEach(job => {
        statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
        
        if (job.status === 'error' || job.status === 'fail') {
          errorJobs.push(job);
        } else if (job.status === 'success') {
          successJobs.push(job);
        } else if (job.status === 'inprocess') {
          processingJobs.push(job);
        }
      });
      
      log('📈 Status distribution:', 'INFO');
      Object.entries(statusCounts).forEach(([status, count]) => {
        log(`  ${status}: ${count} jobs`, 'INFO');
      });
      
      // Check for stuck processing jobs
      if (processingJobs.length > 0) {
        log(`⚠️  Found ${processingJobs.length} jobs stuck in 'inprocess' status:`, 'WARN');
        processingJobs.forEach(job => {
          const processDate = new Date(job.process_date);
          const now = new Date();
          const hoursStuck = (now - processDate) / (1000 * 60 * 60);
          
          log(`  - Job ${job.id}: ${job.file_name} (stuck for ${hoursStuck.toFixed(1)} hours)`, 'WARN');
        });
      }
      
      // Analyze error jobs
      if (errorJobs.length > 0) {
        log(`❌ Found ${errorJobs.length} error jobs:`, 'ERROR');
        
        const errorTypes = {};
        errorJobs.forEach(job => {
          const errorKey = job.error || 'Unknown error';
          errorTypes[errorKey] = (errorTypes[errorKey] || 0) + 1;
        });
        
        log('Error type distribution:', 'ERROR');
        Object.entries(errorTypes).forEach(([error, count]) => {
          log(`  ${error}: ${count} jobs`, 'ERROR');
        });
        
        // Show detailed info for recent error jobs
        const recentErrors = errorJobs
          .sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))
          .slice(0, 5);
        
        log('Recent error jobs details:', 'ERROR');
        recentErrors.forEach(job => {
          log(`  Job ${job.id}:`, 'ERROR');
          log(`    File: ${job.file_name}`, 'ERROR');
          log(`    Status: ${job.status}`, 'ERROR');
          log(`    Error: ${job.error}`, 'ERROR');
          log(`    Completed: ${job.completed_date}`, 'ERROR');
          
          if (job.webhook_payload) {
            const payload = typeof job.webhook_payload === 'string' 
              ? JSON.parse(job.webhook_payload) 
              : job.webhook_payload;
            
            if (payload.webhookResStatus) {
              log(`    Webhook Status: ${payload.webhookResStatus}`, 'ERROR');
            }
            if (payload.webhookError) {
              log(`    Webhook Error: ${payload.webhookError}`, 'ERROR');
            }
          }
          log('', 'ERROR');
        });
      }
      
      // Check for potential 504 issues
      const potential504Jobs = errorJobs.filter(job => 
        job.error && (
          job.error.includes('504') || 
          job.error.includes('timeout') ||
          job.error.includes('Gateway timeout')
        )
      );
      
      if (potential504Jobs.length > 0) {
        log(`🚨 Found ${potential504Jobs.length} jobs with potential 504/timeout issues:`, 'ERROR');
        potential504Jobs.forEach(job => {
          log(`  - Job ${job.id}: ${job.file_name}`, 'ERROR');
          log(`    Error: ${job.error}`, 'ERROR');
          log(`    Completed: ${job.completed_date}`, 'ERROR');
          
          if (job.webhook_payload) {
            const payload = typeof job.webhook_payload === 'string' 
              ? JSON.parse(job.webhook_payload) 
              : job.webhook_payload;
            
            if (payload.webhookResStatus) {
              log(`    Webhook Response Status: ${payload.webhookResStatus}`, 'ERROR');
            }
            if (payload.webhookResponseText) {
              log(`    Webhook Response Text: ${payload.webhookResponseText.substring(0, 200)}...`, 'ERROR');
            }
          }
        });
      }
      
    } else {
      log(`Failed to fetch upload queue: ${queueResponse.status}`, 'ERROR');
    }
    
  } catch (error) {
    log(`Debug error: ${error.message}`, 'ERROR');
  }
}

// Run the debug
debugUploadQueue().then(() => {
  log('Debug completed', 'INFO');
  process.exit(0);
}).catch(error => {
  log(`Debug failed: ${error.message}`, 'ERROR');
  process.exit(1);
});
