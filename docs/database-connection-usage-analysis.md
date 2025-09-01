# Database Connection Usage Analysis

## Problem Summary

The application is experiencing database container restarts every 3-5 minutes due to "too many clients already" errors. This indicates that the application is creating and holding onto too many database connections.

## Root Causes of High Connection Usage

### 1. **Multiple SSE (Server-Sent Events) Endpoints**

**Current Setup:**
- `/api/sse` (Main SSE) - 1 connection per user
- `/api/upload-queue/sse` (Upload Queue SSE) - 1 connection per user  
- `/api/dashboard/stream` (Dashboard Stream) - 1 connection per user

**Impact:** Each user can have up to **3 persistent database connections** open simultaneously.

### 2. **Upload Queue Processor**

**Current Configuration:**
- Runs every 5 seconds (`PROCESSOR_INTERVAL_MS=5000`)
- Creates new database connections for each processing cycle
- May not properly release connections after processing

**Impact:** Creates **12 connections per minute** just for background processing.

### 3. **Real-time Collaboration System**

**Features:**
- Real-time candidate updates
- Live collaboration features
- Broadcasting system

**Impact:** Creates additional connections for real-time data synchronization.

### 4. **Connection Pool Management Issues**

**Problems:**
- Connections may leak due to improper cleanup
- Idle connections not being released quickly enough
- Long-running transactions holding connections

## Current Configuration Analysis

### Database Pool Settings
```bash
DATABASE_MAX_CONNECTIONS=20          # Too low for current usage
DATABASE_IDLE_TIMEOUT=30000          # 30 seconds - reasonable
DATABASE_CONNECTION_TIMEOUT=1800000  # 30 minutes - too long
```

### Upload Queue Settings
```bash
PROCESSOR_INTERVAL_MS=5000           # Too frequent
MAX_CONCURRENT_PROCESSORS=3          # Creates multiple connections
```

## Connection Usage Breakdown

### Per User Connection Usage
```
1. Main SSE Endpoint:          1 connection
2. Upload Queue SSE:           1 connection  
3. Dashboard Stream:           1 connection
4. API Requests:               ~2-3 connections
5. Background Processing:      ~1-2 connections
   
TOTAL PER USER:                ~6-8 connections
```

### System-wide Connection Usage
```
With 3 active users:
- User connections:           18-24 connections
- Upload processor:           1-3 connections
- System overhead:            2-3 connections

TOTAL:                       21-30 connections
```

**Problem:** This exceeds the current 20-connection limit!

## Solutions Implemented

### 1. **Reduced Connection Pool Size**
- Changed from 100 to 20 connections (more conservative)
- Prevents connection pool exhaustion
- Forces better connection management

### 2. **Reduced Upload Queue Frequency**
- Changed from 5 seconds to 30 seconds (`PROCESSOR_INTERVAL_MS=30000`)
- Reduces connection creation frequency by 6x
- Still maintains responsive processing

### 3. **Reduced Batch Processing**
- Changed from 3 to 1 concurrent processor (`MAX_CONCURRENT_PROCESSORS=1`)
- Reduces simultaneous connection usage
- Prevents connection spikes

### 4. **Reduced SSE Concurrent Connections**
- Limited to 1 concurrent SSE connection per user
- Prevents multiple SSE endpoints from overwhelming the system

## Monitoring and Diagnostics

### Run Connection Diagnostic
```bash
npm run debug:connections
```

This script will:
- Show current connection usage
- Identify connection leaks
- Monitor connection patterns
- Provide recommendations

### Key Metrics to Monitor
- **Peak Connections:** Should stay under 15
- **Idle in Transaction:** Should be 0
- **Long-running Queries:** Should be minimal
- **Connection by Application:** Identify which components use most connections

## Recommended Configuration

### Environment Variables
```bash
# Database Connection Pool
DATABASE_MAX_CONNECTIONS=20          # Conservative limit
DATABASE_IDLE_TIMEOUT=30000          # 30 seconds
DATABASE_CONNECTION_TIMEOUT=600000   # 10 minutes (reduced)

# Upload Queue Processor
PROCESSOR_INTERVAL_MS=30000          # 30 seconds
MAX_CONCURRENT_PROCESSORS=1          # Single processor
```

### Connection Pool Settings
```typescript
const poolConfig = {
  max: 20,                           // Conservative limit
  idleTimeoutMillis: 30000,         // 30 seconds
  connectionTimeoutMillis: 600000,  // 10 minutes
  statement_timeout: 180000,        // 3 minutes
};
```

## Long-term Solutions

### 1. **Connection Pool Optimization**
- Implement connection pooling for background tasks
- Add connection leak detection
- Implement automatic connection cleanup

### 2. **SSE Endpoint Consolidation**
- Consider consolidating multiple SSE endpoints into one
- Implement connection sharing between endpoints
- Add connection limits per user

### 3. **Background Task Optimization**
- Implement connection reuse for background tasks
- Add connection pooling for upload queue processor
- Implement connection health monitoring

### 4. **Real-time System Optimization**
- Optimize real-time update broadcasting
- Implement connection limits for real-time features
- Add connection cleanup for inactive users

## Immediate Actions

1. **Restart the application** with new configuration
2. **Monitor connection usage** using the diagnostic script
3. **Check for connection leaks** in SSE endpoints
4. **Verify upload queue processor** is using connections efficiently
5. **Monitor database container** for restart frequency

## Expected Results

After implementing these changes:
- **Connection usage should drop** from 20+ to 10-15 connections
- **Database container restarts should stop** occurring every 3-5 minutes
- **Application stability should improve** significantly
- **Real-time features should continue working** with better resource management
