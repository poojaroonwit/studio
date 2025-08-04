#!/usr/bin/env node

/**
 * Diagnose Duplicate Candidates
 * 
 * This script performs a comprehensive analysis to identify why 129 uploads
 * created 192 candidates, focusing on:
 * 1. Upload queue processing patterns
 * 2. Webhook retry behavior
 * 3. Multiple processor instances
 * 4. Database transaction timing
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

    req.setTimeout(10000);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function diagnoseDuplicateCandidates() {
  try {
    log('🔍 DIAGNOSING DUPLICATE CANDIDATE CREATION', 'INFO');
    log('============================================', 'INFO');
    
    let duplicateFiles = [];
    let duplicateEmails = [];
    
    // 1. Check upload queue status and patterns
    log('', 'INFO');
    log('1. UPLOAD QUEUE ANALYSIS:', 'INFO');
    log('========================', 'INFO');
    
    const queueUrl = `${config.baseUrl}/api/upload-queue?limit=500`;
    const queueResponse = await makeRequest(queueUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      }
    });
    
    if (queueResponse.status === 200) {
      const queueData = queueResponse.data;
      const allJobs = queueData.data || [];
      
      log(`📊 Total upload queue jobs: ${allJobs.length}`, 'INFO');
      
      // Analyze job processing patterns
      const jobsByStatus = {};
      allJobs.forEach(job => {
        if (!jobsByStatus[job.status]) {
          jobsByStatus[job.status] = [];
        }
        jobsByStatus[job.status].push(job);
      });
      
      Object.entries(jobsByStatus).forEach(([status, jobs]) => {
        log(`   ${status}: ${jobs.length} jobs`, 'INFO');
      });
      
      // Check for jobs processed multiple times
      const successfulJobs = allJobs.filter(job => job.status === 'success');
      const failedJobs = allJobs.filter(job => job.status === 'fail' || job.status === 'error');
      
      log(`📊 Successful jobs: ${successfulJobs.length}`, 'INFO');
      log(`📊 Failed jobs: ${failedJobs.length}`, 'INFO');
      
      // Check for duplicate file processing
      const jobsByFileName = {};
      allJobs.forEach(job => {
        if (!jobsByFileName[job.file_name]) {
          jobsByFileName[job.file_name] = [];
        }
        jobsByFileName[job.file_name].push(job);
      });
      
      duplicateFiles = Object.entries(jobsByFileName)
        .filter(([fileName, jobs]) => jobs.length > 1)
        .sort((a, b) => b[1].length - a[1].length);
      
      if (duplicateFiles.length > 0) {
        log(`❌ CRITICAL: Found ${duplicateFiles.length} files processed multiple times:`, 'ERROR');
        duplicateFiles.forEach(([fileName, jobs]) => {
          log(`   - ${fileName}: ${jobs.length} jobs`, 'ERROR');
          jobs.forEach(job => {
            log(`     Job ${job.id}: status=${job.status}, completed=${job.completed_date}`, 'ERROR');
          });
        });
      } else {
        log('✅ No duplicate file processing detected', 'INFO');
      }
      
      // Check processing timing patterns
      const recentJobs = allJobs.filter(job => {
        const completedDate = job.completed_date ? new Date(job.completed_date) : null;
        return completedDate && completedDate > new Date(Date.now() - 24 * 60 * 60 * 1000);
      });
      
      if (recentJobs.length > 0) {
        log(`📊 Recent jobs (last 24h): ${recentJobs.length}`, 'INFO');
        
        // Check for rapid processing (potential race conditions)
        const rapidJobs = recentJobs.filter(job => {
          const uploadDate = new Date(job.upload_date);
          const processDate = job.process_date ? new Date(job.process_date) : null;
          const completedDate = job.completed_date ? new Date(job.completed_date) : null;
          
          if (processDate && completedDate) {
            const processingTime = completedDate.getTime() - processDate.getTime();
            return processingTime < 5000; // Less than 5 seconds
          }
          return false;
        });
        
        if (rapidJobs.length > 0) {
          log(`⚠️  Found ${rapidJobs.length} jobs processed very quickly (potential race conditions):`, 'WARN');
          rapidJobs.slice(0, 5).forEach(job => {
            const processDate = new Date(job.process_date);
            const completedDate = new Date(job.completed_date);
            const processingTime = completedDate.getTime() - processDate.getTime();
            log(`   - Job ${job.id}: ${job.file_name} (${processingTime}ms)`, 'WARN');
          });
        }
      }
      
    } else {
      log(`❌ Failed to fetch queue data: HTTP ${queueResponse.status}`, 'ERROR');
    }
    
    // 2. Check candidate creation patterns
    log('', 'INFO');
    log('2. CANDIDATE CREATION ANALYSIS:', 'INFO');
    log('==============================', 'INFO');
    
    const candidatesUrl = `${config.baseUrl}/api/candidates?limit=500`;
    const candidatesResponse = await makeRequest(candidatesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      }
    });
    
    if (candidatesResponse.status === 200) {
      const candidatesData = candidatesResponse.data;
      const allCandidates = candidatesData.data || [];
      
      log(`📊 Total candidates: ${allCandidates.length}`, 'INFO');
      
      // Check recent candidates (last 24 hours)
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentCandidates = allCandidates.filter(candidate => {
        const createdAt = new Date(candidate.createdAt);
        return createdAt > oneDayAgo;
      });
      
      log(`📊 Candidates created in last 24h: ${recentCandidates.length}`, 'INFO');
      
      // Check for duplicate candidates by email
      const candidatesByEmail = {};
      recentCandidates.forEach(candidate => {
        if (candidate.email) {
          const email = candidate.email.toLowerCase().trim();
          if (!candidatesByEmail[email]) {
            candidatesByEmail[email] = [];
          }
          candidatesByEmail[email].push(candidate);
        }
      });
      
      duplicateEmails = Object.entries(candidatesByEmail)
        .filter(([email, candidates]) => candidates.length > 1)
        .sort((a, b) => b[1].length - a[1].length);
      
      if (duplicateEmails.length > 0) {
        log(`❌ CRITICAL: Found ${duplicateEmails.length} email addresses with duplicate candidates:`, 'ERROR');
        duplicateEmails.slice(0, 10).forEach(([email, candidates]) => {
          log(`   - ${email}: ${candidates.length} candidates`, 'ERROR');
          candidates.forEach(candidate => {
            log(`     Candidate ${candidate.id}: ${candidate.name}, created: ${candidate.createdAt}`, 'ERROR');
          });
        });
      } else {
        log('✅ No duplicate candidates by email found', 'INFO');
      }
      
      // Check for candidates with same name
      const candidatesByName = {};
      recentCandidates.forEach(candidate => {
        if (candidate.name) {
          const key = candidate.name.toLowerCase().trim();
          if (!candidatesByName[key]) {
            candidatesByName[key] = [];
          }
          candidatesByName[key].push(candidate);
        }
      });
      
      const duplicateNames = Object.entries(candidatesByName)
        .filter(([name, candidates]) => candidates.length > 1)
        .sort((a, b) => b[1].length - a[1].length);
      
      if (duplicateNames.length > 0) {
        log(`⚠️  Found ${duplicateNames.length} names with multiple candidates:`, 'WARN');
        duplicateNames.slice(0, 5).forEach(([name, candidates]) => {
          log(`   - "${name}": ${candidates.length} candidates`, 'WARN');
        });
      }
      
      // Check creation timing patterns
      const rapidCreations = recentCandidates.filter(candidate => {
        const createdAt = new Date(candidate.createdAt);
        const now = new Date();
        const timeDiff = now.getTime() - createdAt.getTime();
        return timeDiff < 60000; // Created in last minute
      });
      
      if (rapidCreations.length > 0) {
        log(`⚠️  Found ${rapidCreations.length} candidates created very recently:`, 'WARN');
        rapidCreations.slice(0, 5).forEach(candidate => {
          const createdAt = new Date(candidate.createdAt);
          const timeDiff = (new Date().getTime() - createdAt.getTime()) / 1000;
          log(`   - ${candidate.name} (${candidate.email}): ${timeDiff.toFixed(1)}s ago`, 'WARN');
        });
      }
      
    } else {
      log(`❌ Failed to fetch candidates data: HTTP ${candidatesResponse.status}`, 'ERROR');
    }
    
    // 3. Check system settings
    log('', 'INFO');
    log('3. SYSTEM SETTINGS ANALYSIS:', 'INFO');
    log('===========================', 'INFO');
    
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
      
      log('📊 Current system settings:', 'INFO');
      log(`   Max concurrent processors: ${settings.maxConcurrentProcessors || 'default (5)'}`, 'INFO');
      log(`   Resume processing webhook URL: ${settings.resumeProcessingWebhookUrl ? 'SET' : 'NOT SET'}`, 'INFO');
      log(`   Prevent duplicate webhook processing: ${settings.preventDuplicateWebhookProcessing || 'default (true)'}`, 'INFO');
      log(`   Webhook timeout: ${settings.resumeProcessingWebhookTimeout || 'default (7200s)'}`, 'INFO');
    } else {
      log(`❌ Failed to fetch system settings: HTTP ${settingsResponse.status}`, 'ERROR');
    }
    
    // 4. Recommendations
    log('', 'INFO');
    log('4. RECOMMENDATIONS:', 'INFO');
    log('==================', 'INFO');
    
    if (duplicateFiles && duplicateFiles.length > 0) {
      log('🔧 IMMEDIATE ACTIONS NEEDED:', 'ERROR');
      log('1. STOP all upload queue processors immediately', 'ERROR');
      log('2. Check for multiple processor instances running', 'ERROR');
      log('3. Review database locking mechanisms', 'ERROR');
      log('4. Implement job deduplication logic', 'ERROR');
    }
    
    if (duplicateEmails && duplicateEmails.length > 0) {
      log('🔧 CANDIDATE CLEANUP NEEDED:', 'ERROR');
      log('1. Review and merge duplicate candidates', 'ERROR');
      log('2. Implement email uniqueness validation', 'ERROR');
      log('3. Add duplicate detection in upload process', 'ERROR');
    }
    
    log('', 'INFO');
    log('🔧 PREVENTIVE MEASURES:', 'INFO');
    log('1. Implement job-level locking with unique constraints', 'INFO');
    log('2. Add webhook idempotency keys', 'INFO');
    log('3. Implement candidate creation deduplication', 'INFO');
    log('4. Add comprehensive logging for webhook calls', 'INFO');
    log('5. Implement circuit breaker for webhook failures', 'INFO');
    
  } catch (error) {
    log(`❌ Error during diagnosis: ${error.message}`, 'ERROR');
    log('💡 Make sure the server is running and accessible', 'INFO');
  }
}

// Run the diagnosis
diagnoseDuplicateCandidates(); 