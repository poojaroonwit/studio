/**
 * Example Process Queue System
 * 
 * This example demonstrates a complete process queue system with:
 * - Job queuing and management
 * - Worker processing
 * - Error handling and retries
 * - Priority handling
 * - Monitoring and logging
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

// ============================================================================
// QUEUE CLASS DEFINITION
// ============================================================================

class ProcessQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.name = options.name || 'default-queue';
    this.maxConcurrent = options.maxConcurrent || 5;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 5000; // 5 seconds
    this.jobTimeout = options.jobTimeout || 30000; // 30 seconds
    
    // Internal state
    this.jobs = new Map(); // All jobs by ID
    this.queued = []; // FIFO queue of job IDs
    this.processing = new Set(); // Currently processing job IDs
    this.workers = new Set(); // Active worker instances
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      retried: 0,
      avgProcessingTime: 0
    };
    
    // Start the queue
    this.isRunning = true;
    this.processNext();
  }

  // ============================================================================
  // JOB MANAGEMENT
  // ============================================================================

  /**
   * Add a job to the queue
   */
  addJob(jobData, options = {}) {
    const job = {
      id: crypto.randomUUID(),
      data: jobData,
      priority: options.priority || 0, // Higher number = higher priority
      attempts: 0,
      maxAttempts: options.maxAttempts || this.retryAttempts,
      timeout: options.timeout || this.jobTimeout,
      createdAt: Date.now(),
      status: 'queued',
      result: null,
      error: null
    };

    this.jobs.set(job.id, job);
    this.queued.push(job.id);
    this.stats.total++;

    // Sort queue by priority (highest first), then by creation time
    this.queued.sort((a, b) => {
      const jobA = this.jobs.get(a);
      const jobB = this.jobs.get(b);
      if (jobA.priority !== jobB.priority) {
        return jobB.priority - jobA.priority; // Higher priority first
      }
      return jobA.createdAt - jobB.createdAt; // FIFO for same priority
    });

    this.emit('job:added', job);
    console.log(`[${this.name}] Job added: ${job.id} (priority: ${job.priority})`);
    
    return job.id;
  }

  /**
   * Get job by ID
   */
  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  /**
   * Remove a job from the queue
   */
  removeJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    // Remove from processing if active
    if (this.processing.has(jobId)) {
      this.processing.delete(jobId);
    }

    // Remove from queue
    const queueIndex = this.queued.indexOf(jobId);
    if (queueIndex > -1) {
      this.queued.splice(queueIndex, 1);
    }

    this.jobs.delete(jobId);
    this.emit('job:removed', job);
    console.log(`[${this.name}] Job removed: ${jobId}`);
    
    return true;
  }

  // ============================================================================
  // QUEUE PROCESSING
  // ============================================================================

  /**
   * Process the next job in the queue
   */
  async processNext() {
    if (!this.isRunning) return;

    // Check if we can process more jobs
    if (this.processing.size >= this.maxConcurrent) {
      setTimeout(() => this.processNext(), 100);
      return;
    }

    // Get next job from queue
    const jobId = this.queued.shift();
    if (!jobId) {
      // No jobs in queue, check again in 1 second
      setTimeout(() => this.processNext(), 1000);
      return;
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      // Job was removed, process next
      this.processNext();
      return;
    }

    // Start processing
    this.processing.add(jobId);
    job.status = 'processing';
    job.startedAt = Date.now();

    this.emit('job:started', job);
    console.log(`[${this.name}] Processing job: ${jobId}`);

    // Process the job
    this.processJob(job);
  }

  /**
   * Process a single job
   */
  async processJob(job) {
    const timeoutId = setTimeout(() => {
      this.handleJobTimeout(job);
    }, job.timeout);

    try {
      // Simulate job processing
      const result = await this.executeJob(job);
      
      clearTimeout(timeoutId);
      this.completeJob(job, result);
      
    } catch (error) {
      clearTimeout(timeoutId);
      this.handleJobError(job, error);
    }
  }

  /**
   * Execute the actual job (this is where your business logic goes)
   */
  async executeJob(job) {
    // Simulate different types of jobs
    const { type, ...data } = job.data;
    
    switch (type) {
      case 'email':
        return await this.processEmailJob(data);
      case 'file':
        return await this.processFileJob(data);
      case 'api':
        return await this.processApiJob(data);
      case 'slow':
        return await this.processSlowJob(data);
      case 'custom':
        return await this.processCustomJob(data);
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }

  // ============================================================================
  // JOB TYPE HANDLERS
  // ============================================================================

  async processEmailJob(data) {
    const { to, subject, body, shouldFail = false, shouldTimeout = false } = data;
    console.log(`[${this.name}] Processing email job: ${to}`);
    
    if (shouldFail) {
      throw new Error(`Email failed: ${subject}`);
    }
    
    if (shouldTimeout) {
      await this.simulateWork(5000); // Simulate timeout
      throw new Error('Email timeout');
    }
    
    await this.simulateWork(1000 + Math.random() * 2000); // 1-3 seconds
    
    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Email service temporarily unavailable');
    }
    
    return { sent: true, messageId: crypto.randomUUID(), to, subject };
  }

  async processFileJob(data) {
    const { filename, size, action, shouldFail = false } = data;
    console.log(`[${this.name}] Processing file job: ${filename}`);
    
    if (shouldFail) {
      throw new Error(`File processing failed: ${filename}`);
    }
    
    await this.simulateWork(2000 + Math.random() * 3000); // 2-5 seconds
    
    return { processed: true, size, checksum: crypto.randomUUID(), filename, url: `https://storage.example.com/${filename}` };
  }

  async processApiJob(data) {
    const { endpoint, method, data: apiData, shouldFail = false, shouldTimeout = false } = data;
    console.log(`[${this.name}] Processing API job: ${endpoint}`);
    
    if (shouldFail) {
      throw new Error(`API call failed: ${endpoint}`);
    }
    
    if (shouldTimeout) {
      await this.simulateWork(3000); // Simulate timeout
      throw new Error('API timeout');
    }
    
    await this.simulateWork(500 + Math.random() * 1500); // 0.5-2 seconds
    
    return { success: true, response: { status: 200, data: 'processed', endpoint, method } };
  }

  async processSlowJob(data) {
    const { description, duration = 5000, shouldFail = false } = data;
    console.log(`[${this.name}] Processing slow job: ${description}`);
    
    if (shouldFail) {
      throw new Error(`Slow job failed: ${description}`);
    }
    
    // Use specified duration or default
    const actualDuration = duration || (5000 + Math.random() * 5000);
    await this.simulateWork(actualDuration);
    
    return { completed: true, duration: actualDuration, description, records: Math.floor(Math.random() * 100) + 1 };
  }

  async processCustomJob(data) {
    const { action, description, shouldFail = false, attempts = 0 } = data;
    
    // Handle different custom job actions
    switch (action) {
      case 'will_be_cancelled':
        // This job should be cancelled, but if it gets here, process it
        await this.simulateWork(2000);
        return {
          message: `Custom job completed: ${description}`,
          result: 'Job was processed despite being marked for cancellation'
        };
        
      case 'high_priority':
        await this.simulateWork(1000);
        return {
          message: `High priority job completed: ${description}`,
          result: 'High priority processing successful'
        };
        
      case 'low_priority':
        await this.simulateWork(3000);
        return {
          message: `Low priority job completed: ${description}`,
          result: 'Low priority processing successful'
        };
        
      case 'fail_then_succeed':
        // Fail twice, then succeed on the third attempt
        if (attempts < 2) {
          throw new Error(`Custom job failed on attempt ${attempts + 1}: ${description}`);
        }
        await this.simulateWork(2000);
        return {
          message: `Custom job succeeded after retries: ${description}`,
          result: 'Failed twice then succeeded'
        };
        
      case 'long_timeout':
        await this.simulateWork(5000);
        return {
          message: `Long timeout job completed: ${description}`,
          result: 'Long timeout processing successful'
        };
        
      case 'network_error':
        throw new Error(`Network error simulated: ${description}`);
        
      case 'database_error':
        throw new Error(`Database error simulated: ${description}`);
        
      case 'emergency':
        await this.simulateWork(500);
        return {
          message: `Emergency job completed: ${description}`,
          result: 'Emergency processing successful'
        };
        
      default:
        if (shouldFail) {
          throw new Error(`Custom job failed: ${description}`);
        }
        
        await this.simulateWork(1500);
        return {
          message: `Custom job completed: ${description}`,
          result: 'Default custom processing successful'
        };
    }
  }

  async simulateWork(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  // ============================================================================
  // JOB COMPLETION HANDLERS
  // ============================================================================

  completeJob(job, result) {
    job.status = 'completed';
    job.result = result;
    job.completedAt = Date.now();
    job.processingTime = job.completedAt - job.startedAt;

    this.processing.delete(job.id);
    this.stats.completed++;
    
    // Update average processing time
    this.stats.avgProcessingTime = 
      (this.stats.avgProcessingTime * (this.stats.completed - 1) + job.processingTime) / this.stats.completed;

    this.emit('job:completed', job);
    console.log(`[${this.name}] Job completed: ${job.id} (${job.processingTime}ms)`);

    // Process next job
    this.processNext();
  }

  handleJobError(job, error) {
    job.attempts++;
    job.lastError = error.message;
    
    console.log(`[${this.name}] Job failed: ${job.id} (attempt ${job.attempts}/${job.maxAttempts}) - ${error.message}`);

    if (job.attempts >= job.maxAttempts) {
      // Max attempts reached, mark as failed
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = Date.now();
      
      this.processing.delete(job.id);
      this.stats.failed++;
      
      this.emit('job:failed', job);
      console.log(`[${this.name}] Job permanently failed: ${job.id}`);
      
    } else {
      // Retry the job
      this.stats.retried++;
      job.status = 'queued';
      
      // Add back to queue with exponential backoff
      const delay = this.retryDelay * Math.pow(2, job.attempts - 1);
      setTimeout(() => {
        this.queued.push(job.id);
        this.emit('job:retry', job);
      }, delay);
      
      console.log(`[${this.name}] Job will retry: ${job.id} in ${delay}ms`);
    }

    this.processing.delete(job.id);
    this.processNext();
  }

  handleJobTimeout(job) {
    const error = new Error(`Job timeout after ${job.timeout}ms`);
    this.handleJobError(job, error);
  }

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      ...this.stats,
      queued: this.queued.length,
      processing: this.processing.size,
      totalJobs: this.jobs.size
    };
  }

  /**
   * Get all jobs with optional filtering
   */
  getJobs(filter = {}) {
    const jobs = Array.from(this.jobs.values());
    
    if (filter.status) {
      return jobs.filter(job => job.status === filter.status);
    }
    
    return jobs;
  }

  /**
   * Get the current queue (all jobs)
   */
  getQueue() {
    return Array.from(this.jobs.values());
  }

  /**
   * Clear completed/failed jobs
   */
  clearCompletedJobs() {
    const toRemove = [];
    
    for (const [jobId, job] of this.jobs) {
      if (['completed', 'failed'].includes(job.status)) {
        toRemove.push(jobId);
      }
    }
    
    toRemove.forEach(jobId => this.removeJob(jobId));
    console.log(`[${this.name}] Cleared ${toRemove.length} completed/failed jobs`);
  }

  /**
   * Pause the queue
   */
  pause() {
    this.isRunning = false;
    this.emit('queue:paused');
    console.log(`[${this.name}] Queue paused`);
  }

  /**
   * Resume the queue
   */
  resume() {
    this.isRunning = true;
    this.emit('queue:resumed');
    console.log(`[${this.name}] Queue resumed`);
    this.processNext();
  }

  /**
   * Stop the queue and clear all jobs
   */
  stop() {
    this.isRunning = false;
    this.jobs.clear();
    this.queued = [];
    this.processing.clear();
    this.emit('queue:stopped');
    console.log(`[${this.name}] Queue stopped`);
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

async function runExample() {
  console.log('🚀 Starting Process Queue Example\n');

  // Create a queue instance
  const queue = new ProcessQueue({
    name: 'example-queue',
    maxConcurrent: 3,
    retryAttempts: 2,
    retryDelay: 2000,
    jobTimeout: 15000
  });

  // Set up event listeners
  queue.on('job:added', (job) => {
    console.log(`📝 Job added: ${job.id} (${job.data.type})`);
  });

  queue.on('job:started', (job) => {
    console.log(`▶️  Job started: ${job.id}`);
  });

  queue.on('job:completed', (job) => {
    console.log(`✅ Job completed: ${job.id} in ${job.processingTime}ms`);
  });

  queue.on('job:failed', (job) => {
    console.log(`❌ Job failed: ${job.id} - ${job.error}`);
  });

  queue.on('job:retry', (job) => {
    console.log(`🔄 Job retry: ${job.id} (attempt ${job.attempts})`);
  });

  // Add some example jobs
  console.log('\n📋 Adding example jobs...\n');

  // High priority email job
  queue.addJob(
    { type: 'email', to: 'user@example.com', subject: 'Welcome!' },
    { priority: 10, maxAttempts: 3 }
  );

  // Regular file processing job
  queue.addJob(
    { type: 'file', filename: 'document.pdf', size: 1024000 },
    { priority: 5 }
  );

  // API call job
  queue.addJob(
    { type: 'api', endpoint: '/api/users', method: 'POST' },
    { priority: 3 }
  );

  // Slow processing job
  queue.addJob(
    { type: 'slow', description: 'Data analysis' },
    { priority: 1 }
  );

  // More jobs to demonstrate concurrency
  for (let i = 0; i < 5; i++) {
    queue.addJob(
      { type: 'email', to: `user${i}@example.com`, subject: `Newsletter ${i}` },
      { priority: Math.floor(Math.random() * 5) }
    );
  }

  // Monitor the queue
  const statsInterval = setInterval(() => {
    const stats = queue.getStats();
    console.log(`\n📊 Queue Stats:`, {
      queued: stats.queued,
      processing: stats.processing,
      completed: stats.completed,
      failed: stats.failed,
      retried: stats.retried,
      avgProcessingTime: Math.round(stats.avgProcessingTime)
    });
  }, 3000);

  // Stop after 30 seconds
  setTimeout(() => {
    clearInterval(statsInterval);
    console.log('\n🛑 Stopping queue...');
    queue.stop();
    console.log('✅ Example completed!');
  }, 30000);
}

// ============================================================================
// ADVANCED EXAMPLE: MULTIPLE QUEUES
// ============================================================================

async function runAdvancedExample() {
  console.log('\n🎯 Advanced Example: Multiple Queues\n');

  // Create specialized queues
  const emailQueue = new ProcessQueue({
    name: 'email-queue',
    maxConcurrent: 2,
    retryAttempts: 3
  });

  const fileQueue = new ProcessQueue({
    name: 'file-queue',
    maxConcurrent: 1,
    retryAttempts: 2
  });

  const apiQueue = new ProcessQueue({
    name: 'api-queue',
    maxConcurrent: 5,
    retryAttempts: 1
  });

  // Add jobs to different queues
  emailQueue.addJob({ type: 'email', to: 'admin@example.com', subject: 'System Alert' });
  fileQueue.addJob({ type: 'file', filename: 'large-file.zip', size: 50000000 });
  apiQueue.addJob({ type: 'api', endpoint: '/api/webhook', method: 'POST' });

  // Monitor all queues
  const monitorInterval = setInterval(() => {
    console.log('\n📈 Multi-Queue Status:');
    console.log('Email Queue:', emailQueue.getStats());
    console.log('File Queue:', fileQueue.getStats());
    console.log('API Queue:', apiQueue.getStats());
  }, 5000);

  // Stop after 20 seconds
  setTimeout(() => {
    clearInterval(monitorInterval);
    emailQueue.stop();
    fileQueue.stop();
    apiQueue.stop();
    console.log('✅ Advanced example completed!');
  }, 20000);
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

if (require.main === module) {
  // Run basic example
  runExample().catch(console.error);
  
  // Run advanced example after a delay
  setTimeout(() => {
    runAdvancedExample().catch(console.error);
  }, 35000);
}

module.exports = ProcessQueue;
