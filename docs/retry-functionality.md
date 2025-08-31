# Upload Queue Retry Functionality

## Overview

The retry functionality allows users to retry failed upload queue jobs that are in 'error' or 'fail' status. This feature helps recover from temporary failures without having to re-upload files.

## How It Works

### Retry Process

1. **Status Check**: The system checks if the job is in 'error' or 'fail' status
2. **Conflict Check**: Verifies no other job with the same file path is already queued
3. **Status Reset**: Updates the job status to 'queued' and clears error fields
4. **Processing**: Sends the job to the webhook for processing

### Unique Constraint Handling

The system has a unique constraint on `[file_path, status]` to prevent duplicate processing. This means:

- Only one job per file path can be in 'queued' status at a time
- If a retry is attempted but another job with the same file is already queued, the retry will fail
- The system provides clear error messages when this happens

## User Interface

### Individual Retry

- **Location**: Process Queue page → Job actions dropdown → Retry button
- **Visibility**: Only shown for jobs in 'error' or 'fail' status
- **Action**: Retries the specific job

### Bulk Retry

- **Location**: Process Queue page → Select multiple jobs → Bulk retry button
- **Visibility**: Only shown when at least one selected job is retryable
- **Action**: Retries all selected jobs that are in retryable state

## Error Messages

### Common Error Messages

1. **"Cannot retry: there is already a queued job with the same file path"**
   - **Cause**: Another job with the same file is already queued
   - **Solution**: Wait for the existing job to complete or delete it first

2. **"Job is not in a retryable state"**
   - **Cause**: Job status is not 'error' or 'fail'
   - **Solution**: Only jobs in error/fail state can be retried

3. **"Failed to retry job"**
   - **Cause**: Network or server error
   - **Solution**: Check server logs and try again

## Troubleshooting

### Testing Retry Functionality

Run the test script to check the current state of upload queue jobs:

```bash
node scripts/test-retry.js
```

This script will:
- Show jobs in error/fail state
- Check for unique constraint conflicts
- Identify jobs that can be retried
- Display recent upload queue activity

### Common Issues

1. **Retry button not visible**
   - Check if the job is in 'error' or 'fail' status
   - Verify user has UPLOAD_QUEUE_MANAGE permissions

2. **Retry fails immediately**
   - Check for unique constraint conflicts
   - Verify webhook configuration is correct
   - Check server logs for detailed error messages

3. **Bulk retry shows mixed results**
   - Some jobs may fail due to conflicts
   - Check the detailed error messages in the response

### Server Logs

When retry operations are performed, the server logs will show:

```
Processing/retrying job [job-id]...
Job [job-id] current status: error
Is retry operation: true
Resetting job [job-id] status from error to queued
Job [job-id] status reset successfully
Processing job [job-id] with status: queued
Job [job-id] processing result: [result]
```

## API Endpoints

### Individual Retry

```
POST /api/upload-queue/{id}
```

**Response:**
- `200`: Job retried successfully
- `400`: Job not in retryable state or conflict exists
- `401`: Unauthorized
- `403`: Insufficient permissions
- `404`: Job not found
- `500`: Server error

### Bulk Retry

```
POST /api/upload-queue/bulk-action
```

**Request Body:**
```json
{
  "action": "retry",
  "itemIds": ["job-id-1", "job-id-2"]
}
```

**Response:**
```json
{
  "successCount": 2,
  "failCount": 1,
  "failedDetails": [
    {
      "itemId": "job-id-3",
      "reason": "Cannot retry: there is already a queued job with the same file path"
    }
  ]
}
```

## Best Practices

1. **Check job status before retrying**: Only retry jobs that are actually in error/fail state
2. **Resolve conflicts first**: If a retry fails due to file path conflicts, resolve the existing job first
3. **Monitor webhook health**: Ensure the external webhook service is working properly
4. **Use bulk operations carefully**: Bulk retry may fail for some jobs due to conflicts

## Configuration

### Webhook Settings

The retry functionality depends on proper webhook configuration:

- `resumeProcessingWebhookUrl`: URL of the processing service
- `resumeProcessingWebhookToken`: Authentication token
- `resumeProcessingWebhookTimeout`: Timeout for webhook requests
- `webhookConnectionTimeout`: Connection timeout for webhook requests

### Permissions

Users need the `UPLOAD_QUEUE_MANAGE` permission or Admin role to use retry functionality.
