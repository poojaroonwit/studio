/**
 * TypeScript Process Queue Example
 * 
 * This is a TypeScript version of the process queue with full type safety.
 */

const { EventEmitter } = require('events');
const { randomUUID } = require('crypto');

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface JobData {
  type: 'email' | 'file' | 'api' | 'slow' | 'custom';
  [key: string]: any;
}

export interface JobOptions {
  priority?: number;
  maxAttempts?: number;
  timeout?: number;
}

export interface Job {
  id: string;
  data: JobData;
  priority: number;
  attempts: number;
  maxAttempts: number;
  timeout: number;
  createdAt: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  lastError?: string;
  startedAt?: number;
  completedAt?: number;
  processingTime?: number;
}

export interface QueueStats {
  total: number;
  completed: number;
  failed: number;
  retried: number;
  avgProcessingTime: number;
  queued: number;
  processing: number;
  totalJobs: number;
}

export interface QueueOptions {
  name?: string;
  maxConcurrent?: number;
  retryAttempts?: number;
  retryDelay?: number;
  jobTimeout?: number;
}

export interface JobFilter {
  status?: Job['status'];
}

// ============================================================================
// QUEUE CLASS DEFINITION
// ============================================================================

export class ProcessQueue extends EventEmitter {
  private name: string;
  private maxConcurrent: number;
  private retryAttempts: number;
  private retryDelay: number;
  private jobTimeout: number;
  
  private jobs: Map<string, Job> = new Map();
  private queued: string[] = [];
  private processing: Set<string> = new Set();
  private workers: Set<any> = new Set();
  private stats: QueueStats = {
    total: 0,
    completed: 0,
    failed: 0,
    retried: 0,
    avgProcessingTime: 0,
    queued: 0,
    processing: 0,
    totalJobs: 0
  };
  
  private isRunning: boolean = true;

  constructor(options: QueueOptions = {}) {
    super();
    
    this.name = options.name || 'default-queue';
    this.maxConcurrent = options.maxConcurrent || 5;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 5000;
    this.jobTimeout = options.jobTimeout || 30000;
    
    // Start the queue
    this.processNext();
  }

  // ============================================================================
  // JOB MANAGEMENT
  // ============================================================================

  /**
   * Add a job to the queue
   */
  addJob(jobData: JobData, options: JobOptions = {}): string {
    const job: Job = {
      id: randomUUID(),
      data: jobData,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || this.retryAttempts,
      timeout: options.timeout || this.jobTimeout,
      createdAt: Date.now(),
      status: 'queued',
      result: undefined,
      error: undefined
    };

    this.jobs.set(job.id, job);
    this.queued.push(job.id);
    this.stats.total++;
    this.updateStats();

    // Sort queue by priority (highest first), then by creation time
    this.queued.sort((a, b) => {
      const jobA = this.jobs.get(a)!;
      const jobB = this.jobs.get(b)!;
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
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Remove a job from the queue
   */
  removeJob(jobId: string): boolean {
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
    this.updateStats();
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
  private async processNext(): Promise<void> {
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
    this.updateStats();

    this.emit('job:started', job);
    console.log(`[${this.name}] Processing job: ${jobId}`);

    // Process the job
    this.processJob(job);
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
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
      this.handleJobError(job, error as Error);
    }
  }

  /**
   * Execute the actual job (this is where your business logic goes)
   */
  private async executeJob(job: Job): Promise<any> {
    const { type, ...data } = job.data;
    
    switch (type) {
      case 'email':
        return await this.processEmailJob(data as EmailJobData);
      case 'file':
        return await this.processFileJob(data as FileJobData);
      case 'api':
        return await this.processApiJob(data as ApiJobData);
      case 'slow':
        return await this.processSlowJob(data as SlowJobData);
      case 'custom':
        return await this.processCustomJob(data);
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }

  // ============================================================================
  // JOB TYPE HANDLERS
  // ============================================================================

  private async processEmailJob(data: EmailJobData): Promise<EmailJobResult> {
    console.log(`[${this.name}] Processing email job: ${data.to}`);
    await this.simulateWork(1000 + Math.random() * 2000); // 1-3 seconds
    
    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Email service temporarily unavailable');
    }
    
    return { sent: true, messageId: randomUUID() };
  }

  private async processFileJob(data: FileJobData): Promise<FileJobResult> {
    console.log(`[${this.name}] Processing file job: ${data.filename}`);
    await this.simulateWork(2000 + Math.random() * 3000); // 2-5 seconds
    
    return { processed: true, size: data.size, checksum: randomUUID() };
  }

  private async processApiJob(data: ApiJobData): Promise<ApiJobResult> {
    console.log(`[${this.name}] Processing API job: ${data.endpoint}`);
    await this.simulateWork(500 + Math.random() * 1500); // 0.5-2 seconds
    
    return { success: true, response: { status: 200, data: 'processed' } };
  }

  private async processSlowJob(data: SlowJobData): Promise<SlowJobResult> {
    console.log(`[${this.name}] Processing slow job: ${data.description}`);
    await this.simulateWork(5000 + Math.random() * 5000); // 5-10 seconds
    
    return { completed: true, duration: Date.now() };
  }

  private async processCustomJob(data: any): Promise<any> {
    console.log(`[${this.name}] Processing custom job:`, data);
    await this.simulateWork(1000 + Math.random() * 2000);
    
    return { success: true, customResult: 'processed' };
  }

  private async simulateWork(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  // ============================================================================
  // JOB COMPLETION HANDLERS
  // ============================================================================

  private completeJob(job: Job, result: any): void {
    job.status = 'completed';
    job.result = result;
    job.completedAt = Date.now();
    job.processingTime = job.completedAt - job.startedAt!;

    this.processing.delete(job.id);
    this.stats.completed++;
    
    // Update average processing time
    this.stats.avgProcessingTime = 
      (this.stats.avgProcessingTime * (this.stats.completed - 1) + job.processingTime!) / this.stats.completed;

    this.updateStats();
    this.emit('job:completed', job);
    console.log(`[${this.name}] Job completed: ${job.id} (${job.processingTime}ms)`);

    // Process next job
    this.processNext();
  }

  private handleJobError(job: Job, error: Error): void {
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
      
      this.updateStats();
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
    this.updateStats();
    this.processNext();
  }

  private handleJobTimeout(job: Job): void {
    const error = new Error(`Job timeout after ${job.timeout}ms`);
    this.handleJobError(job, error);
  }

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================

  /**
   * Update queue statistics
   */
  private updateStats(): void {
    this.stats.queued = this.queued.length;
    this.stats.processing = this.processing.size;
    this.stats.totalJobs = this.jobs.size;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return { ...this.stats };
  }

  /**
   * Get all jobs with optional filtering
   */
  getJobs(filter: JobFilter = {}): Job[] {
    const jobs = Array.from(this.jobs.values());
    
    if (filter.status) {
      return jobs.filter(job => job.status === filter.status);
    }
    
    return jobs;
  }

  /**
   * Clear completed/failed jobs
   */
  clearCompletedJobs(): void {
    const toRemove: string[] = [];
    
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
  pause(): void {
    this.isRunning = false;
    this.emit('queue:paused');
    console.log(`[${this.name}] Queue paused`);
  }

  /**
   * Resume the queue
   */
  resume(): void {
    this.isRunning = true;
    this.emit('queue:resumed');
    console.log(`[${this.name}] Queue resumed`);
    this.processNext();
  }

  /**
   * Stop the queue and clear all jobs
   */
  stop(): void {
    this.isRunning = false;
    this.jobs.clear();
    this.queued = [];
    this.processing.clear();
    this.updateStats();
    this.emit('queue:stopped');
    console.log(`[${this.name}] Queue stopped`);
  }
}

// ============================================================================
// TYPE DEFINITIONS FOR JOB DATA
// ============================================================================

export interface EmailJobData {
  to: string;
  subject: string;
  body?: string;
}

export interface FileJobData {
  filename: string;
  size: number;
  action?: string;
}

export interface ApiJobData {
  endpoint: string;
  method: string;
  data?: any;
}

export interface SlowJobData {
  description: string;
}

export interface EmailJobResult {
  sent: boolean;
  messageId: string;
}

export interface FileJobResult {
  processed: boolean;
  size: number;
  checksum: string;
}

export interface ApiJobResult {
  success: boolean;
  response: {
    status: number;
    data: any;
  };
}

export interface SlowJobResult {
  completed: boolean;
  duration: number;
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

async function runTypeScriptExample(): Promise<void> {
  console.log('🚀 Starting TypeScript Process Queue Example\n');

  // Create a queue instance with proper typing
  const queue = new ProcessQueue({
    name: 'typescript-queue',
    maxConcurrent: 3,
    retryAttempts: 2,
    retryDelay: 2000,
    jobTimeout: 15000
  });

  // Set up event listeners with proper typing
  queue.on('job:added', (job: Job) => {
    console.log(`📝 Job added: ${job.id} (${job.data.type})`);
  });

  queue.on('job:started', (job: Job) => {
    console.log(`▶️  Job started: ${job.id}`);
  });

  queue.on('job:completed', (job: Job) => {
    console.log(`✅ Job completed: ${job.id} in ${job.processingTime}ms`);
  });

  queue.on('job:failed', (job: Job) => {
    console.log(`❌ Job failed: ${job.id} - ${job.error}`);
  });

  queue.on('job:retry', (job: Job) => {
    console.log(`🔄 Job retry: ${job.id} (attempt ${job.attempts})`);
  });

  // Add typed jobs
  console.log('\n📋 Adding typed jobs...\n');

  // Email job with proper typing
  queue.addJob({
    type: 'email',
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Thank you for signing up!'
  } as JobData, { priority: 10 });

  // File job with proper typing
  queue.addJob({
    type: 'file',
    filename: 'document.pdf',
    size: 1024000,
    action: 'compress'
  } as JobData, { priority: 5 });

  // API job with proper typing
  queue.addJob({
    type: 'api',
    endpoint: '/api/users',
    method: 'POST',
    data: { name: 'John Doe', email: 'john@example.com' }
  } as JobData, { priority: 3 });

  // Custom job
  queue.addJob({
    type: 'custom',
    customField: 'custom value',
    timestamp: Date.now()
  } as JobData, { priority: 1 });

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
    console.log('✅ TypeScript example completed!');
  }, 30000);
}

// Export for use in other files
export default ProcessQueue;

// Run example if this file is executed directly
if (require.main === module) {
  runTypeScriptExample().catch(console.error);
}
