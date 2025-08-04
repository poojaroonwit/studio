#!/usr/bin/env node

/**
 * Check Duplicate Processing
 * 
 * This script checks for duplicate candidate creation and upload queue processing
 * to identify why 129 uploads created 192 candidates.
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

async function checkDuplicateProcessing() {
  try {
    log('🔍 Checking for duplicate processing issues...', 'INFO');
    log('============================================', 'INFO');
    
    // Check upload queue status
    log('1. Checking Upload Queue Status:', 'INFO');
    log('-------------------------------', 'INFO');
    
    const queueUrl = `${config.baseUrl}/api/upload-queue?limit=200`;
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
      
      log(`📊 Found ${allJobs.length} total upload queue jobs`, 'INFO');
      
      // Group jobs by file name to find duplicates
      const jobsByFileName = {};
      allJobs.forEach(job => {
        if (!jobsByFileName[job.file_name]) {
          jobsByFileName[job.file_name] = [];
        }
        jobsByFileName[job.file_name].push(job);
      });
      
      // Find files with multiple jobs
      const duplicateFiles = Object.entries(jobsByFileName)
        .filter(([fileName, jobs]) => jobs.length > 1)
        .sort((a, b) => b[1].length - a[1].length);
      
      if (duplicateFiles.length > 0) {
        log(`❌ Found ${duplicateFiles.length} files with duplicate processing:`, 'ERROR');
        
        duplicateFiles.forEach(([fileName, jobs]) => {
          log(`   - ${fileName}: ${jobs.length} jobs`, 'ERROR');
          jobs.forEach(job => {
            log(`     Job ${job.id}: status=${job.status}, completed=${job.completed_date}`, 'ERROR');
          });
        });
      } else {
        log('✅ No duplicate file processing found', 'INFO');
      }
      
      // Check for jobs that were processed multiple times
      const processedMultipleTimes = allJobs.filter(job => 
        job.status === 'success' || job.status === 'fail' || job.status === 'error'
      );
      
      log(`📊 Processed jobs: ${processedMultipleTimes.length}`, 'INFO');
      
      // Check for jobs that are still in process
      const inProcessJobs = allJobs.filter(job => job.status === 'inprocess');
      if (inProcessJobs.length > 0) {
        log(`⚠️  Found ${inProcessJobs.length} jobs still in process:`, 'WARN');
        inProcessJobs.forEach(job => {
          log(`   - Job ${job.id}: ${job.file_name}`, 'WARN');
        });
      }
      
      // Check for jobs that are queued
      const queuedJobs = allJobs.filter(job => job.status === 'queued');
      if (queuedJobs.length > 0) {
        log(`📋 Found ${queuedJobs.length} jobs still queued:`, 'INFO');
      }
      
      // Summary
      log('', 'INFO');
      log('📊 Upload Queue Summary:', 'INFO');
      log('=======================', 'INFO');
      log(`Total jobs: ${allJobs.length}`, 'INFO');
      log(`Queued: ${queuedJobs.length}`, 'INFO');
      log(`In Process: ${inProcessJobs.length}`, 'INFO');
      log(`Completed: ${processedMultipleTimes.length}`, 'INFO');
      log(`Duplicate files: ${duplicateFiles.length}`, 'INFO');
      
    } else {
      log(`❌ Failed to fetch queue data: HTTP ${queueResponse.status}`, 'ERROR');
    }
    
    // Check candidates created recently
    log('', 'INFO');
    log('2. Checking Recent Candidates:', 'INFO');
    log('============================', 'INFO');
    
    const candidatesUrl = `${config.baseUrl}/api/candidates?limit=200`;
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
      
      log(`📊 Found ${allCandidates.length} total candidates`, 'INFO');
      
      // Check candidates created in the last 24 hours
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentCandidates = allCandidates.filter(candidate => {
        const createdAt = new Date(candidate.createdAt);
        return createdAt > oneDayAgo;
      });
      
      log(`📊 Candidates created in last 24 hours: ${recentCandidates.length}`, 'INFO');
      
      // Check for duplicate candidates by email
      const candidatesByEmail = {};
      recentCandidates.forEach(candidate => {
        if (candidate.email) {
          if (!candidatesByEmail[candidate.email]) {
            candidatesByEmail[candidate.email] = [];
          }
          candidatesByEmail[candidate.email].push(candidate);
        }
      });
      
      const duplicateEmails = Object.entries(candidatesByEmail)
        .filter(([email, candidates]) => candidates.length > 1)
        .sort((a, b) => b[1].length - a[1].length);
      
      if (duplicateEmails.length > 0) {
        log(`❌ Found ${duplicateEmails.length} email addresses with duplicate candidates:`, 'ERROR');
        
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
    } else {
      log(`❌ Failed to fetch candidates data: HTTP ${candidatesResponse.status}`, 'ERROR');
    }
    
    // Recommendations
    log('', 'INFO');
    log('💡 Recommendations:', 'INFO');
    log('==================', 'INFO');
    
    if (duplicateFiles && duplicateFiles.length > 0) {
      log('🔧 IMMEDIATE ACTIONS NEEDED:', 'INFO');
      log('1. Stop all upload queue processors', 'INFO');
      log('2. Clear duplicate jobs from upload queue', 'INFO');
      log('3. Check for multiple processor instances running', 'INFO');
      log('4. Review upload queue processing logic', 'INFO');
    }
    
    if (duplicateEmails && duplicateEmails.length > 0) {
      log('🔧 CANDIDATE CLEANUP NEEDED:', 'INFO');
      log('1. Review and merge duplicate candidates', 'INFO');
      log('2. Implement email uniqueness validation', 'INFO');
      log('3. Add duplicate detection in upload process', 'INFO');
    }
    
  } catch (error) {
    log(`❌ Error during check: ${error.message}`, 'ERROR');
    log('💡 Make sure the server is running and accessible', 'INFO');
  }
}

// Run the check
checkDuplicateProcessing(); 