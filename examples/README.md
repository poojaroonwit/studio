# Process Queue Examples

This directory contains examples of how to implement and use a process queue system for handling background tasks.

## 📁 Files

- **`process-queue-example.js`** - Complete process queue implementation with advanced features
- **`simple-queue-example.js`** - Basic example showing simple queue usage
- **`README.md`** - This documentation file

## 🚀 Quick Start

### Running the Simple Example

```bash
node examples/simple-queue-example.js
```

### Running the Full Example

```bash
node examples/process-queue-example.js
```

## 📋 What is a Process Queue?

A process queue is a system that manages background tasks (jobs) by:

1. **Queuing** tasks for later processing
2. **Processing** tasks in order (FIFO or priority-based)
3. **Handling** errors and retries automatically
4. **Limiting** concurrent processing to prevent system overload
5. **Monitoring** job status and performance

## 🎯 Common Use Cases

- **Email sending** - Queue emails to avoid blocking user requests
- **File processing** - Compress, resize, or convert files in background
- **API calls** - Make external API requests asynchronously
- **Data processing** - Handle large datasets without blocking the main application
- **Report generation** - Create reports in the background

## 🔧 Basic Usage

### 1. Create a Queue

```javascript
const ProcessQueue = require('./process-queue-example');

const queue = new ProcessQueue({
  name: 'my-queue',
  maxConcurrent: 3,    // Process 3 jobs at once
  retryAttempts: 2,    // Retry failed jobs 2 times
  retryDelay: 5000     // Wait 5 seconds between retries
});
```

### 2. Add Jobs

```javascript
// Add a simple job
queue.addJob({
  type: 'email',
  to: 'user@example.com',
  subject: 'Welcome!'
});

// Add a job with priority
queue.addJob({
  type: 'file',
  filename: 'document.pdf'
}, {
  priority: 10,        // Higher priority (processed first)
  maxAttempts: 3       // Custom retry attempts
});
```

### 3. Monitor Progress

```javascript
// Listen for events
queue.on('job:completed', (job) => {
  console.log(`Job ${job.id} completed!`);
});

queue.on('job:failed', (job) => {
  console.log(`Job ${job.id} failed: ${job.error}`);
});

// Get statistics
const stats = queue.getStats();
console.log(`Queued: ${stats.queued}, Processing: ${stats.processing}`);
```

## ⚙️ Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `name` | `'default-queue'` | Queue name for logging |
| `maxConcurrent` | `5` | Maximum jobs processed simultaneously |
| `retryAttempts` | `3` | Number of retry attempts for failed jobs |
| `retryDelay` | `5000` | Base delay between retries (ms) |
| `jobTimeout` | `30000` | Maximum time to process a job (ms) |

## 🎨 Job Types

The example includes these job types:

### Email Jobs
```javascript
{
  type: 'email',
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Thank you for signing up!'
}
```

### File Jobs
```javascript
{
  type: 'file',
  filename: 'document.pdf',
  size: 1024000,
  action: 'compress'
}
```

### API Jobs
```javascript
{
  type: 'api',
  endpoint: '/api/users',
  method: 'POST',
  data: { name: 'John Doe' }
}
```

### Slow Jobs
```javascript
{
  type: 'slow',
  description: 'Data analysis'
}
```

## 🔄 Job Lifecycle

1. **Queued** - Job is added to the queue
2. **Processing** - Job is being executed
3. **Completed** - Job finished successfully
4. **Failed** - Job failed after all retry attempts
5. **Retry** - Job failed but will be retried

## 📊 Monitoring and Statistics

```javascript
const stats = queue.getStats();
console.log({
  queued: stats.queued,           // Jobs waiting to be processed
  processing: stats.processing,   // Jobs currently being processed
  completed: stats.completed,     // Successfully completed jobs
  failed: stats.failed,          // Jobs that failed permanently
  retried: stats.retried,        // Total retry attempts
  avgProcessingTime: stats.avgProcessingTime  // Average processing time
});
```

## 🛠️ Advanced Features

### Priority Queue
Jobs with higher priority are processed first:

```javascript
queue.addJob(jobData, { priority: 10 });  // High priority
queue.addJob(jobData, { priority: 5 });   // Medium priority
queue.addJob(jobData, { priority: 1 });   // Low priority
```

### Custom Timeouts
Set different timeouts for different job types:

```javascript
queue.addJob(jobData, { timeout: 60000 });  // 60 second timeout
```

### Job Management
```javascript
// Get a specific job
const job = queue.getJob(jobId);

// Remove a job
queue.removeJob(jobId);

// Clear completed jobs
queue.clearCompletedJobs();

// Pause/resume queue
queue.pause();
queue.resume();
```

## 🎯 Real-World Example

Here's how you might use a process queue in a web application:

```javascript
// In your web server
app.post('/api/send-email', (req, res) => {
  // Add email to queue instead of sending immediately
  const jobId = emailQueue.addJob({
    type: 'email',
    to: req.body.to,
    subject: req.body.subject,
    body: req.body.body
  });
  
  // Return immediately with job ID
  res.json({ 
    success: true, 
    jobId: jobId,
    message: 'Email queued for sending' 
  });
});

// Check job status
app.get('/api/job/:jobId', (req, res) => {
  const job = emailQueue.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json({
    id: job.id,
    status: job.status,
    result: job.result,
    error: job.error
  });
});
```

## 🚨 Error Handling

The queue automatically handles:

- **Job failures** - Retries with exponential backoff
- **Timeouts** - Kills jobs that take too long
- **Concurrent limits** - Prevents system overload
- **Memory management** - Cleans up completed jobs

## 🔧 Customization

To add your own job types, extend the `executeJob` method:

```javascript
async executeJob(job) {
  const { type, data } = job.data;
  
  switch (type) {
    case 'email':
      return await this.processEmailJob(data);
    case 'file':
      return await this.processFileJob(data);
    case 'custom':
      return await this.processCustomJob(data);  // Your custom logic
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}

async processCustomJob(data) {
  // Your custom job processing logic here
  console.log('Processing custom job:', data);
  await this.simulateWork(2000);
  return { success: true, customResult: 'processed' };
}
```

## 📈 Performance Tips

1. **Set appropriate concurrency limits** - Don't overwhelm your system
2. **Use timeouts** - Prevent jobs from hanging indefinitely
3. **Monitor memory usage** - Clear completed jobs periodically
4. **Use priority queues** - Process important jobs first
5. **Implement proper error handling** - Log and handle failures gracefully

## 🔍 Troubleshooting

### Common Issues

1. **Jobs not processing** - Check if queue is paused or maxConcurrent is set too low
2. **High memory usage** - Clear completed jobs regularly
3. **Jobs timing out** - Increase jobTimeout or optimize job processing
4. **Too many retries** - Check if jobs are failing due to external service issues

### Debug Mode

Enable detailed logging by listening to all events:

```javascript
queue.on('job:added', (job) => console.log('Job added:', job.id));
queue.on('job:started', (job) => console.log('Job started:', job.id));
queue.on('job:completed', (job) => console.log('Job completed:', job.id));
queue.on('job:failed', (job) => console.log('Job failed:', job.id));
queue.on('job:retry', (job) => console.log('Job retry:', job.id));
```

## 📚 Further Reading

- [Node.js EventEmitter documentation](https://nodejs.org/api/events.html)
- [Queue theory and best practices](https://en.wikipedia.org/wiki/Queueing_theory)
- [Background job processing patterns](https://en.wikipedia.org/wiki/Background_job)
