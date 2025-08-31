# Process Listener Memory Leak Fix

## Problem

The application was experiencing a `MaxListenersExceededWarning` for SIGINT listeners, indicating that too many event listeners were being added to the process without proper cleanup. This commonly occurs in development environments with hot reloading.

## Root Cause

Multiple SIGINT and SIGTERM listeners were being added in various parts of the application:

1. **Database connection pool** (`src/lib/db.ts`) - Added listeners every time `getPool()` was called
2. **Startup scripts** (`start-local.js`) - Multiple listeners for child process management
3. **Health check scripts** - Individual listeners in each script
4. **Upload queue processor** - Signal handlers for graceful shutdown

## Solution

### 1. Process Manager Utility

Created `src/lib/process-manager.ts` to safely manage process event listeners:

- Prevents duplicate listeners
- Provides centralized management
- Includes cleanup utilities
- Increases default max listeners limit

### 2. Database Pool Fix

Updated `src/lib/db.ts` to:
- Only add shutdown handlers once
- Use the ProcessManager utility
- Prevent multiple listener registration

### 3. Startup Script Improvements

Enhanced `start-local.js` to:
- Track child processes properly
- Use centralized signal handling
- Prevent duplicate listeners
- Implement proper cleanup

### 4. Debug Tools

Added debugging capabilities:
- `scripts/debug-listeners.js` - Monitor listener counts
- `npm run debug:listeners` - Easy access to debug tool

## Usage

### Running the Debug Tool

```bash
npm run debug:listeners
```

This will show:
- Current listener counts for all signals
- Memory usage
- Process uptime
- Development mode warnings

### Using ProcessManager

```typescript
import { addProcessHandler, removeProcessHandler } from '@/lib/process-manager';

// Add a handler (prevents duplicates)
addProcessHandler('SIGINT', () => {
  console.log('Shutting down...');
}, 'my-app-shutdown');

// Remove a specific handler
removeProcessHandler('SIGINT', 'my-app-shutdown');
```

## Prevention

To prevent future listener leaks:

1. **Always use ProcessManager** for signal handling
2. **Restart development server** periodically during long sessions
3. **Monitor listener counts** using the debug tool
4. **Avoid direct `process.on()` calls** in application code
5. **Clean up listeners** when components unmount or services stop

## Monitoring

The debug tool provides real-time monitoring:

```bash
# Check current state
npm run debug:listeners

# Look for warnings like:
# ⚠️  Warning: High listener count for SIGINT
```

## Files Modified

- `src/lib/db.ts` - Fixed database pool signal handling
- `src/lib/process-manager.ts` - New utility for safe listener management
- `start-local.js` - Improved process management
- `scripts/debug-listeners.js` - New debug tool
- `package.json` - Added debug script

## Testing

After implementing the fix:

1. Start the development server
2. Run `npm run debug:listeners` to check initial state
3. Perform hot reloads and restart the server
4. Run the debug tool again to verify no listener accumulation
5. Check that graceful shutdown still works properly
