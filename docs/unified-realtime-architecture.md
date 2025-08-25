# Unified Realtime Architecture

## Overview

The unified realtime architecture consolidates all realtime functionality into a single, robust Server-Sent Events (SSE) system. This replaces the previous scattered approach with WebSockets, multiple SSE endpoints, and polling mechanisms.

## 🚀 **Key Benefits**

### ✅ **Simplified Architecture**
- **Single SSE endpoint** for all realtime events
- **Unified event handling** across the entire application
- **Consistent connection management** and error handling
- **Centralized broadcasting** system

### ✅ **Enhanced Reliability**
- **Automatic reconnection** with exponential backoff
- **Connection health monitoring** with detailed metrics
- **Retry queue** for failed broadcasts
- **Graceful degradation** when connections fail

### ✅ **Better Performance**
- **Reduced server resources** - fewer connections to manage
- **Optimized event delivery** - targeted and broadcast events
- **Connection pooling** - efficient resource usage
- **Health-based routing** - intelligent event distribution

### ✅ **Improved Developer Experience**
- **Single hook** for all realtime functionality
- **Type-safe event handling** with TypeScript
- **Comprehensive status monitoring** and debugging
- **Backward compatibility** with existing code

## 🔧 **Architecture Components**

### 1. **Unified SSE Endpoint** (`/api/realtime/sse`)
```typescript
// Single endpoint handling all realtime events
export async function GET(request: NextRequest) {
  // User authentication and session management
  // Connection establishment and management
  // Event broadcasting to connected clients
}
```

**Features:**
- User-specific and global event broadcasting
- Connection health monitoring
- Automatic cleanup of disconnected clients
- Keepalive and heartbeat mechanisms

### 2. **Unified Realtime Hook** (`useUnifiedRealtime`)
```typescript
const { isConnected, connectionHealth, lastUpdate } = useUnifiedRealtime({
  onCandidateUpdate: handleCandidateUpdate,
  onPositionUpdate: handlePositionUpdate,
  onNotification: handleNotification,
  // ... other event handlers
});
```

**Features:**
- Single connection for all realtime events
- Automatic reconnection with exponential backoff
- Connection health monitoring
- Comprehensive error handling
- Event deduplication and filtering

### 3. **Unified Broadcaster** (`UnifiedRealtimeBroadcaster`)
```typescript
const broadcaster = UnifiedRealtimeBroadcaster.getInstance();

await broadcaster.broadcastCandidateUpdated(candidate, userId, {
  priority: 'high',
  retryOnFailure: true,
  maxRetries: 3
});
```

**Features:**
- Centralized event broadcasting
- Priority-based event handling
- Retry queue for failed broadcasts
- Bulk broadcast operations
- Statistics and monitoring

### 4. **Status Component** (`UnifiedRealtimeStatus`)
```typescript
<UnifiedRealtimeStatus
  isConnected={isConnected}
  connectionHealth={connectionHealth}
  connectedUsers={connectedUsers}
  showDetails={true}
  compact={false}
/>
```

**Features:**
- Real-time connection status display
- Connection health indicators
- User count and statistics
- Compact and detailed view modes

## 📡 **Event Types**

### **Candidate Events**
- `candidate_update` - Candidate created, updated, deleted, or status changed
- `candidate_status_changed` - Specific status transition events

### **Position Events**
- `position_update` - Position created, updated, or deleted
- `position_statistics` - Position count and statistics updates

### **User Events**
- `presence_update` - User joined, left, or page changed
- `user_list_update` - Updated list of online users
- `session_expired` - User session expiration

### **System Events**
- `notification` - System and user notifications
- `warning_update` - Warning creation and resolution
- `health_check` - System health status
- `keepalive` - Connection maintenance

### **Upload Events**
- `upload_queue_update` - Upload queue status changes
- `upload_started` - File upload started
- `upload_completed` - File upload completed
- `upload_failed` - File upload failed

### **Dashboard Events**
- `dashboard_update` - Dashboard metrics and chart updates
- `dashboard_metrics` - Real-time metrics updates

## 🔄 **Event Flow**

### **1. Event Generation**
```typescript
// Server-side: Generate event when data changes
await broadcaster.broadcastCandidateUpdated(updatedCandidate, actingUserId, {
  priority: 'high',
  retryOnFailure: true
});
```

### **2. Event Broadcasting**
```typescript
// Unified SSE endpoint: Broadcast to connected clients
broadcastEvent({
  type: 'candidate_update',
  data: { candidate: updatedCandidate, actingUserId },
  timestamp: new Date().toISOString(),
  targetUserId: undefined // Broadcast to all users
});
```

### **3. Event Reception**
```typescript
// Client-side: Receive and handle events
const { isConnected } = useUnifiedRealtime({
  onCandidateUpdate: (candidate) => {
    // Update local state
    setCandidates(prev => updateCandidate(prev, candidate));
    
    // Show notification for other users' actions
    if (candidate.actingUserId !== currentUserId) {
      showNotification(`Candidate ${candidate.name} updated`);
    }
  }
});
```

## 🛠 **Implementation Guide**

### **1. Replace Existing Realtime Hooks**

**Before (Multiple hooks):**
```typescript
const { isConnected: candidateConnected } = useRealtimeCollaboration({
  onCandidateUpdate: handleCandidateUpdate
});

const { isConnected: presenceConnected } = useUserPresence();

const { isConnected: notificationConnected } = useNotificationContext();
```

**After (Single unified hook):**
```typescript
const { isConnected, connectionHealth } = useUnifiedRealtime({
  onCandidateUpdate: handleCandidateUpdate,
  onPresenceUpdate: handlePresenceUpdate,
  onNotification: handleNotification
});
```

### **2. Update Broadcasting Calls**

**Before (Scattered broadcasting):**
```typescript
// In candidate API
broadcastCandidateUpdate(candidate, userId);

// In position API
broadcastPositionUpdate(position, userId);

// In notification API
broadcastNotification(notification, targetUserId);
```

**After (Unified broadcasting):**
```typescript
// Using the unified broadcaster
await unifiedBroadcaster.broadcastCandidateUpdated(candidate, userId, {
  priority: 'high',
  retryOnFailure: true
});

await unifiedBroadcaster.broadcastPositionUpdated(position, userId);

await unifiedBroadcaster.broadcastUserNotification(targetUserId, message, 'info');
```

### **3. Add Status Monitoring**

```typescript
// In your component
import { UnifiedRealtimeStatus } from '@/components/ui/unified-realtime-status';

function MyComponent() {
  const realtime = useUnifiedRealtime({
    // ... event handlers
  });

  return (
    <div>
      <UnifiedRealtimeStatus
        {...realtime}
        showDetails={true}
        compact={false}
      />
      {/* Your component content */}
    </div>
  );
}
```

## 📊 **Monitoring and Debugging**

### **Connection Health Metrics**
- **Connection Status**: Connected, Reconnecting, Disconnected
- **Health Level**: Excellent, Good, Poor, Disconnected
- **Message Statistics**: Total messages, errors, error rate
- **User Statistics**: Connected users, total connections

### **Debugging Tools**
```typescript
// Get broadcaster statistics
const stats = unifiedBroadcaster.getStatistics();
console.log('Broadcaster stats:', stats);

// Clear retry queue if needed
unifiedBroadcaster.clearRetryQueue();

// Monitor connection health
const { connectionHealth, errorRate } = useUnifiedRealtime();
console.log('Connection health:', connectionHealth, 'Error rate:', errorRate);
```

## 🔒 **Security and Performance**

### **Security Features**
- **User authentication** required for SSE connections
- **User-specific events** - events only sent to intended recipients
- **Session validation** - automatic session expiration handling
- **Rate limiting** - built-in protection against abuse

### **Performance Optimizations**
- **Connection pooling** - efficient resource management
- **Event batching** - bulk operations for multiple events
- **Health-based routing** - intelligent event distribution
- **Automatic cleanup** - removal of stale connections

## 🚀 **Migration Path**

### **Phase 1: Implementation**
1. Deploy unified SSE endpoint
2. Implement unified realtime hook
3. Create unified broadcaster
4. Add status monitoring component

### **Phase 2: Migration**
1. Update components to use unified hook
2. Replace scattered broadcasting calls
3. Add status monitoring to key pages
4. Test and validate functionality

### **Phase 3: Cleanup**
1. Remove old SSE endpoints
2. Remove WebSocket implementations
3. Remove polling fallbacks
4. Update documentation

## 📈 **Benefits Realized**

### **For Developers**
- **Simplified codebase** - single realtime system to maintain
- **Better debugging** - comprehensive monitoring and logging
- **Type safety** - full TypeScript support
- **Consistent API** - unified interface across the application

### **For Users**
- **More reliable** - better connection management and recovery
- **Faster updates** - optimized event delivery
- **Better feedback** - clear connection status indicators
- **Consistent experience** - unified realtime behavior

### **For System**
- **Reduced complexity** - fewer moving parts to maintain
- **Better performance** - optimized resource usage
- **Improved scalability** - efficient connection management
- **Enhanced monitoring** - comprehensive health tracking

## 🔮 **Future Enhancements**

### **Planned Features**
- **Event persistence** - store events for offline users
- **Advanced filtering** - user-specific event filtering
- **Performance analytics** - detailed performance metrics
- **Mobile optimization** - battery-efficient mobile connections

### **Integration Opportunities**
- **Push notifications** - integrate with browser push APIs
- **Offline support** - queue events for offline users
- **Multi-device sync** - synchronize across user devices
- **Analytics integration** - realtime usage analytics

This unified architecture provides a solid foundation for all realtime functionality while maintaining simplicity, reliability, and performance.
