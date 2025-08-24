# Candidate Loading Timeout Troubleshooting Guide

## Issue Description
Users are experiencing "Failed to load candidate - Request timed out. The server may be experiencing high load. Please try again in a moment." errors when trying to view candidate details.

## Quick Diagnostic Steps

### 1. Check Server Logs
Look for performance logs in your application console:
```bash
# Look for these log patterns:
[PERF] Starting candidate fetch for ID: <candidate-id>
[PERF] Candidate query completed in <time>ms
[PERF] Job matches query completed in <time>ms
[PERF] Attachments query completed in <time>ms
[PERF] Total candidate fetch completed in <time>ms
```

### 2. Run Performance Monitor
Use the built-in performance monitoring script:
```bash
# Check database health
node scripts/monitor-candidate-performance.js

# Test specific candidate
node scripts/monitor-candidate-performance.js <candidate-id>
```

### 3. Check Database Health
```sql
-- Check active connections
SELECT count(*) as active_connections, state 
FROM pg_stat_activity 
WHERE state = 'active';

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC 
LIMIT 5;
```

## Common Causes and Solutions

### 1. Database Connection Issues
**Symptoms**: Connection timeouts, connection refused errors
**Solutions**:
- Check `DATABASE_URL` environment variable
- Verify database server is running
- Check network connectivity
- Increase `DATABASE_CONNECTION_TIMEOUT` if needed

### 2. Slow Database Queries
**Symptoms**: Individual query times > 2 seconds
**Solutions**:
- Add database indexes on frequently queried columns
- Optimize query execution plans
- Consider query caching
- Review and optimize complex JOINs

### 3. High Database Load
**Symptoms**: Multiple concurrent requests timing out
**Solutions**:
- Increase connection pool size (`DATABASE_MAX_CONNECTIONS`)
- Implement request queuing
- Add application-level caching
- Consider database read replicas

### 4. Insufficient Timeout Settings
**Symptoms**: Consistent 30-second timeouts
**Solutions**:
- Increase `DATABASE_STATEMENT_TIMEOUT` (currently 30s)
- Increase client-side timeout in `useCandidateDetail.ts` (currently 30s)
- Adjust based on expected query complexity

## Configuration Settings

### Current Timeout Configuration
```bash
# Database timeouts
DATABASE_STATEMENT_TIMEOUT=30000        # 30 seconds
DATABASE_CONNECTION_TIMEOUT=1800000     # 30 minutes
DATABASE_IDLE_TIMEOUT=30000             # 30 seconds

# Client timeouts
Client-side timeout: 30 seconds
API route timeout: 30 seconds
```

### Recommended Adjustments for High Load
```bash
# For high-traffic environments
DATABASE_STATEMENT_TIMEOUT=45000        # 45 seconds
DATABASE_MAX_CONNECTIONS=20             # Increase pool size
DATABASE_IDLE_TIMEOUT=60000             # 60 seconds
```

## Performance Optimization Checklist

### Database Indexes
Ensure these indexes exist:
```sql
-- Primary indexes (should already exist)
CREATE INDEX IF NOT EXISTS idx_candidate_id ON "Candidate"(id);
CREATE INDEX IF NOT EXISTS idx_jobmatch_candidate_id ON "JobMatch"("candidateId");
CREATE INDEX IF NOT EXISTS idx_attachment_candidate_id ON "Attachment"("candidateId");

-- Performance indexes (add if missing)
CREATE INDEX IF NOT EXISTS idx_candidate_position_id ON "Candidate"("positionId");
CREATE INDEX IF NOT EXISTS idx_candidate_recruiter_id ON "Candidate"("recruiterId");
CREATE INDEX IF NOT EXISTS idx_jobmatch_fit_score ON "JobMatch"("fitScore");
```

### Caching Strategy
1. **Client-side caching**: Already implemented (30-second cache)
2. **Server-side caching**: Consider Redis implementation
3. **CDN caching**: For static assets and images

### Query Optimization
1. **Selective column fetching**: Already implemented
2. **Pagination**: Already implemented (LIMIT 5 for job matches, LIMIT 3 for attachments)
3. **Lazy loading**: Consider implementing for non-critical data

## Monitoring and Alerting

### Key Metrics to Monitor
- Candidate detail page load times
- Database query execution times
- Connection pool utilization
- Timeout error frequency
- Server resource usage (CPU, memory)

### Alert Thresholds
- Query time > 5 seconds: Warning
- Query time > 10 seconds: Critical
- Timeout error rate > 5%: Warning
- Timeout error rate > 10%: Critical

## Emergency Procedures

### Immediate Actions (if timeouts are frequent)
1. **Increase timeouts temporarily**:
   ```bash
   DATABASE_STATEMENT_TIMEOUT=60000  # 60 seconds
   ```

2. **Reduce query complexity**:
   - Temporarily remove non-essential data fetching
   - Increase pagination limits
   - Disable complex JOINs

3. **Scale resources**:
   - Increase database connection pool
   - Add more application instances
   - Consider database read replicas

### Rollback Plan
If performance issues persist after changes:
1. Revert timeout settings to original values
2. Remove performance monitoring logs
3. Implement gradual optimization approach

## Support Information

### Log Locations
- Application logs: Console output
- Database logs: PostgreSQL log files
- Performance logs: `[PERF]` prefixed messages

### Useful Commands
```bash
# Check application status
npm run dev

# Monitor database performance
node scripts/monitor-candidate-performance.js

# Check environment variables
echo $DATABASE_URL
echo $DATABASE_STATEMENT_TIMEOUT
```

### Contact Information
- For database issues: Check PostgreSQL documentation
- For application issues: Review application logs
- For configuration issues: Check environment variables

## Prevention

### Regular Maintenance
1. **Weekly**: Run performance monitor script
2. **Monthly**: Review and optimize slow queries
3. **Quarterly**: Review and adjust timeout settings
4. **Annually**: Plan for scaling and optimization

### Best Practices
1. Always test performance changes in staging environment
2. Monitor performance metrics continuously
3. Implement gradual rollouts for major changes
4. Keep documentation updated with current settings
5. Regular database maintenance and optimization
