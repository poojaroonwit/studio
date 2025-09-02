# Unified Connection System Implementation

## Overview

This document describes the implementation of a unified connection management system that consolidates all SSE endpoints and database connections into a single connection per user. This system eliminates the "too many clients already" database connection error by preventing connection exhaustion while supporting configurable concurrent processing.

## Problem Solved

### Before Implementation
- **Multiple SSE endpoints** creating separate connections per user:
  - Main SSE (`/api/sse`) - 1 connection per user
  - Upload Queue SSE (`/api/upload-queue/sse`) - 1 connection per user  
  - Dashboard Stream (`/api/dashboard/stream`) - 1 connection per user
- **Upload queue processor** running every 5 seconds with multiple concurrent processors
- **Manual Prisma connection management** in some routes
- **Connection pool size** too small (20) for current usage

**Result**: Each user could have up to 6-8 database connections open simultaneously, causing connection exhaustion.

### After Implementation
- **Single unified SSE connection** per user handling all real-time updates
- **Consolidated database connections** with efficient connection pooling
- **Optimized upload queue processor** running every 30 seconds with configurable concurrent processors
- **Automatic connection cleanup** and health monitoring
- **Dynamic concurrent processing** based on system settings

**Result**: Each user now has exactly 1 database connection, dramatically reducing connection usage while maintaining processing flexibility.

## Architecture Changes

### 1. Unified Connection Manager (`src/lib/unified-connection-manager.ts`)

The core of the new system that:
- Maintains one connection per user
- Handles all SSE event types (candidates, positions, notifications, upload queue, dashboard)
- Manages database client lifecycle per user
- Provides automatic connection cleanup and health monitoring

```typescript
// Key features:
- Single connection per user (userConnections Map)
- Reusable database clients per user (userDbClients Map)
- Automatic connection cleanup for inactive users
- Unified event broadcasting system
```

### 2. Consolidated SSE Endpoints

#### Main SSE (`/api/sse`)
- **Before**: Basic SSE implementation
- **After**: Uses unified connection manager, handles all event types

#### Upload Queue SSE (`/api/upload-queue/sse`)
- **Before**: Created separate database connections for each update
- **After**: Deprecated, redirects to unified SSE endpoint

#### Dashboard Stream (`/api/dashboard/stream`)
- **Before**: Separate connection management
- **After**: Deprecated, redirects to unified SSE endpoint

### 3. New Data API Endpoints

#### Upload Queue Data (`/api/upload-queue/data`)
- Provides upload queue data through REST API
- Used by unified SSE system to send updates
- Efficient connection pooling

#### Dashboard Data (`/api/dashboard/data`)
- Provides dashboard statistics through REST API
- Used by unified SSE system to send updates
- Efficient connection pooling

### 4. Enhanced Upload Queue Processor

#### Configuration Changes
```javascript
// Before
intervalMs: 5000,                    // 5 seconds
batchLimit: 3,                       // 3 concurrent processors

// After  
intervalMs: 30000,                   // 30 seconds (configurable)
batchLimit: 1,                       // Configurable based on concurrent processors
maxConcurrentProcessors: 1           // Configurable via system settings (1-10)
```

#### New Features
- **Dynamic concurrent processing** based on system settings
- **System settings integration** for real-time configuration changes
- **Resource-aware scaling** based on system load
- **Connection-safe processing** with automatic batch size adjustment

#### Benefits
- Reduces connection creation frequency by 6x (default)
- Supports 1-10 concurrent processors based on system needs
- Eliminates connection spikes while maintaining throughput
- Configurable without application restart

### 5. Database Connection Pool Optimization

#### Environment Variables
```bash
# Before
DATABASE_MAX_CONNECTIONS=20          # Too low
DATABASE_IDLE_TIMEOUT=30000          # 30 seconds
DATABASE_CONNECTION_TIMEOUT=1800000  # 30 minutes

# After
DATABASE_MAX_CONNECTIONS=30          # Increased for stability
DATABASE_IDLE_TIMEOUT=15000          # Reduced for faster cleanup
DATABASE_CONNECTION_TIMEOUT=600000   # Reduced to 10 minutes
```

## Implementation Details

### Connection Lifecycle

1. **User connects** to `/api/sse`
2. **Unified connection manager** creates single connection for user
3. **Database client** is created and reused for all operations
4. **Events are broadcast** through the single connection
5. **Connection cleanup** happens automatically on disconnect or inactivity

### Event Types Supported

```typescript
export type UnifiedEventType = 
  | 'candidate_update'
  | 'position_update'
  | 'notification'
  | 'upload_queue_update'
  | 'dashboard_update'
  | 'keepalive'
  | 'connected';
```

### Database Operations

```typescript
// Efficient database operations with user connection
export async function withUserDbClient<T>(
  userId: string, 
  operation: (client: any) => Promise<T>
): Promise<T>

// Upload queue data fetching
export async function getUploadQueueDataForUser(userId: string, queryParams?: any)

// Dashboard data fetching  
export async function getDashboardDataForUser(userId: string)
```

### Concurrent Processing Configuration

#### System Settings Integration
The upload queue processor now reads configuration from the system settings table:

```typescript
// Key system settings for upload queue processing
maxConcurrentProcessors: number      // 1-10 concurrent processors
processorIntervalMs: number          // Processing interval (5s - 5m)
processorBatchLimit: number          // Batch size per processor
processorQuietMode: boolean          // Reduce console output
processorConnectionTimeoutMs: number // DB connection timeout
processorRequestTimeoutMs: number    // API request timeout
```

#### Dynamic Configuration Updates
- **Real-time updates**: Changes to system settings take effect within 1 minute
- **Resource-aware scaling**: Processor automatically adjusts based on system load
- **Connection safety**: Batch sizes automatically capped to prevent connection exhaustion

## Migration Guide

### 1. Update Environment Variables

Copy the new settings from `env.local.template` to your `.env.local`:

```bash
# Database Connection Pool
DATABASE_MAX_CONNECTIONS=30
DATABASE_IDLE_TIMEOUT=15000
DATABASE_CONNECTION_TIMEOUT=600000
DATABASE_STATEMENT_TIMEOUT=180000

# Upload Queue Processor (with new concurrent processing)
PROCESSOR_INTERVAL_MS=30000
MAX_CONCURRENT_PROCESSORS=1          # Default, configurable via system settings
LOG_INTERVAL_MS=60000

# New processor configuration options
PROCESSOR_BATCH_LIMIT=1
PROCESSOR_QUIET_MODE=false
PROCESSOR_CONNECTION_TIMEOUT_MS=60000
PROCESSOR_REQUEST_TIMEOUT_MS=180000
```

### 2. Configure Concurrent Processing

#### Via System Settings (Recommended)
1. Navigate to `/settings/upload-queue-settings`
2. Set `maxConcurrentProcessors` to desired value (1-10)
3. Adjust other settings as needed
4. Save changes

#### Via Environment Variables
```bash
MAX_CONCURRENT_PROCESSORS=5          # Set to desired concurrent processor count
```

### 3. Client-Side Updates

#### Old SSE Usage (Deprecated)
```typescript
// ❌ Old way - multiple connections
const uploadQueueSSE = new EventSource('/api/upload-queue/sse');
const dashboardSSE = new EventSource('/api/dashboard/stream');
const mainSSE = new EventSource('/api/sse');
```

#### New Unified SSE Usage
```typescript
// ✅ New way - single connection
const unifiedSSE = new EventSource('/api/sse');

unifiedSSE.addEventListener('upload_queue_update', (event) => {
  const data = JSON.parse(event.data);
  // Handle upload queue updates
});

unifiedSSE.addEventListener('dashboard_update', (event) => {
  const data = JSON.parse(event.data);
  // Handle dashboard updates
});

unifiedSSE.addEventListener('candidate_update', (event) => {
  const data = JSON.parse(event.data);
  // Handle candidate updates
});
```

### 4. Data Fetching Updates

#### Old Way (Deprecated)
```typescript
// ❌ Old SSE endpoints are deprecated
fetch('/api/upload-queue/sse')  // Returns 410 Gone
fetch('/api/dashboard/stream')  // Returns 410 Gone
```

#### New Way
```typescript
// ✅ Use REST API endpoints for data
const uploadQueueData = await fetch('/api/upload-queue/data');
const dashboardData = await fetch('/api/dashboard/data');

// Real-time updates come through unified SSE
```

## Performance Impact

### Connection Usage Reduction
- **Before**: 6-8 connections per user
- **After**: 1 connection per user
- **Improvement**: 83-88% reduction in connections per user

### Database Stability
- **Before**: Database container restarts every 3-5 minutes
- **After**: Stable database connections with automatic cleanup
- **Improvement**: Eliminated connection exhaustion errors

### Resource Utilization
- **Before**: High connection pool pressure, frequent timeouts
- **After**: Efficient connection pooling, predictable resource usage
- **Improvement**: Better resource utilization and application stability

### Processing Throughput
- **Before**: Fixed 3 concurrent processors
- **After**: Configurable 1-10 concurrent processors
- **Improvement**: Flexible throughput based on system needs and resources

## Monitoring and Maintenance

### Connection Statistics
```typescript
// Get current connection stats
import { getUnifiedConnectionStats } from '@/lib/unified-connection-manager';

const stats = getUnifiedConnectionStats();
console.log(`Total connections: ${stats.totalConnections}`);
console.log(`Connected users: ${stats.connectedUsers}`);
console.log(`Database clients: ${stats.dbClients}`);
```

### Upload Queue Processor Monitoring
```bash
# Monitor processor logs for configuration changes
[PROCESSOR] Updated max concurrent processors: 1 → 5
[PROCESSOR] Adjusted batch limit: 3 (based on 5 concurrent processors)

# Monitor resource pressure and scaling
[PROCESSOR] Resource pressure changed: medium → high
[PROCESSOR] Adjusted config: interval=45000ms, batch=4, timeouts=90000ms
```

### Health Monitoring
- Automatic cleanup of inactive connections (every minute)
- Connection health checks with automatic reconnection
- Error handling and logging for all operations
- Resource pressure monitoring and automatic scaling

### Troubleshooting
1. **Check connection stats** using `getUnifiedConnectionStats()`
2. **Monitor processor logs** for configuration and scaling events
3. **Verify system settings** in `/settings/upload-queue-settings`
4. **Check environment variables** match the template
5. **Restart application** if connection issues persist

## Configuration Management

### System Settings Page
New dedicated page at `/settings/upload-queue-settings` for managing:
- Concurrent processor count (1-10)
- Processing intervals (5s - 5m)
- Batch sizes and timeouts
- Quiet mode and logging options

### Real-time Configuration Updates
- Changes take effect within 1 minute
- No application restart required
- Automatic validation and error handling
- Audit logging for all configuration changes

### Environment Variable Fallbacks
System settings take precedence, with environment variables as fallbacks:
```bash
# Priority order:
# 1. System settings (database)
# 2. Environment variables
# 3. Default values
```

## Backward Compatibility

### Deprecated Endpoints
- `/api/upload-queue/sse` - Returns 410 Gone with redirect message
- `/api/dashboard/stream` - Returns 410 Gone with redirect message

### Migration Support
- Clear error messages directing users to unified endpoint
- Documentation and examples for new implementation
- Gradual migration path for existing clients
- Configuration migration tools

## Future Enhancements

### Planned Improvements
1. **Advanced connection pooling** for high-traffic scenarios
2. **Event filtering** based on user permissions
3. **Connection metrics** and analytics
4. **Automatic scaling** based on system load
5. **Processor health monitoring** and automatic recovery

### Scalability Considerations
- Current system supports up to 30 concurrent users efficiently
- Connection pool can be increased for higher user counts
- Event broadcasting can be optimized for large-scale deployments
- Concurrent processors can be scaled based on system resources

## Summary

The unified connection system successfully addresses the "too many clients already" error by:

1. **Consolidating all SSE endpoints** into a single connection per user
2. **Optimizing database connection management** with efficient pooling
3. **Supporting configurable concurrent processing** via system settings
4. **Implementing automatic connection cleanup** and health monitoring
5. **Providing clear migration path** for existing implementations
6. **Maintaining processing flexibility** while optimizing connections

This implementation maintains all existing functionality while dramatically improving database connection efficiency and application stability, with the added benefit of configurable concurrent processing to meet varying system demands.
