/**
 * Simple Process Queue Example
 * 
 * This is a basic example showing how to use a process queue
 * for handling background tasks like sending emails and processing files.
 */

const ProcessQueue = require('./process-queue-example');

// Create a simple queue for processing tasks
const taskQueue = new ProcessQueue({
  name: 'task-queue',
  maxConcurrent: 2,  // Process 2 jobs at the same time
  retryAttempts: 2,  // Retry failed jobs 2 times
  retryDelay: 3000   // Wait 3 seconds between retries
});

// Example 1: Simple email sending
console.log('📧 Example 1: Sending emails...');

taskQueue.addJob({
  type: 'email',
  to: 'user@example.com',
  subject: 'Welcome to our service!',
  body: 'Thank you for signing up!'
});

taskQueue.addJob({
  type: 'email',
  to: 'admin@example.com',
  subject: 'Daily Report',
  body: 'Here is your daily summary...'
});

// Example 2: File processing
console.log('📁 Example 2: Processing files...');

taskQueue.addJob({
  type: 'file',
  filename: 'document.pdf',
  size: 1024000,
  action: 'compress'
});

taskQueue.addJob({
  type: 'file',
  filename: 'image.jpg',
  size: 2048000,
  action: 'resize'
});

// Example 3: API calls
console.log('🌐 Example 3: Making API calls...');

taskQueue.addJob({
  type: 'api',
  endpoint: '/api/users',
  method: 'POST',
  data: { name: 'John Doe', email: 'john@example.com' }
});

// Monitor the queue
console.log('\n📊 Monitoring queue status...\n');

const interval = setInterval(() => {
  const stats = taskQueue.getStats();
  console.log(`Status: ${stats.queued} queued, ${stats.processing} processing, ${stats.completed} completed, ${stats.failed} failed`);
  
  // Stop monitoring after all jobs are done
  if (stats.queued === 0 && stats.processing === 0) {
    clearInterval(interval);
    console.log('\n✅ All jobs completed!');
    
    // Show final results
    const jobs = taskQueue.getJobs();
    console.log('\n📋 Job Results:');
    jobs.forEach(job => {
      const status = job.status === 'completed' ? '✅' : job.status === 'failed' ? '❌' : '⏳';
      console.log(`${status} ${job.id}: ${job.data.type} - ${job.status}`);
      if (job.result) {
        console.log(`   Result: ${JSON.stringify(job.result)}`);
      }
      if (job.error) {
        console.log(`   Error: ${job.error}`);
      }
    });
    
    // Clean up
    taskQueue.stop();
  }
}, 1000);

// Stop after 30 seconds if not done
setTimeout(() => {
  clearInterval(interval);
  console.log('\n⏰ Timeout reached, stopping queue...');
  taskQueue.stop();
}, 30000);
