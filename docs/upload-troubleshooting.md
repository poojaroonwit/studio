# Upload Troubleshooting Guide

This guide helps diagnose and fix issues with the CV upload functionality in the Studio 9 application.

## Common Issues

### 1. Modal Gets Stuck on Loading

**Symptoms:**
- Upload modal shows "Uploading..." but never completes
- No error message appears
- Modal cannot be closed
- Browser becomes unresponsive

**Causes:**
- MinIO connection issues
- Database connection problems
- Network timeouts
- Large file uploads
- Authentication issues

**Solutions:**

#### Check MinIO Health
```bash
# Test MinIO connectivity
curl http://localhost:3000/api/health/minio
```

#### Check Database Health
```bash
# Test database connectivity
curl http://localhost:3000/api/health/database
```

#### Run Diagnostic Script
```bash
# Run the comprehensive test script
node scripts/test-upload.js
```

### 2. MinIO Connection Issues

**Symptoms:**
- "Storage service unavailable" error
- Upload fails immediately
- MinIO health check fails

**Solutions:**

#### Verify MinIO Configuration
Check your environment variables:
```bash
# Required MinIO environment variables
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=uploads
MINIO_USE_SSL=false
```

#### Check MinIO Service Status
```bash
# If using Docker
docker ps | grep minio

# Check MinIO logs
docker logs <minio-container-id>
```

#### Test MinIO Directly
```bash
# Test MinIO API directly
curl -X GET "http://localhost:9000/minio/health/live"
```

### 3. Database Connection Issues

**Symptoms:**
- "Database connection failed" error
- Upload hangs during database operations
- Database health check fails

**Solutions:**

#### Verify Database Configuration
Check your database environment variables:
```bash
# Required database environment variables
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

#### Check Database Service Status
```bash
# If using Docker
docker ps | grep postgres

# Check database logs
docker logs <postgres-container-id>
```

#### Test Database Connection
```bash
# Test database directly
psql $DATABASE_URL -c "SELECT NOW();"
```

### 4. Authentication Issues

**Symptoms:**
- "Unauthorized" or "Forbidden" errors
- Upload fails with 401/403 status codes
- Session expired messages

**Solutions:**

#### Check User Permissions
Ensure the user has the required permissions:
- `Admin` role, OR
- `BULK_UPLOAD_EXECUTE` module permission

#### Verify Session
Check if the user session is valid:
```javascript
// In browser console
console.log(session); // Check session data
```

#### Check Authentication Configuration
Verify NextAuth configuration in your environment.

### 5. File Size and Type Issues

**Symptoms:**
- "File too large" errors
- "Invalid file type" errors
- Upload fails for specific files

**Solutions:**

#### Check File Size Limits
- Maximum file size: 500MB
- Check file size before upload

#### Verify File Types
- Only PDF files are accepted
- Check file MIME type

#### Test with Different Files
Try uploading smaller files or different PDF files to isolate the issue.

## Debugging Steps

### 1. Enable Debug Logging

Add debug logging to see what's happening:

```javascript
// In browser console
localStorage.setItem('debug', 'upload:*');
```

### 2. Check Browser Network Tab

1. Open browser developer tools
2. Go to Network tab
3. Attempt upload
4. Look for failed requests
5. Check request/response details

### 3. Check Server Logs

Monitor server logs for errors:

```bash
# If using Docker
docker logs -f <app-container-id>

# If running locally
npm run dev
```

### 4. Use Health Check Endpoints

Test individual components:

```bash
# MinIO health
curl http://localhost:3000/api/health/minio

# Database health
curl http://localhost:3000/api/health/database

# Upload queue status
curl http://localhost:3000/api/upload-queue
```

## Prevention

### 1. Regular Health Checks

Set up monitoring for:
- MinIO service status
- Database connectivity
- Upload queue processing

### 2. File Validation

Implement client-side validation:
- File size checks
- File type validation
- Progress indicators

### 3. Error Handling

Improve error handling:
- Timeout handling
- Retry logic
- User-friendly error messages

### 4. Performance Optimization

- Implement chunked uploads for large files
- Add upload progress indicators
- Optimize database queries

## Emergency Recovery

### 1. Force Modal Cleanup

If the modal gets stuck, run in browser console:

```javascript
// Emergency modal cleanup
window.emergencyModalCleanup();
```

### 2. Reset Upload State

```javascript
// Reset upload state
localStorage.removeItem('upload-state');
sessionStorage.clear();
```

### 3. Restart Services

```bash
# Restart application
docker-compose restart

# Or restart individual services
docker-compose restart minio
docker-compose restart postgres
docker-compose restart app
```

## Support

If you continue to experience issues:

1. Collect logs from all services
2. Run the diagnostic script
3. Check the troubleshooting steps above
4. Contact the development team with:
   - Error messages
   - Log files
   - Steps to reproduce
   - Environment details

## Recent Fixes

### Version 1.2.0
- Added timeout handling for upload requests
- Improved error messages and user feedback
- Added progress indicators
- Enhanced modal state management
- Added comprehensive logging
- Created health check endpoints
- Added diagnostic tools

### Known Issues
- Large file uploads (>100MB) may take longer
- Network interruptions can cause upload failures
- MinIO connection issues in some Docker environments
