# Task Board Drag and Drop Troubleshooting

## Overview

This guide helps resolve issues where some columns in the task board are not allowing drag and drop of candidate cards.

## Common Issues

### ❌ **Some Columns Not Accepting Drops**

**Symptoms:**
- Task board shows recruitment stages as columns
- Some columns allow drag and drop, others don't
- No visual feedback when dragging over certain columns
- Error messages when trying to drop on certain columns

**Root Causes:**
1. **Permission Issues**: User lacks `CANDIDATES_MANAGE` permission
2. **Validation Issues**: Status values not in allowed list
3. **API Errors**: Backend validation failing
4. **JavaScript Errors**: Frontend drag and drop logic failing

## Solutions

### 🔧 **Solution 1: Check User Permissions**

1. **Verify User Permissions**:
   - Go to **Settings** → **Manage Users**
   - Find your user and click **"Edit"**
   - Go to **"Permissions"** tab
   - Check if **"Manage Candidates"** (`CANDIDATES_MANAGE`) is enabled
   - If not, enable it and save

2. **Check Group Permissions**:
   - Go to **Settings** → **Roles & Permissions**
   - Check your user group permissions
   - Ensure **"Manage Candidates"** is enabled for your group

### 🔧 **Solution 2: Check Browser Console**

1. **Open Developer Tools**:
   - Press `F12` or right-click → **Inspect**
   - Go to **Console** tab

2. **Look for Errors**:
   - Try dragging a candidate card
   - Check for any red error messages
   - Common errors:
     - `403 Forbidden` - Permission issue
     - `400 Bad Request` - Validation issue
     - `Network Error` - API connectivity issue

### 🔧 **Solution 3: Test API Endpoint**

1. **Check API Response**:
   ```bash
   # Test candidate update endpoint
   curl -X PUT "http://localhost:3000/api/candidates/YOUR_CANDIDATE_ID" \
     -H "Content-Type: application/json" \
     -H "Cookie: YOUR_SESSION_COOKIE" \
     -d '{"status":"NEW_STATUS"}'
   ```

2. **Expected Response**:
   - `200 OK` - Success
   - `403 Forbidden` - Permission issue
   - `400 Bad Request` - Validation issue

### 🔧 **Solution 4: Verify Status Values**

1. **Check Available Stages**:
   - Go to **Settings** → **Recruitment Stages**
   - Note the exact stage names

2. **Compare with Validation**:
   - The system validates against available stages
   - Ensure stage names match exactly (case-sensitive)

### 🔧 **Solution 5: Clear Browser Cache**

1. **Hard Refresh**:
   - Press `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache completely

2. **Check Network Tab**:
   - Open Developer Tools → **Network** tab
   - Try dragging a card
   - Look for failed API requests

## Diagnostic Steps

### 📊 **Step 1: Check User Session**

Open browser console and run:
```javascript
// Check if user has required permissions
fetch('/api/auth/validate-session')
  .then(r => r.json())
  .then(data => console.log('Session:', data));
```

### 📊 **Step 2: Check Available Stages**

```javascript
// Get available stages
fetch('/api/recruitment-stages')
  .then(r => r.json())
  .then(data => console.log('Stages:', data));
```

### 📊 **Step 3: Test Candidate Update**

```javascript
// Test updating a candidate status
fetch('/api/candidates/CANDIDATE_ID', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'NEW_STATUS' })
})
.then(r => r.json())
.then(data => console.log('Update result:', data));
```

## Common Error Messages

### 🔴 **"Forbidden: Insufficient permissions"**
- **Cause**: User lacks `CANDIDATES_MANAGE` permission
- **Solution**: Grant permission in user settings

### 🔴 **"Invalid status: [status]"**
- **Cause**: Status not in allowed list
- **Solution**: Check available stages in settings

### 🔴 **"Candidate not found"**
- **Cause**: Invalid candidate ID
- **Solution**: Refresh the page and try again

### 🔴 **"Network error"**
- **Cause**: API connectivity issue
- **Solution**: Check server status and network connection

## Prevention

### ✅ **For Administrators**

1. **Set Up Permissions Correctly**:
   - Ensure all users have appropriate permissions
   - Use groups for common permission sets

2. **Configure Stages Properly**:
   - Set up recruitment stages in Settings
   - Use consistent naming conventions

3. **Test Regularly**:
   - Test drag and drop functionality
   - Monitor for permission issues

### ✅ **For Users**

1. **Check Your Permissions**:
   - Verify you have `CANDIDATES_MANAGE` permission
   - Contact admin if permissions are missing

2. **Report Issues**:
   - Note which columns don't work
   - Include browser console errors
   - Provide steps to reproduce

## Troubleshooting Checklist

### ✅ **Before Contacting Support**

- [ ] User has `CANDIDATES_MANAGE` permission
- [ ] Browser console shows no errors
- [ ] API endpoint responds correctly
- [ ] Stage names match exactly
- [ ] Browser cache has been cleared
- [ ] User is not using incognito/private browsing

### ✅ **Common Solutions to Try**

1. **Grant permissions**:
   - Enable `CANDIDATES_MANAGE` for user/group

2. **Check stage configuration**:
   - Verify stage names in Settings

3. **Clear browser data**:
   - Clear cache and cookies

4. **Test with different browser**:
   - Try Chrome, Firefox, Safari

5. **Check network connectivity**:
   - Ensure stable internet connection

## Support Information

### 📞 **When to Contact Support**

Contact support if:
- All columns refuse drag and drop
- Permission changes don't take effect
- API endpoints return unexpected errors
- Multiple users are affected

### 📋 **Information to Provide**

When reporting issues, include:
- User role and permissions
- Browser and version
- Console error messages
- Steps to reproduce
- Which columns work/don't work
- API response details

## Related Documentation

- [Task Board Permissions System](./task-board-permissions.md)
- [Azure AD Task Board Troubleshooting](./azure-ad-task-board-troubleshooting.md)
- [Candidate Management Permissions](../src/lib/types.ts)
