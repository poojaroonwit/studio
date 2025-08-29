# Session Logging Reduction

This document explains the changes made to reduce session-related logs that appear in container output.

## Problem

The application was generating verbose session-related logs that cluttered container output, making it difficult to identify important system messages and errors.

## Changes Made

### 1. NextAuth Debug Logging Disabled

**File**: `src/lib/auth.ts`
- Changed `debug: process.env.NODE_ENV === 'development'` to `debug: false`
- This disables NextAuth's built-in debug logging that was showing session establishment, token refresh, and authentication flow details

### 2. Session Callback Logging Removed

**File**: `src/lib/auth.ts`
- Removed `console.log('[SESSION CALLBACK] Set session permissions:', session.user.modulePermissions);`
- This was logging user permissions on every session establishment

### 3. Header Component Logging Removed

**File**: `src/components/layout/Header.tsx`
- Removed session status logging during signout process
- Removed user cache clearing logs
- Removed redirect logging

### 4. SignIn Client Logging Removed

**File**: `src/app/auth/signin/SignInClient.tsx`
- Removed authentication status change logging
- Removed signout redirect detection logs
- Removed redirect logging

### 5. API Route Logging Reduced

**Files**: 
- `src/app/api/settings/position-levels/route.ts`
- `src/app/api/headcount/[id]/attachments/route.ts`
- `src/app/api/auth/refresh-permissions/route.ts`

- Removed session check logging
- Removed user authentication logging
- Removed permission refresh logging

### 6. Position Debug Logging Disabled

**File**: `src/lib/position-debug.ts`
- Disabled the `logPositionDebugInfo` function that was logging session information
- Debug information is still collected but not logged to console

## Environment Variables

You can control session logging behavior using these environment variables:

```bash
# Disable NextAuth debug logging
NEXTAUTH_DEBUG=false

# Disable custom session logging
SESSION_LOGGING=false
```

## Quick Setup

Run the provided script to automatically configure session logging:

```bash
node scripts/disable-session-logs.js
```

This script will:
1. Update your `.env.local` file with appropriate settings
2. Provide instructions for applying changes
3. Show how to re-enable logging if needed

## Re-enabling Session Logging

If you need to debug session-related issues, you can re-enable logging:

1. **For NextAuth debug logs**:
   ```bash
   NEXTAUTH_DEBUG=true
   ```

2. **For custom session logs**:
   - Temporarily uncomment the removed `console.log` statements
   - Or set `SESSION_LOGGING=true` if you implement conditional logging

3. **Restart your server** after making changes

## Benefits

- **Cleaner container logs**: Easier to identify important system messages
- **Reduced log volume**: Less storage and processing overhead
- **Better performance**: Fewer console operations
- **Maintained functionality**: All session management still works correctly

## Monitoring

Even with logging disabled, you can still monitor session activity through:

1. **Application logs**: Check `/api/logs` endpoint for system-level logging
2. **Database audit logs**: Session events are still recorded in the database
3. **Browser developer tools**: Client-side session state is still visible
4. **Network monitoring**: Authentication requests are still logged at the network level

## Troubleshooting

If you encounter session-related issues:

1. **Enable NextAuth debug**: Set `NEXTAUTH_DEBUG=true`
2. **Check browser console**: Client-side session errors are still logged
3. **Monitor network requests**: Authentication API calls are still visible
4. **Check database logs**: Session events are still recorded in audit tables

## Future Considerations

- Consider implementing structured logging with different log levels
- Add conditional logging based on environment (dev/staging/prod)
- Implement log aggregation for better session monitoring
- Add session metrics collection for performance monitoring
