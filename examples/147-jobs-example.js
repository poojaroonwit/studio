/**
 * 147 Jobs Example - Comprehensive Process Queue Demonstration
 * 
 * This example creates 147 jobs with different statuses to demonstrate:
 * - Queued jobs (waiting to be processed)
 * - Processing jobs (currently being executed)
 * - Completed jobs (successfully finished)
 * - Failed jobs (with different error types)
 * - Retried jobs (jobs that failed and were retried)
 * - Timeout jobs (jobs that exceeded their time limit)
 * - Priority jobs (different priority levels)
 * - Different job types (email, file, api, slow, custom)
 */

const ProcessQueue = require('./process-queue-example');

// Create a comprehensive queue for demonstration
const comprehensiveQueue = new ProcessQueue({
  name: 'comprehensive-queue',
  maxConcurrent: 10,  // Process 10 jobs simultaneously
  retryAttempts: 3,
  retryDelay: 2000
});

// Job status tracking
const jobStatuses = {
  queued: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  retried: 0,
  timeout: 0,
  cancelled: 0
};

// Track all job IDs for monitoring
const allJobIds = [];

// Setup event listeners to track status changes
comprehensiveQueue.on('job:queued', (job) => {
  jobStatuses.queued++;
  console.log(`📋 Job ${job.id} queued (${job.data.type})`);
});

comprehensiveQueue.on('job:started', (job) => {
  jobStatuses.queued--;
  jobStatuses.processing++;
  console.log(`▶️  Job ${job.id} started processing (${job.data.type})`);
});

comprehensiveQueue.on('job:completed', (job) => {
  jobStatuses.processing--;
  jobStatuses.completed++;
  console.log(`✅ Job ${job.id} completed successfully (${job.data.type})`);
});

comprehensiveQueue.on('job:failed', (job) => {
  jobStatuses.processing--;
  jobStatuses.failed++;
  console.log(`❌ Job ${job.id} failed (${job.data.type}): ${job.error}`);
});

comprehensiveQueue.on('job:retrying', (job) => {
  jobStatuses.retried++;
  console.log(`🔄 Job ${job.id} retrying (attempt ${job.attempts}/${job.maxAttempts})`);
});

comprehensiveQueue.on('job:timeout', (job) => {
  jobStatuses.timeout++;
  console.log(`⏰ Job ${job.id} timed out (${job.data.type})`);
});

// Function to create jobs with different characteristics
function createJobBatch() {
  console.log('\n🚀 Creating 147 jobs with different statuses...\n');
  
  let jobId = 1;
  
  // ============================================================================
  // BATCH 1: 50 EMAIL JOBS (Various priorities and outcomes)
  // ============================================================================
  console.log('📧 Creating 50 email jobs...');
  
  for (let i = 1; i <= 50; i++) {
    const priority = i <= 10 ? 10 : i <= 25 ? 5 : 1; // High, medium, low priority
    const shouldFail = i % 7 === 0; // Every 7th job fails
    const shouldTimeout = i % 11 === 0; // Every 11th job times out
    
    const jobData = {
      type: 'email',
      to: `user${i}@example.com`,
      subject: `Email ${i} - ${shouldFail ? 'FAIL' : shouldTimeout ? 'TIMEOUT' : 'SUCCESS'}`,
      body: `This is email number ${i}`,
      shouldFail: shouldFail,
      shouldTimeout: shouldTimeout
    };
    
    const jobId = comprehensiveQueue.addJob(jobData, {
      priority: priority,
      timeout: shouldTimeout ? 1000 : 30000, // 1 second for timeout jobs
      maxAttempts: shouldFail ? 1 : 3
    });
    
    allJobIds.push(jobId);
  }
  
  // ============================================================================
  // BATCH 2: 40 FILE PROCESSING JOBS
  // ============================================================================
  console.log('📁 Creating 40 file processing jobs...');
  
  for (let i = 1; i <= 40; i++) {
    const fileTypes = ['pdf', 'docx', 'jpg', 'mp4', 'txt'];
    const fileType = fileTypes[i % fileTypes.length];
    const shouldFail = i % 5 === 0; // Every 5th job fails
    
    const jobData = {
      type: 'file',
      filename: `document_${i}.${fileType}`,
      size: 1024 * (i + 1),
      action: shouldFail ? 'process_and_fail' : 'process_and_store',
      shouldFail: shouldFail
    };
    
    const jobId = comprehensiveQueue.addJob(jobData, {
      priority: i <= 20 ? 8 : 3,
      timeout: 45000,
      maxAttempts: shouldFail ? 2 : 3
    });
    
    allJobIds.push(jobId);
  }
  
  // ============================================================================
  // BATCH 3: 30 API CALL JOBS
  // ============================================================================
  console.log('🌐 Creating 30 API call jobs...');
  
  for (let i = 1; i <= 30; i++) {
    const endpoints = ['/users', '/posts', '/comments', '/products', '/orders'];
    const endpoint = endpoints[i % endpoints.length];
    const shouldFail = i % 6 === 0; // Every 6th job fails
    const shouldTimeout = i % 9 === 0; // Every 9th job times out
    
    const jobData = {
      type: 'api',
      endpoint: endpoint,
      method: i % 2 === 0 ? 'GET' : 'POST',
      data: { id: i, timestamp: Date.now() },
      shouldFail: shouldFail,
      shouldTimeout: shouldTimeout
    };
    
    const jobId = comprehensiveQueue.addJob(jobData, {
      priority: i <= 15 ? 7 : 4,
      timeout: shouldTimeout ? 2000 : 15000,
      maxAttempts: shouldFail ? 1 : 3
    });
    
    allJobIds.push(jobId);
  }
  
  // ============================================================================
  // BATCH 4: 20 SLOW PROCESSING JOBS
  // ============================================================================
  console.log('🐌 Creating 20 slow processing jobs...');
  
  for (let i = 1; i <= 20; i++) {
    const shouldFail = i % 4 === 0; // Every 4th job fails
    
    const jobData = {
      type: 'slow',
      description: `Slow processing task ${i}`,
      duration: 3000 + (i * 500), // 3-12 seconds
      shouldFail: shouldFail
    };
    
    const jobId = comprehensiveQueue.addJob(jobData, {
      priority: i <= 10 ? 6 : 2,
      timeout: 20000,
      maxAttempts: shouldFail ? 2 : 3
    });
    
    allJobIds.push(jobId);
  }
  
  // ============================================================================
  // BATCH 5: 7 CUSTOM JOBS (Edge cases and special scenarios)
  // ============================================================================
  console.log('🔧 Creating 7 custom jobs (edge cases)...');
  
  const customJobs = [
    // Job that will be cancelled
    { type: 'custom', action: 'will_be_cancelled', description: 'This job will be cancelled' },
    // Job with very high priority
    { type: 'custom', action: 'high_priority', description: 'Very high priority job', priority: 15 },
    // Job with very low priority
    { type: 'custom', action: 'low_priority', description: 'Very low priority job', priority: 0 },
    // Job that will fail multiple times then succeed
    { type: 'custom', action: 'fail_then_succeed', description: 'Fails twice then succeeds', attempts: 0 },
    // Job with very long timeout
    { type: 'custom', action: 'long_timeout', description: 'Job with 60 second timeout', timeout: 60000 },
    // Job that simulates network error
    { type: 'custom', action: 'network_error', description: 'Simulates network failure' },
    // Job that simulates database error
    { type: 'custom', action: 'database_error', description: 'Simulates database failure' }
  ];
  
  customJobs.forEach((jobData, index) => {
    const jobId = comprehensiveQueue.addJob(jobData, {
      priority: jobData.priority || 5,
      timeout: jobData.timeout || 30000,
      maxAttempts: 3
    });
    
    allJobIds.push(jobId);
  });
}

// Function to monitor and display comprehensive statistics
function monitorComprehensiveQueue() {
  console.log('\n📊 Starting comprehensive monitoring...\n');
  
  const monitorInterval = setInterval(() => {
    const stats = comprehensiveQueue.getStats();
    const queue = comprehensiveQueue.getQueue();
    
    // Calculate current status distribution
    const currentStatuses = {
      queued: queue.filter(job => job.status === 'queued').length,
      processing: queue.filter(job => job.status === 'processing').length,
      completed: stats.completed,
      failed: stats.failed,
      retried: jobStatuses.retried,
      timeout: jobStatuses.timeout,
      cancelled: jobStatuses.cancelled
    };
    
    // Display comprehensive status
    console.log('📈 COMPREHENSIVE QUEUE STATUS:');
    console.log('═'.repeat(60));
    console.log(`📋 Queued:     ${currentStatuses.queued.toString().padStart(3)} jobs`);
    console.log(`▶️  Processing: ${currentStatuses.processing.toString().padStart(3)} jobs`);
    console.log(`✅ Completed:  ${currentStatuses.completed.toString().padStart(3)} jobs`);
    console.log(`❌ Failed:     ${currentStatuses.failed.toString().padStart(3)} jobs`);
    console.log(`🔄 Retried:    ${currentStatuses.retried.toString().padStart(3)} jobs`);
    console.log(`⏰ Timeout:    ${currentStatuses.timeout.toString().padStart(3)} jobs`);
    console.log(`🚫 Cancelled:  ${currentStatuses.cancelled.toString().padStart(3)} jobs`);
    console.log('═'.repeat(60));
    console.log(`📊 Total:      ${allJobIds.length.toString().padStart(3)} jobs`);
    console.log(`🎯 Progress:   ${((currentStatuses.completed + currentStatuses.failed + currentStatuses.timeout + currentStatuses.cancelled) / allJobIds.length * 100).toFixed(1)}%`);
    
    // Show job type breakdown
    const jobTypes = {};
    queue.forEach(job => {
      jobTypes[job.data.type] = (jobTypes[job.data.type] || 0) + 1;
    });
    
    console.log('\n📋 Job Types in Queue:');
    Object.entries(jobTypes).forEach(([type, count]) => {
      console.log(`  ${type.padEnd(10)}: ${count.toString().padStart(2)} jobs`);
    });
    
    // Show priority distribution
    const priorities = {};
    queue.forEach(job => {
      priorities[job.priority] = (priorities[job.priority] || 0) + 1;
    });
    
    console.log('\n🎯 Priority Distribution:');
    Object.entries(priorities).sort(([a], [b]) => b - a).forEach(([priority, count]) => {
      console.log(`  Priority ${priority.padStart(2)}: ${count.toString().padStart(2)} jobs`);
    });
    
    console.log('\n' + '─'.repeat(60));
    
    // Check if all jobs are done
    const totalFinished = currentStatuses.completed + currentStatuses.failed + currentStatuses.timeout + currentStatuses.cancelled;
    if (totalFinished >= allJobIds.length) {
      clearInterval(monitorInterval);
      console.log('\n🎉 ALL 147 JOBS COMPLETED!');
      
      // Final comprehensive report
      console.log('\n📊 FINAL COMPREHENSIVE REPORT:');
      console.log('═'.repeat(60));
      console.log(`📧 Email Jobs:      ${stats.completed} completed, ${stats.failed} failed`);
      console.log(`📁 File Jobs:       ${stats.completed} completed, ${stats.failed} failed`);
      console.log(`🌐 API Jobs:        ${stats.completed} completed, ${stats.failed} failed`);
      console.log(`🐌 Slow Jobs:       ${stats.completed} completed, ${stats.failed} failed`);
      console.log(`🔧 Custom Jobs:     ${stats.completed} completed, ${stats.failed} failed`);
      console.log('═'.repeat(60));
      console.log(`⏱️  Total Processing Time: ${Date.now() - startTime}ms`);
      console.log(`📈 Success Rate: ${((currentStatuses.completed / allJobIds.length) * 100).toFixed(1)}%`);
      console.log(`🔄 Retry Rate: ${((currentStatuses.retried / allJobIds.length) * 100).toFixed(1)}%`);
      
      // Clean up
      comprehensiveQueue.stop();
    }
  }, 1000);
  
  // Stop after 5 minutes if not done
  setTimeout(() => {
    clearInterval(monitorInterval);
    console.log('\n⏰ 5-minute timeout reached, stopping queue...');
    comprehensiveQueue.stop();
  }, 300000);
}

// Main execution function
async function run147JobsExample() {
  console.log('🎯 147 JOBS COMPREHENSIVE PROCESS QUEUE EXAMPLE');
  console.log('═'.repeat(60));
  console.log('This example demonstrates all possible job statuses and scenarios');
  console.log('═'.repeat(60));
  
  const startTime = Date.now();
  
  // Create all 147 jobs
  createJobBatch();
  
  // Start monitoring
  monitorComprehensiveQueue();
  
  // Simulate some special scenarios after a delay
  setTimeout(() => {
    console.log('\n🎭 Simulating special scenarios...');
    
    // Cancel a job
    const jobToCancel = comprehensiveQueue.getQueue().find(job => job.data.action === 'will_be_cancelled');
    if (jobToCancel) {
      comprehensiveQueue.removeJob(jobToCancel.id);
      jobStatuses.cancelled++;
      console.log(`🚫 Cancelled job ${jobToCancel.id}`);
    }
    
    // Add a high-priority job that should jump to the front
    const emergencyJob = comprehensiveQueue.addJob({
      type: 'custom',
      action: 'emergency',
      description: 'Emergency high-priority job'
    }, {
      priority: 20,
      timeout: 10000
    });
    
    console.log(`🚨 Added emergency job ${emergencyJob} with priority 20`);
    
  }, 10000);
}

// Run the example
if (require.main === module) {
  run147JobsExample().catch(console.error);
}

module.exports = { comprehensiveQueue, jobStatuses, allJobIds };
