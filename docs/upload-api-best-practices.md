# Upload API Best Practices

## Overview

The refactored upload API (`/api/upload-queue/upload-file`) implements atomic MinIO+DB operations with robust error handling, retry logic, and comprehensive validation. This document outlines the best practices implemented and how to use the API effectively.

## Key Features

### 🔒 **Security & Validation**
- **File Type Validation**: Only PDF files are accepted
- **File Size Limits**: Maximum 500MB per file
- **File Name Security**: Prevents path traversal attacks
- **Authentication**: Requires valid session with appropriate permissions
- **Authorization**: Checks for `BULK_UPLOAD` or `UPLOAD_QUEUE_MANAGE` permissions

### ⚡ **Performance & Reliability**
- **Atomic Operations**: MinIO upload and DB insert happen in a single transaction
- **Retry Logic**: Exponential backoff for transient failures
- **Batch Processing**: Supports up to 50 files per request
- **Cleanup**: Automatic cleanup of MinIO files if DB insert fails
- **Progress Tracking**: Real-time updates via SSE

### 📊 **Monitoring & Observability**
- **Comprehensive Logging**: All operations are logged with audit trails
- **Performance Metrics**: Processing time tracking
- **Error Classification**: Distinguishes between retryable and non-retryable errors
- **Webhook Integration**: Automatic webhook dispatch for successful uploads

## API Endpoint

```
POST /api/upload-queue/upload-file
```

### Request Format

**Content-Type**: `multipart/form-data`

**Parameters**:
- `files` (required): Array of PDF files
- `position_id` (optional): UUID of position to assign files to
- `batch_id` (optional): Custom batch ID for grouping uploads
- `source` (optional): Source identifier (default: 'bulk')
- `webhook_payload` (optional): JSON string for additional webhook data

### Response Format

**Success (200)**: All files uploaded successfully
**Partial Success (207)**: Some files succeeded, some failed
**Error (4xx/5xx)**: Request-level errors

```json
{
  "results": [
    {
      "file_name": "resume.pdf",
      "status": "success",
      "file_path": "uploads/uuid.pdf",
      "file_size": 123456,
      "queue_id": "uuid"
    },
    {
      "file_name": "invalid.txt",
      "status": "failed",
      "error": "Invalid file type. Only PDF files are allowed."
    }
  ],
  "summary": {
    "total": 2,
    "success": 1,
    "failed": 1
  },
  "batch_id": "uuid",
  "processing_time_ms": 1250
}
```

## Error Handling

### File-Level Errors
- **Invalid file type**: Non-PDF files are rejected
- **File too large**: Files exceeding 500MB are rejected
- **Invalid filename**: Files with dangerous characters are rejected
- **Empty files**: Zero-byte files are handled appropriately

### Request-Level Errors
- **No files provided**: Returns 400
- **Too many files**: Returns 400 if > 50 files
- **Authentication failure**: Returns 401
- **Insufficient permissions**: Returns 403
- **Storage unavailable**: Returns 503

### System-Level Errors
- **Database connection failure**: Automatic retry with exponential backoff
- **MinIO upload failure**: Automatic retry with exponential backoff
- **Transaction rollback**: Automatic cleanup of uploaded files

## Retry Logic

### Retryable Errors
- Network connectivity issues
- Temporary storage unavailability
- Database connection timeouts
- HTTP 5xx server errors
- HTTP 429 rate limiting

### Non-Retryable Errors
- Authentication failures
- Authorization failures
- Invalid file types
- File size violations
- Malformed requests

### Retry Configuration
```typescript
const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  jitter: true // Adds ±25% random variation
};
```

## Usage Examples

### Basic Upload
```javascript
const formData = new FormData();
formData.append('files', pdfFile);

const response = await fetch('/api/upload-queue/upload-file', {
  method: 'POST',
  body: formData
});
```

### Upload with Position Assignment
```javascript
const formData = new FormData();
formData.append('files', pdfFile);
formData.append('position_id', 'position-uuid');

const response = await fetch('/api/upload-queue/upload-file', {
  method: 'POST',
  body: formData
});
```

### Multiple Files with Custom Batch
```javascript
const formData = new FormData();
files.forEach(file => formData.append('files', file));
formData.append('batch_id', 'custom-batch-id');
formData.append('source', 'manual-upload');

const response = await fetch('/api/upload-queue/upload-file', {
  method: 'POST',
  body: formData
});
```

## Frontend Integration

### Error Handling
```javascript
const handleUpload = async (files) => {
  try {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const response = await fetch('/api/upload-queue/upload-file', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (response.status === 200) {
      // All files succeeded
      showSuccess(`All ${data.summary.success} files uploaded successfully`);
    } else if (response.status === 207) {
      // Partial success
      if (data.summary.failed > 0) {
        showWarning(`${data.summary.success} files uploaded, ${data.summary.failed} failed`);
        // Show failed files
        data.results
          .filter(r => r.status === 'failed')
          .forEach(result => showError(`${result.file_name}: ${result.error}`));
      }
    } else {
      // Request-level error
      showError(data.error || 'Upload failed');
    }
  } catch (error) {
    showError('Network error during upload');
  }
};
```

### Progress Tracking
```javascript
// Listen for SSE updates
const eventSource = new EventSource('/api/upload-queue/sse');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'queue') {
    updateQueueDisplay(data.data);
  }
};
```

## Monitoring & Debugging

### Audit Logs
All upload operations are logged with:
- User information
- File details
- Processing time
- Success/failure status
- Error details

### Performance Metrics
- Processing time per request
- File size statistics
- Success/failure rates
- Retry attempt counts

### Health Checks
```bash
# Check upload queue status
curl /api/upload-queue?limit=1

# Monitor processing
curl /api/upload-queue/process
```

## Best Practices for Clients

### 1. **File Validation**
```javascript
const validateFile = (file) => {
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed');
  }
  if (file.size > 500 * 1024 * 1024) {
    throw new Error('File too large (max 500MB)');
  }
  return true;
};
```

### 2. **Batch Processing**
```javascript
const uploadInBatches = async (files, batchSize = 10) => {
  const batches = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }
  
  for (const batch of batches) {
    await uploadBatch(batch);
  }
};
```

### 3. **Error Recovery**
```javascript
const uploadWithRetry = async (files, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadFiles(files);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};
```

## Configuration

### Environment Variables
```bash
# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=uploads
MINIO_USE_SSL=false

# Upload Limits
MAX_FILE_SIZE=524288000  # 500MB in bytes
MAX_FILES_PER_REQUEST=50

# Processing
UPLOAD_QUEUE_PROCESS_URL=http://app:8021/api/upload-queue/process
PROCESSOR_API_KEY=your-processor-key
```

### Database Schema
The upload queue table stores:
- File metadata (name, size, path)
- Processing status
- User information
- Timestamps
- Error details
- Position assignments

## Troubleshooting

### Common Issues

1. **"Storage service unavailable"**
   - Check MinIO connection
   - Verify bucket exists
   - Check network connectivity

2. **"Insufficient permissions"**
   - Verify user has `BULK_UPLOAD` permission
   - Check session validity
   - Ensure proper authentication

3. **"File too large"**
   - Check file size limits
   - Consider chunked uploads for large files
   - Verify client-side validation

4. **"Invalid file type"**
   - Ensure files are PDF format
   - Check MIME type detection
   - Verify file extension

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=upload-api:*
```

This will provide detailed logs for:
- File validation
- Upload progress
- Retry attempts
- Error details
- Performance metrics

## Migration Guide

### From Old Upload API
1. Update endpoint URL to `/api/upload-queue/upload-file`
2. Add proper error handling for partial failures
3. Implement retry logic for transient errors
4. Update response parsing to handle new format
5. Add progress tracking via SSE

### Breaking Changes
- Response format changed to include per-file results
- New status codes (207 for partial success)
- Additional required headers for authentication
- Stricter file validation

## Performance Considerations

### Optimization Tips
1. **Use appropriate batch sizes** (10-20 files per request)
2. **Implement client-side validation** to reduce server load
3. **Use compression** for large files
4. **Monitor queue processing** to avoid bottlenecks
5. **Implement rate limiting** for high-volume scenarios

### Scaling Considerations
- MinIO cluster for high availability
- Database connection pooling
- Load balancing for upload endpoints
- CDN integration for file distribution
- Queue processing workers

## Security Considerations

### File Upload Security
- Validate file types server-side
- Scan for malware (consider integration)
- Implement file size limits
- Use secure file naming
- Store files outside web root

### Access Control
- Implement proper authentication
- Use role-based permissions
- Audit all upload activities
- Monitor for suspicious patterns
- Implement rate limiting

## Future Enhancements

### Planned Features
- Virus scanning integration
- File format conversion
- OCR processing
- Metadata extraction
- Advanced filtering
- Bulk operations

### Integration Points
- Webhook system for notifications
- SSE for real-time updates
- Audit logging for compliance
- Monitoring dashboards
- API rate limiting 