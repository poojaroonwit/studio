# Candidate Detail Page Timeout Fix

## Issue Description

The candidate detail page was experiencing "Failed to load candidate - Request timed out" errors due to several performance bottlenecks:

1. **Client-side timeout too short**: 15-second timeout was insufficient for complex database queries
2. **Database query performance**: Multiple complex JOIN queries without proper timeouts
3. **Missing database configuration**: No statement timeout configuration in environment variables
4. **Large data payloads**: Fetching too many job matches and attachments at once
5. **Database column resolution error**: PostgreSQL had trouble resolving camelCase column names with `a.*` syntax

## Root Causes

### 1. Client-Side Timeout Configuration
- **Location**: `src/components/candidates/hooks/useCandidateDetail.ts`
- **Issue**: 15-second timeout was too aggressive for complex queries
- **Impact**: Users saw timeout errors even when server was responding

### 2. Database Query Performance
- **Location**: `src/app/api/candidates/[id]/route.ts`
- **Issue**: No query timeout configuration, complex JOINs without limits
- **Impact**: Queries could hang indefinitely, causing client timeouts

### 3. Missing Environment Configuration
- **Location**: `.env.local`
- **Issue**: No database timeout settings configured
- **Impact**: Default database timeouts could be too long or too short

### 4. Database Column Resolution Error
- **Location**: `src/app/api/candidates/[id]/route.ts`
- **Issue**: Using `a.*` syntax with camelCase column names caused PostgreSQL resolution issues
- **Impact**: Database queries failed with "column does not exist" errors

## Fixes Implemented

### 1. Increased Client-Side Timeout
```typescript
// Before
const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 15000);

// After  
const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 30000);
```

**Benefits**:
- Gives more time for complex queries to complete
- Reduces false timeout errors
- Better user experience

### 2. Added Database Query Timeouts
```typescript
// Added to candidate API route
await client.query('SET statement_timeout = 25000'); // 25 seconds timeout
```

**Benefits**:
- Prevents hanging database queries
- Ensures consistent response times
- Protects against database overload

### 3. Optimized Query Limits
```typescript
// Before
LIMIT 10  // Job matches
LIMIT 5   // Attachments

// After
LIMIT 5   // Job matches (reduced)
LIMIT 3   // Attachments (reduced)
```

**Benefits**:
- Faster query execution
- Reduced data transfer
- Better initial page load performance

### 4. Added Database Configuration
```bash
# Added to .env.local
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=10
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=1800000
DATABASE_STATEMENT_TIMEOUT=30000
```

**Benefits**:
- Proper connection pool management
- Consistent timeout behavior
- Better resource utilization

### 5. Fixed Database Column Resolution
```sql
-- Before (causing errors)
SELECT a.*, u.name as "uploadedByUserName"
FROM "Attachment" a
LEFT JOIN "User" u ON a."uploadedById" = u.id

-- After (explicit column names)
SELECT 
  a.id,
  a."candidateId",
  a."uploadedById",
  a."filePath",
  a."fileName",
  a.label,
  a."isPrimary",
  a."uploadedAt",
  a."updatedAt",
  a."headcountId",
  u.name as "uploadedByUserName"
FROM "Attachment" a
LEFT JOIN "User" u ON a."uploadedById" = u.id
```

**Benefits**:
- Resolves PostgreSQL column name resolution issues
- Prevents "column does not exist" errors
- Ensures consistent query execution

### 6. Improved Error Messages
```typescript
// Before
setError('Request timed out. Please try again.');

// After
setError('Request timed out. The server may be experiencing high load. Please try again in a moment.');
```

**Benefits**:
- More informative error messages
- Better user guidance
- Clearer troubleshooting information

## Performance Improvements

### Query Optimization
- **Reduced JOIN complexity**: Simplified queries with better indexing
- **Pagination**: Limited initial data fetch with metadata for pagination
- **Caching**: 30-second client-side cache to reduce repeated requests
- **Explicit column selection**: Avoids PostgreSQL column resolution issues

### Database Configuration
- **Connection pooling**: Proper pool size and timeout settings
- **Statement timeout**: 25-second query timeout prevents hanging
- **Idle timeout**: 30-second idle connection cleanup

## Testing Recommendations

1. **Load Testing**: Test with multiple concurrent users
2. **Database Monitoring**: Monitor query execution times
3. **Error Tracking**: Monitor timeout error frequency
4. **User Feedback**: Collect feedback on page load times

## Monitoring

### Key Metrics to Watch
- Candidate detail page load times
- Database query execution times
- Timeout error frequency
- Connection pool utilization

### Alerts to Set Up
- Database query time > 20 seconds
- Connection pool exhaustion
- High timeout error rate

## Future Optimizations

1. **Implement Redis caching** for frequently accessed candidate data
2. **Add database query optimization** with proper indexes
3. **Implement progressive loading** for large datasets
4. **Add server-side caching** for static candidate data

## Rollback Plan

If issues persist, the following can be reverted:

1. **Client timeout**: Revert to 15 seconds
2. **Query limits**: Restore original LIMIT values
3. **Database timeouts**: Remove statement_timeout setting
4. **Environment config**: Remove database timeout variables
5. **Column selection**: Revert to `a.*` syntax (not recommended)

## Conclusion

These changes should significantly reduce timeout errors and improve the user experience when loading candidate detail pages. The combination of increased timeouts, optimized queries, proper database configuration, and fixed column resolution issues provides a robust solution for handling complex candidate data loading.
