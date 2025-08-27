# Position Loading Troubleshooting Guide

## Overview

This guide helps diagnose and resolve "failed to load position" errors in the Studio 9 application.

## Common Error Messages

- "Failed to load position"
- "Could not load position"
- "Position not found"
- "Error fetching position"

## Quick Diagnosis Steps

### 1. Check Browser Console
Open browser developer tools (F12) and check the Console tab for error messages. Look for:
- Network errors
- API response errors
- JavaScript errors

### 2. Use the Debug Panel
Navigate to `/debug-position` to use the built-in debug panel:
- Enter a position ID
- Test the API endpoint
- Review detailed error information

### 3. Check Network Tab
In browser developer tools, go to the Network tab:
- Look for failed requests to `/api/positions/[id]`
- Check response status codes
- Review response headers and body

## Common Issues and Solutions

### Issue 1: 404 Not Found
**Symptoms:** Position not found error
**Causes:**
- Position ID doesn't exist in database
- Invalid position ID format
- Database connection issues

**Solutions:**
1. Verify the position ID is correct
2. Check if the position exists in the database
3. Ensure database connection is working

### Issue 2: 401 Unauthorized
**Symptoms:** Unauthorized access error
**Causes:**
- User session expired
- Invalid authentication
- Missing or invalid session token

**Solutions:**
1. Refresh the page to re-authenticate
2. Log out and log back in
3. Clear browser cookies and cache
4. Check if the user has proper permissions

### Issue 3: 500 Internal Server Error
**Symptoms:** Server error when loading position
**Causes:**
- Database connection issues
- Query execution errors
- Server configuration problems

**Solutions:**
1. Check server logs for detailed error information
2. Verify database connectivity
3. Restart the application server
4. Check database schema and migrations

### Issue 4: Network Error
**Symptoms:** Failed to fetch position
**Causes:**
- API endpoint not accessible
- Network connectivity issues
- Server not running

**Solutions:**
1. Check if the development server is running
2. Verify API endpoint URL is correct
3. Check network connectivity
4. Restart the development server

## Debugging Tools

### 1. Position Debug Panel
Access: `/debug-position`

Features:
- Test position API endpoints
- Validate position IDs
- View detailed error information
- Test with different position IDs

### 2. Browser Console Logging
The application now includes enhanced logging:
- `[PositionDetailDrawer]` - Position detail component logs
- `[Positions API]` - API endpoint logs
- `[PositionsCache]` - Cache management logs

### 3. API Testing
Test the position API directly:
```bash
curl -X GET "http://localhost:3000/api/positions/[position-id]" \
  -H "Content-Type: application/json"
```

## Database Checks

### 1. Verify Position Exists
```sql
SELECT id, title, department FROM "Position" WHERE id = '[position-id]';
```

### 2. Check Database Connection
```sql
SELECT 1;
```

### 3. Verify Schema
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Position';
```

## Prevention

### 1. Error Handling
- Always handle API errors gracefully
- Provide meaningful error messages
- Implement retry mechanisms for transient failures

### 2. Validation
- Validate position IDs before making API calls
- Check user permissions
- Verify data integrity

### 3. Monitoring
- Monitor API response times
- Track error rates
- Set up alerts for critical failures

## Getting Help

If you're still experiencing issues:

1. **Collect Information:**
   - Error message
   - Position ID
   - Browser console logs
   - Network tab information
   - Steps to reproduce

2. **Check Recent Changes:**
   - Recent code deployments
   - Database migrations
   - Configuration changes

3. **Contact Support:**
   - Provide collected information
   - Include debug panel results
   - Describe the expected vs actual behavior

## Related Files

- `src/components/positions/PositionDetailDrawer.tsx` - Position detail component
- `src/app/api/positions/[id]/route.ts` - Position API endpoint
- `src/hooks/use-positions-cache.ts` - Position cache management
- `src/lib/position-debug.ts` - Debug utilities
- `src/components/debug/PositionDebugPanel.tsx` - Debug panel component
