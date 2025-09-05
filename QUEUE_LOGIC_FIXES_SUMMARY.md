# Process Queue Logic Fixes - Summary

## **🚨 Critical Issues Fixed**

### **1. Deadlock Prevention**
**Problem**: `FOR UPDATE` without `SKIP LOCKED` caused database deadlocks
**Fix**: Added `SKIP LOCKED` to all `FOR UPDATE` queries
**Files Modified**: 
- `src/app/api/upload-queue/process/route.ts:92`
- `src/app/api/upload-queue/process-all/route.ts:128`

### **2. Overly Restrictive Job Selection**
**Problem**: Jobs blocked if file_path was ever processed (even if failed)
**Fix**: Only block jobs if file_path was successfully processed, allow retry of failed jobs
**Files Modified**: 
- `src/app/api/upload-queue/process/route.ts:127-169`

### **3. Missing Validation for maxConcurrentProcessors**
**Problem**: If set to 0, no jobs could ever be processed
**Fix**: Added validation to prevent 0 or negative values
**Files Modified**: 
- `src/app/api/upload-queue/process/route.ts:83-87`
- `src/app/api/upload-queue/process-all/route.ts:57-61`

### **4. Poor Error Handling**
**Problem**: Silent failures in system settings retrieval
**Fix**: Added proper logging and error handling
**Files Modified**: 
- `src/app/api/upload-queue/process/route.ts:72-81`
- `src/app/api/upload-queue/process-all/route.ts:47-55`

## **🔧 New Files Created**

### **1. Database Indexes**
**File**: `fix-queue-database-indexes.sql`
**Purpose**: Improve query performance for queue operations
**Indexes Added**:
- `idx_upload_queue_status_upload_date`
- `idx_upload_queue_file_path_status`
- `idx_upload_queue_process_date`
- `idx_upload_queue_completed_date`
- `idx_upload_queue_source`
- `idx_upload_queue_webhook_source`
- `idx_upload_queue_webhook_processed`
- `idx_upload_queue_error`

### **2. Settings Validator**
**File**: `src/lib/queueSettingsValidator.ts`
**Purpose**: Validate and fix critical queue settings
**Features**:
- Validates `maxConcurrentProcessors` setting
- Auto-fixes invalid settings
- Provides detailed logging
- Startup validation

### **3. Test Script**
**File**: `test-queue-fixes.cjs`
**Purpose**: Test and verify all fixes are working
**Features**:
- Tests job selection logic
- Validates system settings
- Checks database indexes
- Provides recommendations

## **📋 Implementation Steps**

### **Step 1: Apply Code Fixes**
✅ **COMPLETED** - All code fixes have been applied to:
- `src/app/api/upload-queue/process/route.ts`
- `src/app/api/upload-queue/process-all/route.ts`

### **Step 2: Create Database Indexes**
```bash
# Run the SQL script to create indexes
psql -d your_database -f fix-queue-database-indexes.sql
```

### **Step 3: Test the Fixes**
```bash
# Run the test script
node test-queue-fixes.cjs
```

### **Step 4: Validate Settings**
```bash
# Check system settings
SELECT key, value FROM system_settings 
WHERE key = 'maxConcurrentProcessors';
```

### **Step 5: Restart Services**
```bash
# Restart the processor service
pkill -f process-upload-queue
node scripts/process-upload-queue.cjs
```

## **🎯 Expected Results**

After applying these fixes:

1. **No More Deadlocks**: `SKIP LOCKED` prevents database deadlocks
2. **Better Job Selection**: Failed jobs can be retried, only successful jobs block duplicates
3. **Proper Validation**: System settings are validated and auto-fixed
4. **Better Performance**: Database indexes improve query speed
5. **Better Logging**: Clear error messages and warnings

## **🔍 Monitoring**

### **Check Queue Status**
```sql
SELECT 
  status,
  COUNT(*) as count
FROM upload_queue 
GROUP BY status 
ORDER BY status;
```

### **Check System Settings**
```sql
SELECT key, value 
FROM system_settings 
WHERE key = 'maxConcurrentProcessors';
```

### **Monitor Logs**
Look for these log messages:
- `Invalid maxConcurrentProcessors setting` - Settings validation
- `Max concurrent jobs running` - Normal operation
- `No queued jobs` - Normal when queue is empty
- `Reset X stuck jobs` - Automatic cleanup working

## **🚨 Troubleshooting**

### **If Queue Still Stuck**
1. Check if processor service is running
2. Verify `PROCESSOR_API_KEY` environment variable
3. Check database connection
4. Run the test script to identify issues

### **If Jobs Not Processing**
1. Check `maxConcurrentProcessors` setting
2. Verify database indexes are created
3. Check for invalid file paths
4. Review error logs

### **If Performance Issues**
1. Ensure database indexes are created
2. Check database connection pool
3. Monitor query performance
4. Consider reducing batch size

## **✅ Verification Checklist**

- [ ] Code fixes applied to both route files
- [ ] Database indexes created
- [ ] System settings validated
- [ ] Test script passes
- [ ] Processor service restarted
- [ ] Queue processing jobs normally
- [ ] No deadlock errors in logs
- [ ] Failed jobs can be retried

The queue should now process jobs reliably without getting stuck!
