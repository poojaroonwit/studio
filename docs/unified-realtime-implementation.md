# Unified Realtime System - Implementation Guide

## 🎯 **Overview**

The unified realtime system has been successfully implemented and replaces the previous scattered approach with WebSockets, multiple SSE endpoints, and polling mechanisms. This document provides a complete guide to the implementation and usage.

## ✅ **What Has Been Implemented**

### **1. Core Infrastructure**

#### **Unified SSE Endpoint** (`/api/realtime/sse`)
- **Location**: `src/app/api/realtime/sse/route.ts`
- **Features**:
  - Single endpoint for all realtime events
  - User authentication and session management
  - Connection health monitoring
  - Automatic cleanup of disconnected clients
  - Keepalive and heartbeat mechanisms
  - User-specific and global event broadcasting

#### **Unified Realtime Hook** (`useUnifiedRealtime`)
- **Location**: `src/hooks/use-unified-realtime.ts`
- **Features**:
  - Single hook for all realtime functionality
  - Automatic reconnection with exponential backoff
  - Connection health monitoring
  - Comprehensive error handling
  - Event deduplication and filtering
  - Type-safe event handling

#### **Unified Broadcaster** (`UnifiedRealtimeBroadcaster`)
- **Location**: `src/lib/unified-realtime-broadcaster.ts`
- **Features**:
  - Centralized event broadcasting
  - Priority-based event handling
  - Retry queue for failed broadcasts
  - Bulk broadcast operations
  - Statistics and monitoring

#### **Status Component** (`UnifiedRealtimeStatus`)
- **Location**: `src/components/ui/unified-realtime-status.tsx`
- **Features**:
  - Real-time connection status display
  - Connection health indicators
  - User count and statistics
  - Compact and detailed view modes

### **2. Updated Components**

The following components have been successfully migrated to use the unified realtime system:

#### **Main Pages**
- ✅ `CandidatesPageClient.tsx` - Candidate management with realtime updates
- ✅ `PositionsPageClient.tsx` - Position management with realtime updates
- ✅ `DashboardPageClient.tsx` - Dashboard with live metrics and updates
- ✅ `MyTasksPageClient.tsx` - Task board with realtime collaboration
- ✅ `TaskBoardPage.tsx` - Task management with realtime updates

#### **Detail Views**
- ✅ `CandidateDetailView.tsx` - Individual candidate view with realtime updates
- ✅ `useCandidateDetail.ts` - Candidate detail hook with realtime integration

#### **UI Components**
- ✅ `UserPresenceIndicator.tsx` - User presence with unified realtime
- ✅ `RealtimeIndicator.tsx` - Connection status indicators

### **3. Updated API Endpoints**

The following API endpoints have been updated to use the unified broadcaster:

#### **Candidate APIs**
- ✅ `POST /api/candidates` - Create candidate with unified broadcasting
- ✅ `PUT /api/candidates/[id]` - Update candidate with unified broadcasting
- ✅ `DELETE /api/candidates/[id]` - Delete candidate with unified broadcasting
- ✅ `POST /api/candidates/bulk-action` - Bulk actions with unified broadcasting

#### **Position APIs**
- ✅ `POST /api/positions` - Create position with unified broadcasting
- ✅ `PUT /api/positions/[id]` - Update position with unified broadcasting
- ✅ `DELETE /api/positions/[id]` - Delete position with unified broadcasting

#### **Utility Functions**
- ✅ `headcountUtils.ts` - Headcount management with unified broadcasting

## 🚀 **How to Use the Unified Realtime System**

### **1. In React Components**

#### **Basic Usage**
```typescript
import { useUnifiedRealtime } from '@/hooks/use-unified-realtime';

function MyComponent() {
  const { isConnected, connectionHealth, lastUpdate } = useUnifiedRealtime({
    onCandidateUpdate: (candidate) => {
      // Handle candidate updates
      console.log('Candidate updated:', candidate);
    },
    onPositionUpdate: (position) => {
      // Handle position updates
      console.log('Position updated:', position);
    },
    onNotification: (notification) => {
      // Handle notifications
      console.log('Notification received:', notification);
    },
    showNotifications: true,
    showErrorNotifications: true
  });

  return (
    <div>
      <p>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Health: {connectionHealth}</p>
      <p>Last Update: {lastUpdate?.toLocaleTimeString()}</p>
    </div>
  );
}
```

#### **Advanced Usage with Status Component**
```typescript
import { useUnifiedRealtime } from '@/hooks/use-unified-realtime';
import { UnifiedRealtimeStatus } from '@/components/ui/unified-realtime-status';

function MyComponent() {
  const realtime = useUnifiedRealtime({
    onCandidateUpdate: handleCandidateUpdate,
    onPositionUpdate: handlePositionUpdate,
    onPresenceUpdate: handlePresenceUpdate,
    onUserListUpdate: handleUserListUpdate,
    onNotification: handleNotification,
    onUploadQueueUpdate: handleUploadQueueUpdate,
    onDashboardUpdate: handleDashboardUpdate,
    onWarningUpdate: handleWarningUpdate,
    onSessionExpired: handleSessionExpired,
    onHealthCheck: handleHealthCheck,
    showNotifications: true,
    showErrorNotifications: true,
    errorToastCooldownMs: 60000,
    maxReconnectAttempts: 10,
    reconnectDelayMs: 1000,
    maxReconnectDelayMs: 30000,
    enableHealthCheck: true,
    healthCheckIntervalMs: 30000,
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

### **2. In API Endpoints**

#### **Broadcasting Events**
```typescript
import { unifiedBroadcaster } from '@/lib/unified-realtime-broadcaster';

// Broadcast candidate update
await unifiedBroadcaster.broadcastCandidateUpdated(candidate, actingUserId, {
  priority: 'high',
  retryOnFailure: true,
  maxRetries: 3
});

// Broadcast position update
await unifiedBroadcaster.broadcastPositionUpdated(position, actingUserId, {
  priority: 'normal',
  retryOnFailure: true,
  maxRetries: 2
});

// Broadcast notification
await unifiedBroadcaster.broadcastUserNotification(userId, message, 'info', {
  priority: 'low',
  retryOnFailure: false
});

// Bulk broadcasting
await unifiedBroadcaster.broadcastBulk([
  { type: 'candidate_update', data: candidate1, options: { priority: 'high' } },
  { type: 'position_update', data: position1, options: { priority: 'normal' } },
  { type: 'notification', data: notification1, options: { priority: 'low' } }
]);
```

#### **Available Broadcasting Methods**
```typescript
// Candidate broadcasts
await unifiedBroadcaster.broadcastCandidateCreated(candidate, actingUserId, options);
await unifiedBroadcaster.broadcastCandidateUpdated(candidate, actingUserId, options);
await unifiedBroadcaster.broadcastCandidateDeleted(candidateId, actingUserId, options);
await unifiedBroadcaster.broadcastCandidateStatusChanged(candidate, oldStatus, newStatus, actingUserId, options);
await unifiedBroadcaster.broadcastCandidateTransitionUpdated(transition, actingUserId, options);

// Position broadcasts
await unifiedBroadcaster.broadcastPositionCreated(position, actingUserId, options);
await unifiedBroadcaster.broadcastPositionUpdated(position, actingUserId, options);
await unifiedBroadcaster.broadcastPositionDeleted(positionId, actingUserId, options);
await unifiedBroadcaster.broadcastPositionListUpdated(options);
await unifiedBroadcaster.broadcastPositionStatisticsUpdated(statistics, options);

// User presence broadcasts
await unifiedBroadcaster.broadcastUserJoined(userId, userData, options);
await unifiedBroadcaster.broadcastUserLeft(userId, options);
await unifiedBroadcaster.broadcastUserPageChanged(userId, page, options);

// Notification broadcasts
await unifiedBroadcaster.broadcastSystemNotification(message, type, targetUserId, options);
await unifiedBroadcaster.broadcastUserNotification(userId, message, type, options);

// Upload queue broadcasts
await unifiedBroadcaster.broadcastUploadStarted(fileName, userId, options);
await unifiedBroadcaster.broadcastUploadCompleted(fileName, userId, result, options);
await unifiedBroadcaster.broadcastUploadFailed(fileName, userId, error, options);

// Dashboard broadcasts
await unifiedBroadcaster.broadcastDashboardMetrics(metrics, options);
await unifiedBroadcaster.broadcastDashboardChartUpdate(chartId, data, options);

// Warning broadcasts
await unifiedBroadcaster.broadcastWarningCreated(warning, options);
await unifiedBroadcaster.broadcastWarningResolved(warningId, resolvedBy, options);

// Session broadcasts
await unifiedBroadcaster.broadcastSessionExpired(userId, options);

// Health check broadcasts
await unifiedBroadcaster.broadcastHealthStatus(healthData, options);
```

### **3. Configuration Options**

#### **Hook Configuration**
```typescript
interface UnifiedRealtimeOptions {
  // Event handlers
  onCandidateUpdate?: (candidate: any) => void;
  onPositionUpdate?: (position: any) => void;
  onPresenceUpdate?: (presence: any) => void;
  onUserListUpdate?: (users: any[]) => void;
  onNotification?: (notification: any) => void;
  onUploadQueueUpdate?: (queueData: any) => void;
  onDashboardUpdate?: (dashboardData: any) => void;
  onWarningUpdate?: (warning: any) => void;
  onSessionExpired?: () => void;
  onHealthCheck?: (healthData: any) => void;

  // Configuration
  showNotifications?: boolean;
  showErrorNotifications?: boolean;
  errorToastCooldownMs?: number;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  enableHealthCheck?: boolean;
  healthCheckIntervalMs?: number;
}
```

#### **Broadcasting Options**
```typescript
interface BroadcastOptions {
  targetUserId?: string;
  actingUserId?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  retryOnFailure?: boolean;
  maxRetries?: number;
}
```

## 📊 **Monitoring and Debugging**

### **Connection Health Metrics**
The unified realtime system provides comprehensive monitoring:

```typescript
const realtime = useUnifiedRealtime({
  // ... event handlers
});

// Access monitoring data
console.log('Connection Status:', realtime.isConnected);
console.log('Connection Health:', realtime.connectionHealth);
console.log('Reconnect Attempts:', realtime.reconnectAttempts);
console.log('Last Update:', realtime.lastUpdate);
console.log('Connected Users:', realtime.connectedUsers);
console.log('Total Connections:', realtime.totalConnections);
console.log('Message Count:', realtime.messageCount);
console.log('Error Count:', realtime.errorCount);
console.log('Error Rate:', realtime.errorRate);
```

### **Broadcaster Statistics**
```typescript
import { unifiedBroadcaster } from '@/lib/unified-realtime-broadcaster';

// Get broadcaster statistics
const stats = unifiedBroadcaster.getStatistics();
console.log('Broadcaster stats:', stats);

// Clear retry queue if needed
unifiedBroadcaster.clearRetryQueue();
```

### **Status Component**
```typescript
<UnifiedRealtimeStatus
  isConnected={isConnected}
  isReconnecting={isReconnecting}
  reconnectAttempts={reconnectAttempts}
  lastUpdate={lastUpdate}
  connectionHealth={connectionHealth}
  connectedUsers={connectedUsers}
  totalConnections={totalConnections}
  messageCount={messageCount}
  errorCount={errorCount}
  errorRate={errorRate}
  showDetails={true}
  compact={false}
/>
```

## 🔧 **Migration Status**

### **✅ Completed Migrations**
- All main page components
- All API endpoints
- All utility functions
- User presence system
- Status indicators

### **🔄 Migration Script**
A migration script is available to help verify the migration:

```bash
# Run migration report
node scripts/migrate-to-unified-realtime.cjs --report

# Show migration steps
node scripts/migrate-to-unified-realtime.cjs --steps

# Show benefits
node scripts/migrate-to-unified-realtime.cjs --benefits

# Run all checks
node scripts/migrate-to-unified-realtime.cjs --all
```

## 🎉 **Benefits Realized**

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

## 🚀 **Next Steps**

### **Optional Cleanup**
After confirming the unified system works correctly, you can optionally:

1. **Remove old SSE endpoints**:
   - `/api/candidates/sse`
   - `/api/realtime/presence`
   - `/api/upload-queue/ws`

2. **Remove old broadcasting functions**:
   - `src/lib/candidateSse.ts`
   - Old broadcasting imports

3. **Update documentation**:
   - Remove references to old system
   - Update API documentation

### **Future Enhancements**
- **Event persistence** - store events for offline users
- **Advanced filtering** - user-specific event filtering
- **Performance analytics** - detailed performance metrics
- **Mobile optimization** - battery-efficient mobile connections

## 📞 **Support**

If you encounter any issues with the unified realtime system:

1. Check the connection status indicators
2. Review the browser console for error messages
3. Verify the SSE endpoint is accessible
4. Check the migration report for any remaining old implementations

The unified realtime system provides a solid foundation for all realtime functionality while maintaining simplicity, reliability, and performance.
