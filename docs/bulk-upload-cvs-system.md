# Bulk Upload CVs System Documentation

## 🎯 Overview

The Bulk Upload CVs system is a simple, reliable, and efficient solution for uploading multiple CV files and processing them through webhook automation. The system follows a clear workflow: **Upload → Queue → Process → Complete**.

## 🚀 System Architecture

### **Core Components:**

1. **Upload Interface** (`BulkUploadCVsModal.tsx`)
   - Simple file selection and upload
   - Progress tracking
   - Error handling

2. **Queue Management** (`UploadQueueStatus.tsx`)
   - Real-time queue display
   - Status tracking
   - Webhook response details

3. **Processing Engine** (`/api/upload-queue/process`)
   - FIFO processing
   - Max concurrent limits
   - Webhook integration

4. **Database Storage** (`upload_queue` table)
   - File metadata
   - Processing status
   - Webhook responses

## 📋 Complete Workflow

### **1. Upload Phase**
```
User selects files → Upload to MinIO → Create DB records → Auto-trigger processing
```

**Steps:**
- User selects PDF files (up to 200 files per request)
- Files uploaded to MinIO storage
- Database records created with `status = 'queued'`
- Auto-processing triggered immediately

### **2. Queue Phase**
```
Files appear in queue → FIFO ordering → Respect max concurrent setting
```

**Queue Statuses:**
- `queued`: Waiting to be processed
- `inprocess`: Currently being processed
- `success`: Successfully completed
- `error`/`fail`: Failed with error

### **3. Processing Phase**
```
Pick oldest queued file → Send to webhook → Update status based on response
```

**Processing Logic:**
- **FIFO**: Files processed in upload order (oldest first)
- **Max Concurrent**: Respects system setting (default: 5)
- **Webhook Integration**: Uses system settings webhook URL
- **Response Handling**: 200 = success, other = error

### **4. Completion Phase**
```
Status updated → Next file processed → Real-time UI updates
```

## 🔧 Configuration

### **System Settings**

Configure these in the admin panel:

```bash
# Max concurrent processors
maxConcurrentProcessors = 5

# Webhook URL
resumeProcessingWebhookUrl = https://your-webhook-endpoint

# Webhook token
resumeProcessingWebhookToken = your-token

# Note: This unified webhook handles all PDF processing including resume uploads and the "Create via Resume (Automated)" feature
```

### **Environment Variables**

```bash
# Processing
PROCESSOR_API_KEY = your-api-key
UPLOAD_QUEUE_PROCESS_URL = http://app:8021/api/upload-queue/process

# Webhook (fallback)
RESUME_PROCESSING_WEBHOOK_URL = https://your-webhook-endpoint
RESUME_PROCESSING_WEBHOOK_TOKEN = your-token

# Note: This unified webhook handles all PDF processing
```

## 📊 User Interface

### **Upload Modal**
- **File Selection**: Drag & drop or click to select PDF files
- **Position Assignment**: Optional position assignment
- **Progress**: Simple upload progress indicator
- **Results**: Success/error summary

### **Queue Display**
- **Summary Cards**: Total, Queued, Processing, Success, Error counts
- **File List**: All files with status icons and badges
- **Real-time Updates**: Live status updates via SSE
- **Details Modal**: Click any file to see webhook response details

### **Status Indicators**
- 🔵 **Queued**: Clock icon, blue badge
- 🟡 **Processing**: Spinning loader, yellow badge
- 🟢 **Success**: Checkmark, green badge
- 🔴 **Error**: X icon, red badge

## 🔄 Processing Logic

### **FIFO Processing**
```sql
SELECT id FROM upload_queue 
WHERE status = 'queued' 
ORDER BY upload_date ASC, id ASC
LIMIT 1
FOR UPDATE SKIP LOCKED
```

### **Max Concurrent Control**
```sql
SELECT COUNT(*) as count 
FROM upload_queue 
WHERE status = 'inprocess'
```

### **Webhook Integration**
```javascript
// Send file to webhook
const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    inputs: {
      cv_url: publicUrl,
      applied_position_id: positionId,
      jobId: job.id
    },
    response_mode: 'blocking'
  })
});

// Update status based on response
if (response.status === 200) {
  status = 'success';
} else {
  status = 'fail';
  error = `Webhook responded with status ${response.status}`;
}
```

## 📈 Performance Features

### **Optimizations**
- **Batch Upload**: Up to 200 files per request
- **Concurrent Processing**: Configurable max concurrent limit
- **Real-time Updates**: SSE for live UI updates
- **Error Recovery**: Graceful handling of webhook failures
- **Memory Management**: Automatic cleanup of large objects

### **Monitoring**
- **Audit Logging**: Complete audit trail of all operations
- **Error Tracking**: Detailed error logging with stack traces
- **Performance Metrics**: Processing time tracking
- **Queue Statistics**: Real-time queue status monitoring

## 🛠️ API Endpoints

### **Upload Files**
```http
POST /api/upload-queue/upload-file
Content-Type: multipart/form-data

files: [File1, File2, ...]
position_id: optional
batch_id: auto-generated
source: 'bulk'
```

### **Get Queue**
```http
GET /api/upload-queue?limit=50&offset=0&status=queued
```

### **Process Queue**
```http
POST /api/upload-queue/process
x-api-key: your-api-key
```

### **Real-time Updates**
```http
GET /api/upload-queue/sse
```

## 🔍 Troubleshooting

### **Common Issues**

1. **Upload Fails**
   - Check file size (max 500MB per file)
   - Verify file type (PDF only)
   - Check MinIO connectivity

2. **Processing Stuck**
   - Check max concurrent setting
   - Verify webhook URL is accessible
   - Check webhook response format

3. **Webhook Errors**
   - Verify webhook URL and token
   - Check webhook response status
   - Review error details in queue

### **Debug Information**

All operations are logged with:
- **Audit Events**: User actions and system events
- **Error Logs**: Detailed error information
- **Performance Metrics**: Processing times
- **Webhook Responses**: Full webhook response details

## 🎉 Benefits

### **For Users**
- ✅ **Simple Upload**: Easy file selection and upload
- ✅ **Real-time Progress**: Live status updates
- ✅ **Error Visibility**: Clear error messages and details
- ✅ **Batch Processing**: Handle large numbers of files

### **For Administrators**
- ✅ **Queue Management**: Monitor and control processing
- ✅ **Performance Control**: Configurable concurrent limits
- ✅ **Webhook Integration**: Flexible automation integration
- ✅ **Audit Trail**: Complete operation logging

### **For System**
- ✅ **Reliability**: Robust error handling and recovery
- ✅ **Scalability**: Efficient processing with limits
- ✅ **Monitoring**: Comprehensive logging and metrics
- ✅ **Flexibility**: Configurable webhook integration

## 🚀 Getting Started

1. **Configure System Settings**
   - Set max concurrent processors
   - Configure webhook URLs and tokens

2. **Upload Files**
   - Navigate to `/candidates/upload`
   - Click "Upload CVs"
   - Select PDF files
   - Choose optional position
   - Click "Upload"

3. **Monitor Progress**
   - Watch real-time queue updates
   - Check status cards for overview
   - Click files for detailed information

4. **Review Results**
   - Check success/error counts
   - Review webhook responses
   - Monitor processing performance

---

**The Bulk Upload CVs system is now production-ready and follows all best practices for reliability, performance, and user experience! 🎉** 