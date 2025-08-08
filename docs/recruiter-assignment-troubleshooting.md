# Recruiter Assignment Troubleshooting Guide

## Issue Description
Recruiters are unable to assign candidates on the candidate client page and position edit page.

## Root Causes and Solutions

### 1. Permission Issues

**Problem**: Recruiters don't have permission to fetch other recruiters for assignment.

**Solution**: The users API has been updated to allow recruiters to fetch other recruiters for assignment purposes while maintaining security for other user management operations.

**Code Changes Made**:
- Updated `/api/users/route.ts` to allow recruiters to fetch other recruiters
- Added proper error handling and debugging information

### 2. Error Handling Issues

**Problem**: Silent failures in recruiter assignment with no user feedback.

**Solution**: Enhanced error handling across all recruiter assignment functions.

**Code Changes Made**:
- Improved error handling in `handleAssignRecruiter` functions
- Added detailed error messages and console logging
- Enhanced `fetchRecruiters` functions with better error reporting

### 3. Session Validation Issues

**Problem**: Session validation might be failing for recruiter users.

**Solution**: Ensure proper session validation and user permissions.

## Testing the Fix

### Run the Test Script
```bash
node scripts/test-recruiter-assignment.js
```

This script will:
1. Test the `/api/users?role=Recruiter` endpoint
2. Verify recruiter data is being returned
3. Test candidate and position APIs
4. Test actual recruiter assignment functionality

### Manual Testing Steps

1. **Check Recruiter Users Exist**:
   ```sql
   SELECT id, name, email, role FROM "User" WHERE role = 'Recruiter';
   ```

2. **Test API Endpoint**:
   ```bash
   curl -X GET "http://localhost:3000/api/users?role=Recruiter" \
     -H "Cookie: your-session-cookie"
   ```

3. **Check Browser Console**:
   - Open browser developer tools
   - Go to Console tab
   - Look for any error messages related to recruiter fetching
   - Check Network tab for failed API calls

## Common Issues and Solutions

### Issue 1: "No recruiters available" message
**Cause**: No users with role="Recruiter" in the database
**Solution**: Create recruiter users in the database

### Issue 2: "Forbidden: Insufficient permissions" error
**Cause**: User doesn't have proper permissions
**Solution**: Ensure user has role="Recruiter" or proper module permissions

### Issue 3: "Failed to fetch recruiters" error
**Cause**: API endpoint returning error
**Solution**: Check server logs and ensure API is running properly

### Issue 4: Recruiter assignment not saving
**Cause**: Database constraint or validation error
**Solution**: Check candidate update API logs and ensure proper data format

## Debugging Steps

### 1. Check Server Logs
Look for errors in the application logs:
```bash
# If using npm
npm run dev

# If using Docker
docker logs your-container-name
```

### 2. Check Database
Verify recruiter users exist:
```sql
SELECT * FROM "User" WHERE role = 'Recruiter';
```

### 3. Check Browser Network Tab
1. Open browser developer tools
2. Go to Network tab
3. Try to assign a recruiter
4. Look for failed requests to `/api/users` or `/api/candidates`

### 4. Check Console Logs
Look for JavaScript errors in the browser console that might indicate client-side issues.

## Code Changes Summary

### Files Modified:
1. `src/app/api/users/route.ts` - Fixed permission logic
2. `src/app/candidates/[id]/page.tsx` - Improved error handling
3. `src/components/positions/EditPositionModal.tsx` - Enhanced error handling
4. `src/components/candidates/CandidatesPageClient.tsx` - Better error reporting
5. `src/app/positions/[id]/page.tsx` - Improved error handling

### Key Improvements:
- Better error messages and debugging information
- Proper permission handling for recruiters
- Enhanced error handling in all recruiter assignment functions
- Added console logging for debugging
- Improved user feedback with toast notifications

## Verification Checklist

- [ ] Recruiter users exist in the database
- [ ] `/api/users?role=Recruiter` endpoint returns data
- [ ] No permission errors in browser console
- [ ] Recruiter assignment dropdown shows available recruiters
- [ ] Assignment saves successfully to database
- [ ] UI updates immediately after assignment
- [ ] Error messages are clear and helpful

## Support

If issues persist after implementing these fixes:

1. Check the test script output for specific error messages
2. Review server logs for detailed error information
3. Verify database connectivity and user permissions
4. Test with a fresh browser session to rule out caching issues
