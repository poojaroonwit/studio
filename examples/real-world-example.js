/**
 * Real-World Process Queue Example
 * 
 * This example demonstrates how to use the process queue in a real web application
 * scenario, such as handling user uploads, sending notifications, and processing data.
 */

const ProcessQueue = require('./process-queue-example');

// Simulate a web application with different types of background tasks
class WebApplication {
  constructor() {
    // Create specialized queues for different types of work
    this.uploadQueue = new ProcessQueue({
      name: 'upload-queue',
      maxConcurrent: 2,  // Limit upload processing to prevent server overload
      retryAttempts: 3,
      retryDelay: 5000
    });

    this.emailQueue = new ProcessQueue({
      name: 'email-queue',
      maxConcurrent: 5,  // Can send multiple emails concurrently
      retryAttempts: 2,
      retryDelay: 3000
    });

    this.dataProcessingQueue = new ProcessQueue({
      name: 'data-processing-queue',
      maxConcurrent: 1,  // Heavy processing, one at a time
      retryAttempts: 1,
      retryDelay: 10000
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Monitor upload queue
    this.uploadQueue.on('job:completed', (job) => {
      console.log(`📁 Upload processed: ${job.data.filename} -> ${job.result.url}`);
    });

    this.uploadQueue.on('job:failed', (job) => {
      console.log(`❌ Upload failed: ${job.data.filename} - ${job.error}`);
    });

    // Monitor email queue
    this.emailQueue.on('job:completed', (job) => {
      console.log(`📧 Email sent: ${job.data.to} (${job.result.messageId})`);
    });

    // Monitor data processing queue
    this.dataProcessingQueue.on('job:completed', (job) => {
      console.log(`📊 Data processed: ${job.data.dataset} -> ${job.result.records} records`);
    });
  }

  // Simulate user uploading a file
  handleFileUpload(userId, file) {
    console.log(`👤 User ${userId} uploaded: ${file.name} (${file.size} bytes)`);
    
    // Add to upload queue instead of processing immediately
    const jobId = this.uploadQueue.addJob({
      type: 'file',
      filename: file.name,
      size: file.size,
      userId: userId,
      action: 'process_and_store'
    }, {
      priority: 5,
      timeout: 60000  // 60 second timeout for large files
    });

    // Return immediately with job ID
    return {
      success: true,
      jobId: jobId,
      message: 'File uploaded successfully and queued for processing'
    };
  }

  // Simulate user registration
  handleUserRegistration(userData) {
    console.log(`👤 New user registration: ${userData.email}`);
    
    // Send welcome email
    const emailJobId = this.emailQueue.addJob({
      type: 'email',
      to: userData.email,
      subject: 'Welcome to Our Service!',
      body: `Hi ${userData.name}, welcome to our platform!`
    }, {
      priority: 10,  // High priority for welcome emails
      timeout: 30000
    });

    // Process user data for analytics
    const dataJobId = this.dataProcessingQueue.addJob({
      type: 'slow',
      description: 'Process user registration data',
      dataset: 'user_registrations',
      userId: userData.id,
      data: userData
    }, {
      priority: 1,  // Low priority for analytics
      timeout: 120000  // 2 minutes for data processing
    });

    return {
      success: true,
      emailJobId: emailJobId,
      dataJobId: dataJobId,
      message: 'User registered successfully'
    };
  }

  // Simulate bulk data import
  handleBulkDataImport(importData) {
    console.log(`📦 Bulk import: ${importData.records.length} records`);
    
    // Process each record in the queue
    const jobIds = importData.records.map((record, index) => {
      return this.dataProcessingQueue.addJob({
        type: 'slow',
        description: `Process import record ${index + 1}`,
        dataset: importData.dataset,
        record: record
      }, {
        priority: 3,
        timeout: 30000
      });
    });

    return {
      success: true,
      jobIds: jobIds,
      totalRecords: importData.records.length,
      message: 'Bulk import queued for processing'
    };
  }

  // Get status of all queues
  getQueueStatus() {
    return {
      uploads: this.uploadQueue.getStats(),
      emails: this.emailQueue.getStats(),
      dataProcessing: this.dataProcessingQueue.getStats()
    };
  }

  // Get specific job status
  getJobStatus(queueName, jobId) {
    const queue = this[`${queueName}Queue`];
    if (!queue) {
      throw new Error(`Unknown queue: ${queueName}`);
    }
    
    const job = queue.getJob(jobId);
    if (!job) {
      return { error: 'Job not found' };
    }

    return {
      id: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
      processingTime: job.processingTime,
      attempts: job.attempts
    };
  }
}

// Run the real-world example
async function runRealWorldExample() {
  console.log('🌐 Starting Real-World Process Queue Example\n');

  const app = new WebApplication();

  // Simulate user activities
  console.log('📋 Simulating user activities...\n');

  // 1. User uploads files
  console.log('1️⃣ User uploads files:');
  const upload1 = app.handleFileUpload('user123', { name: 'document.pdf', size: 2048000 });
  const upload2 = app.handleFileUpload('user456', { name: 'image.jpg', size: 1024000 });
  const upload3 = app.handleFileUpload('user789', { name: 'video.mp4', size: 52428800 });

  // 2. New user registrations
  console.log('\n2️⃣ New user registrations:');
  const reg1 = app.handleUserRegistration({
    id: 'user001',
    name: 'John Doe',
    email: 'john@example.com'
  });
  const reg2 = app.handleUserRegistration({
    id: 'user002',
    name: 'Jane Smith',
    email: 'jane@example.com'
  });

  // 3. Bulk data import
  console.log('\n3️⃣ Bulk data import:');
  const bulkImport = app.handleBulkDataImport({
    dataset: 'customer_data',
    records: [
      { id: 1, name: 'Customer 1', email: 'customer1@example.com' },
      { id: 2, name: 'Customer 2', email: 'customer2@example.com' },
      { id: 3, name: 'Customer 3', email: 'customer3@example.com' }
    ]
  });

  // Monitor queue status
  console.log('\n📊 Monitoring queue status...\n');
  
  const monitorInterval = setInterval(() => {
    const status = app.getQueueStatus();
    
    console.log('📈 Queue Status:');
    console.log(`  Uploads: ${status.uploads.queued} queued, ${status.uploads.processing} processing, ${status.uploads.completed} completed`);
    console.log(`  Emails: ${status.emails.queued} queued, ${status.emails.processing} processing, ${status.emails.completed} completed`);
    console.log(`  Data Processing: ${status.dataProcessing.queued} queued, ${status.dataProcessing.processing} processing, ${status.dataProcessing.completed} completed`);
    
    // Check if all queues are done
    const totalQueued = status.uploads.queued + status.emails.queued + status.dataProcessing.queued;
    const totalProcessing = status.uploads.processing + status.emails.processing + status.dataProcessing.processing;
    
    if (totalQueued === 0 && totalProcessing === 0) {
      clearInterval(monitorInterval);
      console.log('\n✅ All jobs completed!');
      
      // Show final statistics
      console.log('\n📊 Final Statistics:');
      console.log(`  Total uploads processed: ${status.uploads.completed}`);
      console.log(`  Total emails sent: ${status.emails.completed}`);
      console.log(`  Total data records processed: ${status.dataProcessing.completed}`);
      
      // Clean up
      app.uploadQueue.stop();
      app.emailQueue.stop();
      app.dataProcessingQueue.stop();
    }
  }, 2000);

  // Stop after 60 seconds if not done
  setTimeout(() => {
    clearInterval(monitorInterval);
    console.log('\n⏰ Timeout reached, stopping queues...');
    app.uploadQueue.stop();
    app.emailQueue.stop();
    app.dataProcessingQueue.stop();
  }, 60000);
}

// Run the example
if (require.main === module) {
  runRealWorldExample().catch(console.error);
}

module.exports = WebApplication;
