# Enhanced SSE Migration Guide

## Overview

This guide helps you migrate from the old SSE implementation to the new **Enhanced SSE Manager** that loads endpoints one by one, handles errors gracefully, and prevents application freezing.

## 🆕 What's New

### 1. **Sequential Endpoint Loading**
- Endpoints are connected one by one instead of simultaneously
- Prevents overwhelming the server with multiple connections
- Priority-based connection order

### 2. **Enhanced Error Handling**
- Automatic detection of hanging EventSource connections
- Graceful fallback when endpoints fail
- Comprehensive error logging for debugging

### 3. **Connection Health Monitoring**
- Real-time connection status monitoring
- Automatic retry with exponential backoff
- Connection timeout protection

### 4. **Debug Utilities**
- Built-in EventSource connection monitoring
- Hanging connection detection
- Detailed connection reports

## 🔄 Migration Steps

### Step 1: Update Imports

**Before (Old System):**
```typescript
import { useSimpleSSE, useCandidateUpdates, usePositionUpdates, useNotifications, useUploadQueueUpdates } from '@/hooks/use-simple-sse';
```

**After (New System):**
```typescript
import { useEnhancedSSE, useEnhancedCandidateUpdates, useEnhancedPositionUpdates, useEnhancedUploadQueueUpdates } from '@/hooks/use-enhanced-sse';
```

### Step 2: Update Hook Usage

**Before:**
```typescript
const { isConnected, error, reconnect } = useSimpleSSE();
```

**After:**
```typescript
const { 
  isConnected, 
  isFullyConnected, 
  hasFailures, 
  error, 
  reconnect,
  connectionStatus,
  reconnectEndpoint,
  toggleEndpoint 
} = useEnhancedSSE();
```

### Step 3: Update Specialized Hooks

**Before:**
```typescript
const { isConnected: realtimeConnected } = useSimpleSSE();
const { uploadQueueUpdate } = useUploadQueueUpdates();
```

**After:**
```typescript
const { isConnected: realtimeConnected } = useEnhancedSSE();
const { isConnected, hasUploadQueueSSE } = useEnhancedUploadQueueUpdates();
```

### Step 4: Add Enhanced Status Component

**Add to your layout or debug page:**
```typescript
import { EnhancedSSEStatus } from '@/components/ui/enhanced-sse-status';

// In your component
<EnhancedSSEStatus />
```

## 📋 Complete Migration Example

### Before (Old System):
```typescript
import { useSimpleSSE, useCandidateUpdates, usePositionUpdates, useNotifications, useUploadQueueUpdates } from '@/hooks/use-simple-sse';

export function MyComponent() {
  const { isConnected, error, reconnect } = useSimpleSSE();
  const { candidateUpdate } = useCandidateUpdates();
  const { positionUpdate } = usePositionUpdates();
  const { uploadQueueUpdate } = useUploadQueueUpdates();

  return (
    <div>
      {error && <div>Error: {error}</div>}
      {!isConnected && <button onClick={reconnect}>Reconnect</button>}
      {/* Component content */}
    </div>
  );
}
```

### After (New System):
```typescript
import { useEnhancedSSE, useEnhancedCandidateUpdates, useEnhancedPositionUpdates, useEnhancedUploadQueueUpdates } from '@/hooks/use-enhanced-sse';

export function MyComponent() {
  const { 
    isConnected, 
    isFullyConnected, 
    hasFailures, 
    error, 
    reconnect,
    connectionStatus 
  } = useEnhancedSSE();
  
  const { isConnected: candidateConnected, hasMainSSE } = useEnhancedCandidateUpdates();
  const { isConnected: positionConnected } = useEnhancedPositionUpdates();
  const { isConnected: uploadQueueConnected, hasUploadQueueSSE } = useEnhancedUploadQueueUpdates();

  return (
    <div>
      {/* Enhanced error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <strong>Connection Issues:</strong> {error}
        </div>
      )}
      
      {/* Connection status */}
      <div className="text-sm text-gray-600">
        {isFullyConnected ? (
          <span className="text-green-600">✅ All endpoints connected</span>
        ) : hasFailures ? (
          <span className="text-red-600">⚠️ Some endpoints failed</span>
        ) : (
          <span className="text-yellow-600">🔄 Connecting to endpoints...</span>
        )}
      </div>
      
      {/* Reconnect button */}
      {!isConnected && (
        <button onClick={reconnect} className="btn btn-primary">
          Reconnect All Endpoints
        </button>
      )}
      
      {/* Component content */}
    </div>
  );
}
```

## 🛠️ Debug Utilities

### Enable Debug Mode
```typescript
import sseDebugUtility from '@/lib/sse-debug-utility';

// Enable debug mode in development
if (process.env.NODE_ENV === 'development') {
  sseDebugUtility.enableDebugMode();
}
```

### Get Connection Summary
```typescript
// Log connection summary to console
SSEDebugUtility.logConnectionSummary();

// Get detailed report
const report = sseDebugUtility.getDetailedReport();
console.log('SSE Debug Report:', report);
```

### Force Close Hanging Connections
```typescript
// Force close any hanging connections
sseDebugUtility.forceCloseHangingConnections();
```

## 🔧 Configuration Options

### Customize Timeouts and Retries
```typescript
import enhancedSSEManager from '@/lib/enhanced-sse-manager';

// The manager is already configured with sensible defaults:
// - Connection timeout: 10 seconds
// - Retry delay: 5 seconds
// - Max retries: 2-3 per endpoint
// - Priority-based connection order
```

### Endpoint Priority Order
The system connects to endpoints in this priority order:
1. **Main SSE** (`/api/sse`) - Highest priority
2. **Upload Queue SSE** (`/api/upload-queue/sse`) - Medium priority  
3. **Dashboard Stream** (`/api/dashboard/stream`) - Lower priority

## 📊 Monitoring and Debugging

### 1. **Browser Console**
- Look for `[Enhanced SSE Manager]` and `[SSE Debug]` logs
- Monitor connection attempts and errors
- Check for hanging connection warnings

### 2. **Enhanced Status Component**
- Real-time connection status for all endpoints
- Individual endpoint controls (enable/disable/reconnect)
- Error details and recommendations

### 3. **Debug Utility**
- Automatic EventSource connection tracking
- Hanging connection detection
- Connection health scoring

## 🚨 Troubleshooting

### Common Issues

#### 1. **Endpoints Not Connecting**
```typescript
// Check connection status
const status = enhancedSSEManager.getConnectionStatus();
console.log('Connection Status:', status);

// Force reconnect specific endpoint
enhancedSSEManager.forceReconnect('main-sse');
```

#### 2. **Application Still Freezing**
```typescript
// Enable debug mode to detect hanging connections
sseDebugUtility.enableDebugMode();

// Check for hanging connections
const report = sseDebugUtility.detectHangingConnections();
console.log('Hanging Connections:', report);

// Force close hanging connections
sseDebugUtility.forceCloseHangingConnections();
```

#### 3. **High Error Rates**
```typescript
// Check individual endpoint status
const endpoint = enhancedSSEManager.getEndpointDetails('main-sse');
console.log('Endpoint Details:', endpoint);

// Temporarily disable problematic endpoint
enhancedSSEManager.disableEndpoint('main-sse');
```

## ✅ Migration Checklist

- [ ] Update import statements
- [ ] Replace `useSimpleSSE` with `useEnhancedSSE`
- [ ] Update specialized hook usage
- [ ] Add enhanced error handling
- [ ] Add connection status display
- [ ] Test all endpoints
- [ ] Enable debug mode in development
- [ ] Monitor console for issues
- [ ] Verify no application freezing

## 🔮 Future Enhancements

The enhanced SSE system is designed to be extensible:

- **Custom Endpoints**: Add new SSE endpoints easily
- **Advanced Retry Logic**: Customize retry strategies
- **Connection Pooling**: Implement connection limits
- **Health Checks**: Add endpoint health monitoring
- **Metrics**: Export connection metrics for monitoring

## 📚 Additional Resources

- [Enhanced SSE Manager API Reference](./enhanced-sse-manager-api.md)
- [SSE Debug Utility Guide](./sse-debug-utility-guide.md)
- [Troubleshooting Guide](./sse-troubleshooting-guide.md)
- [Best Practices](./sse-best-practices.md)

## 🆘 Need Help?

If you encounter issues during migration:

1. Check the browser console for detailed error logs
2. Use the enhanced status component to diagnose issues
3. Enable debug mode for additional logging
4. Check the troubleshooting guide for common solutions
5. Review the API reference for available methods
