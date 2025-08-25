# Upload Queue 504 Gateway Timeout Fix

## 🔍 **Issue Summary**

**Problem**: The upload queue page was showing "Failed to fetch jobs: 504 Gateway Time-out" error when trying to load the queue data.

**Root Cause**: The database query for the upload queue was taking too long to complete, exceeding the 15-second statement timeout limit. This was likely due to:
- Large number of records in the `upload_queue` table
- Missing database indexes for common query patterns
- Inefficient query execution plans

## 🛠️ **Solutions Implemented**

### **1. Increased Database Timeout**

**File Modified**: `src/app/api/upload-queue/route.ts`

**Changes**:
- Increased statement timeout from 15 seconds to 60 seconds
- Added comprehensive error handling for different types of database errors
- Improved error messages with specific guidance for users

```typescript
// Before
await client.query('SET statement_timeout = 15000'); // 15 seconds

// After  
await client.query('SET statement_timeout = 60000'); // 60 seconds
```

### **2. Enhanced Error Handling**

**Improved Error Responses**:
- **504 Timeout**: Specific guidance about query timeout and suggestions
- **503 Service Unavailable**: Database connection issues
- **500 Database Errors**: General database error handling

**Error Response Format**:
```json
{
  "error": "Request timeout - the query took too long to complete.",
  "details": "Database query timeout - the upload queue query exceeded the 60-second timeout limit.",
  "suggestion": "Try reducing the page size, adding more specific filters, or contact an administrator to optimize the database."
}
```

### **3. Database Performance Optimization**

**Script Created**: `scripts/fix-upload-queue-performance.js`

**Performance Improvements**:
- Added database indexes for common query patterns
- Updated table statistics with `ANALYZE`
- Reset stuck jobs that might be causing issues
- Provided comprehensive performance monitoring

**Indexes Added**:
```sql
-- Primary sort and filter index
CREATE INDEX idx_upload_queue_upload_date ON upload_queue (upload_date DESC);

-- Status filter index
CREATE INDEX idx_upload_queue_status ON upload_queue (status);

-- Position filter index
CREATE INDEX idx_upload_queue_position_id ON upload_queue (position_id);

-- Composite index for common queries
CREATE INDEX idx_upload_queue_status_upload_date ON upload_queue (status, upload_date DESC);

-- Process date index for stuck job detection
CREATE INDEX idx_upload_queue_process_date ON upload_queue (process_date);

-- User-specific queries
CREATE INDEX idx_upload_queue_created_by ON upload_queue (created_by);
```

### **4. Improved Frontend Error Handling**

**File Modified**: `src/components/candidates/CandidateImportUploadQueue.tsx`

**Changes**:
- Enhanced error message parsing from API responses
- Added specific handling for 504 timeout errors
- Provided user-friendly error messages with actionable suggestions
- Better error display with details and suggestions

### **5. SQL Script for Manual Database Optimization**

**File Created**: `scripts/fix-upload-queue-performance.sql`

**Features**:
- Complete database optimization script
- Index creation with error handling
- Table statistics analysis
- Performance monitoring queries

## 🔧 **How to Apply the Fix**

### **Step 1: Run the Performance Optimization Script**

```bash
# Make sure you're in the project directory
cd /path/to/studio

# Run the performance optimization script
node scripts/fix-upload-queue-performance.js
```

### **Step 2: Verify the Changes**

The script will output:
- Current table statistics
- Index creation status
- Queue status summary
- Table size information
- Stuck job reset count

### **Step 3: Test the Upload Queue Page**

1. Navigate to the upload queue page
2. Verify that jobs load without 504 errors
3. Test pagination and filtering
4. Monitor query performance

### **Step 4: Monitor Performance**

**Key Metrics to Watch**:
- Query execution time
- Page load times
- Error rates
- Database connection usage

## 📊 **Performance Monitoring**

### **Database Query Performance**

Monitor these queries in your database:
```sql
-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
AND tablename = 'upload_queue'
ORDER BY idx_scan DESC;

-- Check table statistics
SELECT 
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE status = 'queued') as queued,
  COUNT(*) FILTER (WHERE status = 'inprocess') as inprocess,
  COUNT(*) FILTER (WHERE status = 'success') as success,
  COUNT(*) FILTER (WHERE status IN ('error', 'fail')) as failed
FROM upload_queue;
```

### **Application Performance**

Monitor these metrics:
- API response times for `/api/upload-queue`
- Frontend page load times
- Error rates in application logs
- Database connection pool usage

## 🚨 **Troubleshooting**

### **If 504 Errors Persist**

1. **Check Database Performance**:
   ```bash
   node scripts/fix-upload-queue-performance.js
   ```

2. **Reduce Page Size**:
   - Temporarily reduce the default page size in the frontend
   - Test with smaller data sets

3. **Add More Specific Filters**:
   - Encourage users to use date filters
   - Add status-specific filtering

4. **Database Maintenance**:
   ```sql
   -- Run regular maintenance
   VACUUM ANALYZE upload_queue;
   ```

### **If Database Connection Fails**

1. **Check Environment Variables**:
   - Verify `DATABASE_URL` is correct
   - Check database server status

2. **Connection Pool Settings**:
   - Review `DATABASE_MAX_CONNECTIONS`
   - Check `DATABASE_CONNECTION_TIMEOUT`

3. **Network Issues**:
   - Verify database server accessibility
   - Check firewall settings

## 📋 **Prevention Measures**

### **Regular Maintenance**

1. **Scheduled Database Maintenance**:
   ```bash
   # Add to cron job or scheduled task
   0 2 * * * node scripts/fix-upload-queue-performance.js
   ```

2. **Monitor Table Growth**:
   - Set up alerts for large table sizes
   - Implement data archival for old records

3. **Performance Monitoring**:
   - Set up query performance monitoring
   - Monitor index usage statistics

### **Best Practices**

1. **Query Optimization**:
   - Always use LIMIT and OFFSET for pagination
   - Add appropriate WHERE clauses
   - Use indexes effectively

2. **Application Design**:
   - Implement proper error handling
   - Use appropriate timeout values
   - Provide user-friendly error messages

3. **Database Design**:
   - Regular VACUUM and ANALYZE
   - Monitor index usage
   - Archive old data when appropriate

## ✅ **Verification Checklist**

After implementing the fix:

- [ ] Performance optimization script runs successfully
- [ ] Database indexes are created
- [ ] Upload queue page loads without 504 errors
- [ ] Pagination works correctly
- [ ] Filtering works without timeouts
- [ ] Error messages are user-friendly
- [ ] Performance monitoring is in place
- [ ] Regular maintenance is scheduled

## 📞 **Support**

If issues persist after implementing these fixes:

1. **Check Application Logs**: Look for detailed error messages
2. **Database Logs**: Check PostgreSQL logs for query performance
3. **Performance Metrics**: Monitor query execution times
4. **Contact Administrator**: For database optimization assistance

## 🔄 **Future Improvements**

Consider these additional optimizations:

1. **Data Archival**: Implement automatic archival of old queue records
2. **Caching**: Add Redis caching for frequently accessed data
3. **Read Replicas**: Use database read replicas for heavy query loads
4. **Query Optimization**: Further optimize complex queries
5. **Monitoring**: Implement comprehensive performance monitoring
