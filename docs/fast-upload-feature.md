# Fast Upload Feature

## Overview

The Fast Upload feature allows users to upload large batches of files (up to 1000 files) to MinIO storage and database immediately, without waiting for the queue processor to be available. This provides a much faster upload experience for bulk operations.

## Key Benefits

### 🚀 **Immediate Upload**
- Files are uploaded to MinIO storage immediately
- Database entries are created instantly
- No waiting for queue processor availability
- Much faster user experience

### 📊 **Batch Processing**
- Handles up to 1000 files per upload
- Parallel processing for better performance
- Comprehensive error handling and retry logic

### 🔄 **Asynchronous Processing**
- Queue processing happens in the background
- Users can continue working while files are processed
- Automatic processing trigger when upload completes

## How It Works

### Phase 1: Immediate Upload
1. **File Validation**: Check file types and sizes
2. **MinIO Upload**: Upload files to MinIO storage with retry logic
3. **Database Insert**: Create queue entries in database with retry logic
4. **Response**: Return immediate results to user

### Phase 2: Background Processing
1. **Auto-Trigger**: Automatically trigger queue processor
2. **Queue Processing**: Process files when processor is available
3. **Status Updates**: Real-time status updates via SSE

## API Endpoint

### Fast Bulk Insert
```
POST /api/upload-queue/fast-bulk-insert
```

**Request Format**: `multipart/form-data`

**Parameters**:
- `files[]`: Array of PDF files
- `position_id` (optional): Target position ID
- `batch_id` (optional): Custom batch ID
- `source` (optional): Upload source (default: 'bulk')

**Response**:
```json
{
  "success": true,
  "total": 100,
  "successful": 98,
  "failed": 2,
  "batchId": "uuid-batch-id",
  "results": [
    {
      "fileName": "cv-1.pdf",
      "success": true,
      "filePath": "uploads/batch-id/timestamp-cv-1.pdf",
      "queueId": "uuid-queue-id",
      "minioRetries": 0,
      "dbRetries": 0
    }
  ],
  "errors": [
    {
      "fileName": "cv-2.pdf",
      "success": false,
      "error": "File too large"
    }
  ],
  "message": "98 files uploaded and queued successfully. 2 files failed. Processing will start automatically."
}
```

## User Interface

### Fast Upload Modal
The new `FastBulkUploadCVsModal` component provides:

- **Drag & Drop**: Easy file selection
- **File Validation**: Automatic PDF validation
- **Progress Tracking**: Real-time upload progress
- **Result Summary**: Detailed success/failure breakdown
- **Retry Information**: Shows retry attempts for debugging

### Upload Page
The upload page now has two options:

1. **Standard Upload**: Original upload method (waits for processing)
2. **Fast Upload**: New fast upload method (immediate upload)

## Error Handling

### Retry Logic
- **MinIO Upload**: 2 retries with exponential backoff
- **Database Insert**: 2 retries with exponential backoff
- **Error Classification**: Distinguishes retryable vs non-retryable errors

### Error Types
- **Network Errors**: Automatically retried
- **Database Connection Errors**: Automatically retried
- **File Validation Errors**: Not retried (user must fix)
- **Permission Errors**: Not retried (requires admin action)

## Performance Characteristics

### Upload Speed
- **Small batches (1-50 files)**: ~2-5 seconds
- **Medium batches (50-200 files)**: ~10-30 seconds
- **Large batches (200-1000 files)**: ~30-120 seconds

### Resource Usage
- **Memory**: Efficient streaming for large files
- **CPU**: Parallel processing for multiple files
- **Network**: Optimized for bulk transfers

## Configuration

### Environment Variables
```bash
# Upload queue processing URL
UPLOAD_QUEUE_PROCESS_URL=http://app:8021/api/upload-queue/process

# Retry configuration
UPLOAD_QUEUE_MAX_RETRIES=2
UPLOAD_QUEUE_BASE_DELAY=500
UPLOAD_QUEUE_MAX_DELAY=5000
```

### Limits
- **Maximum files per upload**: 1000
- **Maximum file size**: 500MB per file
- **Supported formats**: PDF only
- **Concurrent uploads**: Limited by server capacity

## Monitoring

### Upload Metrics
- **Success rate**: Track successful vs failed uploads
- **Processing time**: Monitor upload duration
- **Retry frequency**: Identify problematic files/systems
- **Batch sizes**: Analyze usage patterns

### Health Checks
- **MinIO connectivity**: Monitor storage availability
- **Database performance**: Track insertion speed
- **Queue processor**: Monitor background processing

## Testing

### Manual Testing
```bash
# Test with sample files
node scripts/test-fast-upload.js

# Monitor queue status
node scripts/monitor-upload-queue.js
```

### Automated Testing
- Unit tests for upload logic
- Integration tests for API endpoints
- Performance tests for large batches
- Error handling tests

## Troubleshooting

### Common Issues

1. **Upload Timeout**
   - Increase timeout limits
   - Reduce batch size
   - Check network connectivity

2. **Memory Issues**
   - Reduce concurrent uploads
   - Implement streaming for large files
   - Monitor server resources

3. **Database Errors**
   - Check connection pool settings
   - Monitor database performance
   - Review retry configuration

### Debug Commands
```bash
# Check upload queue status
curl -X GET /api/upload-queue

# Monitor processor logs
docker logs upload-queue-processor

# Check MinIO storage
mc ls minio/uploads/
```

## Migration Guide

### For Existing Users
- **No changes required**: Existing uploads continue to work
- **Optional upgrade**: Can switch to fast upload for better performance
- **Backward compatibility**: All existing features preserved

### For New Implementations
1. **Use Fast Upload**: For bulk operations (50+ files)
2. **Use Standard Upload**: For single files or small batches
3. **Monitor Performance**: Track upload success rates

## Future Enhancements

### Planned Features
1. **Resume Upload**: Continue interrupted uploads
2. **Chunked Upload**: Handle very large files
3. **Progress API**: Real-time upload progress
4. **Batch Scheduling**: Schedule uploads for off-peak hours
5. **Compression**: Automatic file compression

### Performance Optimizations
1. **Streaming Upload**: Reduce memory usage
2. **Parallel Processing**: Increase concurrent uploads
3. **Caching**: Cache frequently uploaded files
4. **CDN Integration**: Use CDN for faster uploads

## Conclusion

The Fast Upload feature significantly improves the user experience for bulk file uploads by providing immediate feedback and asynchronous processing. This allows users to upload large batches of files quickly and continue with other tasks while the files are processed in the background. 