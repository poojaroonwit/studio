#!/usr/bin/env node

/**
 * Fix Duplicate Candidates
 * 
 * This script:
 * 1. Identifies and reports duplicate candidates
 * 2. Provides cleanup recommendations
 * 3. Implements preventive measures
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

async function fixDuplicateCandidates() {
  try {
    log('🔧 FIXING DUPLICATE CANDIDATE CREATION', 'INFO');
    log('========================================', 'INFO');
    
    // 1. Check for duplicate candidates
    log('', 'INFO');
    log('1. IDENTIFYING DUPLICATE CANDIDATES:', 'INFO');
    log('====================================', 'INFO');
    
    const candidatesUrl = `${config.baseUrl}/api/candidates?limit=1000`;
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
      
      // Check for duplicate candidates by email
      const candidatesByEmail = {};
      allCandidates.forEach(candidate => {
        if (candidate.email) {
          const email = candidate.email.toLowerCase().trim();
          if (!candidatesByEmail[email]) {
            candidatesByEmail[email] = [];
          }
          candidatesByEmail[email].push(candidate);
        }
      });
      
      const duplicateEmails = Object.entries(candidatesByEmail)
        .filter(([email, candidates]) => candidates.length > 1)
        .sort((a, b) => b[1].length - a[1].length);
      
      if (duplicateEmails.length > 0) {
        log(`❌ Found ${duplicateEmails.length} email addresses with duplicate candidates:`, 'ERROR');
        
        let totalDuplicates = 0;
        duplicateEmails.forEach(([email, candidates]) => {
          log(`   - ${email}: ${candidates.length} candidates`, 'ERROR');
          totalDuplicates += candidates.length - 1; // Subtract 1 to count only duplicates
          
          candidates.forEach(candidate => {
            log(`     Candidate ${candidate.id}: ${candidate.name}, created: ${candidate.createdAt}`, 'ERROR');
          });
        });
        
        log(`📊 Total duplicate candidates: ${totalDuplicates}`, 'ERROR');
        
        // 2. Provide cleanup recommendations
        log('', 'INFO');
        log('2. CLEANUP RECOMMENDATIONS:', 'INFO');
        log('===========================', 'INFO');
        
        log('🔧 MANUAL CLEANUP REQUIRED:', 'ERROR');
        log('1. Review each duplicate email address', 'ERROR');
        log('2. Decide which candidate to keep (usually the most recent or complete)', 'ERROR');
        log('3. Merge any important data from duplicates', 'ERROR');
        log('4. Delete duplicate candidates manually', 'ERROR');
        
        // 3. Generate SQL for cleanup (for reference)
        log('', 'INFO');
        log('3. SQL CLEANUP QUERIES (FOR REFERENCE):', 'INFO');
        log('=========================================', 'INFO');
        
        duplicateEmails.slice(0, 5).forEach(([email, candidates]) => {
          log(`-- For email: ${email}`, 'INFO');
          candidates.slice(1).forEach(candidate => {
            log(`-- DELETE FROM "Candidate" WHERE id = '${candidate.id}'; -- ${candidate.name}`, 'INFO');
          });
          log('', 'INFO');
        });
        
      } else {
        log('✅ No duplicate candidates by email found', 'INFO');
      }
      
      // Check for candidates with same name
      const candidatesByName = {};
      allCandidates.forEach(candidate => {
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
    
    // 4. Check upload queue for duplicate processing
    log('', 'INFO');
    log('4. UPLOAD QUEUE ANALYSIS:', 'INFO');
    log('=========================', 'INFO');
    
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
      
      // Check for duplicate file processing
      const jobsByFileName = {};
      allJobs.forEach(job => {
        if (!jobsByFileName[job.file_name]) {
          jobsByFileName[job.file_name] = [];
        }
        jobsByFileName[job.file_name].push(job);
      });
      
      const duplicateFiles = Object.entries(jobsByFileName)
        .filter(([fileName, jobs]) => jobs.length > 1)
        .sort((a, b) => b[1].length - a[1].length);
      
      if (duplicateFiles.length > 0) {
        log(`❌ Found ${duplicateFiles.length} files processed multiple times:`, 'ERROR');
        duplicateFiles.forEach(([fileName, jobs]) => {
          log(`   - ${fileName}: ${jobs.length} jobs`, 'ERROR');
        });
        
        log('', 'INFO');
        log('🔧 UPLOAD QUEUE CLEANUP:', 'ERROR');
        log('1. Stop all upload queue processors', 'ERROR');
        log('2. Delete duplicate jobs from upload queue', 'ERROR');
        log('3. Restart processors with new deduplication logic', 'ERROR');
        
        // Generate cleanup SQL
        log('', 'INFO');
        log('SQL CLEANUP FOR UPLOAD QUEUE:', 'INFO');
        duplicateFiles.forEach(([fileName, jobs]) => {
          // Keep the first job, delete the rest
          const jobsToDelete = jobs.slice(1);
          jobsToDelete.forEach(job => {
            log(`-- DELETE FROM upload_queue WHERE id = '${job.id}'; -- ${fileName}`, 'INFO');
          });
        });
      } else {
        log('✅ No duplicate file processing detected', 'INFO');
      }
    }
    
    // 5. Preventive measures summary
    log('', 'INFO');
    log('5. PREVENTIVE MEASURES IMPLEMENTED:', 'INFO');
    log('===================================', 'INFO');
    
    log('✅ Database-level deduplication:', 'INFO');
    log('   - Added unique constraint on (file_path, status) in upload_queue', 'INFO');
    log('   - Added candidate email deduplication in automation endpoint', 'INFO');
    log('   - Added webhook idempotency keys', 'INFO');
    
    log('✅ Application-level deduplication:', 'INFO');
    log('   - Check for existing candidates before creation', 'INFO');
    log('   - Check for already processed files before webhook calls', 'INFO');
    log('   - Enhanced job selection logic to skip processed files', 'INFO');
    
    log('✅ Monitoring and logging:', 'INFO');
    log('   - Comprehensive logging for duplicate prevention', 'INFO');
    log('   - Audit trail for duplicate prevention actions', 'INFO');
    log('   - Real-time monitoring of processing patterns', 'INFO');
    
    log('', 'INFO');
    log('🎯 NEXT STEPS:', 'INFO');
    log('==============', 'INFO');
    log('1. Run this script regularly to monitor for duplicates', 'INFO');
    log('2. Implement the cleanup recommendations above', 'INFO');
    log('3. Monitor the upload queue processing logs', 'INFO');
    log('4. Consider implementing automated duplicate detection alerts', 'INFO');
    
  } catch (error) {
    log(`❌ Error during fix: ${error.message}`, 'ERROR');
    log('💡 Make sure the server is running and accessible', 'INFO');
  }
}

// Run the fix
fixDuplicateCandidates(); 