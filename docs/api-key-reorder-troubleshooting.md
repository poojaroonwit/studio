# API Key Reorder Troubleshooting Guide

## Overview

This guide helps you diagnose and resolve the "Failed to update API key order" error that can occur when trying to reorder AI API keys in the system settings.

## Common Error Messages

### 1. "Permission denied. You need SYSTEM_SETTINGS_MANAGE permission or Admin role."

**Cause**: Insufficient user permissions
**Solution**: 
- Ensure you have Admin role, OR
- Add `SYSTEM_SETTINGS_MANAGE` permission to your user account

### 2. "Invalid request data" or "Validation error"

**Cause**: Malformed request data
**Solution**:
- Refresh the page and try again
- Check browser console for detailed error information
- Ensure API keys are properly formatted

### 3. "Server error occurred. Please try again."

**Cause**: Database connection or transaction issues
**Solution**:
- Check database connectivity
- Verify database permissions
- Check server logs for detailed error information

### 4. "Database connection error"

**Cause**: Database connectivity issues
**Solution**:
- Verify DATABASE_URL environment variable
- Check database server status
- Ensure network connectivity to database

## Step-by-Step Troubleshooting

### Step 1: Check Your Permissions

1. **Navigate to User Management**:
   - Go to **Settings** → **Manage Users**
   - Find your user account in the list

2. **Check Your Role**:
   - If your role is "Admin", you should have access
   - If not, proceed to check specific permissions

3. **Check Specific Permissions**:
   - Click "Edit" on your user account
   - Look for "SYSTEM_SETTINGS_MANAGE" permission
   - Ensure it's enabled

### Step 2: Use the Troubleshoot Button

1. **In the AI API Keys page**:
   - Click the "Troubleshoot" button in the statistics card
   - Check the browser console for diagnostic information
   - Look for permission status and API key count

### Step 3: Check Browser Console

1. **Open Developer Tools**:
   - Press F12 or right-click → "Inspect"
   - Go to the "Console" tab

2. **Look for Error Messages**:
   - Check for detailed error information
   - Look for "API reorder failed" messages
   - Note the HTTP status codes

### Step 4: Check Server Logs

1. **Access Application Logs**:
   - Go to **Settings** → **Application Logs**
   - Filter by source: "API:AiApiKeys:Reorder"
   - Look for recent error entries

2. **Check Database Logs**:
   - If you have database access, check for connection errors
   - Look for transaction failures

## Permission Setup

### For Admin Users

Admin users automatically have all permissions, including `SYSTEM_SETTINGS_MANAGE`.

### For Non-Admin Users

To grant `SYSTEM_SETTINGS_MANAGE` permission:

1. **Via Role Settings**:
   - Go to **Settings** → **Roles & Permissions**
   - Select the user's role
   - Enable "Manage System Preferences" permission
   - Save changes

2. **Via User Settings**:
   - Go to **Settings** → **Manage Users**
   - Edit the specific user
   - Add "SYSTEM_SETTINGS_MANAGE" permission directly
   - Save changes

## Database Issues

### Connection Problems

If you're experiencing database connection issues:

1. **Check Environment Variables**:
   - Verify `DATABASE_URL` is set correctly
   - Ensure database credentials are valid

2. **Check Database Status**:
   - Verify database server is running
   - Check network connectivity

3. **Check Connection Pool**:
   - Monitor connection pool usage
   - Restart application if needed

### Transaction Issues

If database transactions are failing:

1. **Check Database Permissions**:
   - Ensure user has INSERT/UPDATE/DELETE permissions on SystemSetting table
   - Verify transaction isolation level

2. **Check for Lock Conflicts**:
   - Look for concurrent access issues
   - Check for long-running transactions

## Prevention

### Best Practices

1. **Regular Permission Audits**:
   - Periodically review user permissions
   - Remove unnecessary permissions
   - Ensure proper role assignments

2. **Database Maintenance**:
   - Regular database backups
   - Monitor connection pool health
   - Check for performance issues

3. **Error Monitoring**:
   - Set up error alerting
   - Monitor application logs
   - Track API key usage patterns

## Getting Help

If you're still experiencing issues:

1. **Collect Diagnostic Information**:
   - Use the troubleshoot button
   - Check browser console logs
   - Review application logs
   - Note any error messages

2. **Contact Support**:
   - Provide detailed error messages
   - Include diagnostic information
   - Describe steps to reproduce the issue

## Related Documentation

- [Admin Permission Management](../admin-permission-management.md)
- [System Settings Management](../system-settings-management.md)
- [AI API Key Fallback System](../ai-api-key-fallback-system.md)
