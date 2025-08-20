# Real-time Upload Queue Implementation

## Overview

This document describes the implementation of real-time updates for the upload queue system, including the pending number in the left menu and the process queue page.

## Features Implemented

### 1. Left Menu Pending Count (Real-time)

**Location**: `src/components/layout/SidebarNav.tsx`

**Features**:
- Real-time pending count badge in the left navigation menu
- Shows count of queued + in-process items
- Visual indicators for different states:
  - **Loading**: Blue badge with spinning loader
  - **Error**: Red badge with error icon
  - **Pending**: Orange badge with count (animated pulse)
  - **No Pending**: Green badge showing "0"
- Works in both expanded and collapsed sidebar modes
- Automatic reconnection with exponential backoff

**Implementation Details**:
```typescript
// SSE connection with reconnection logic
const connectSSE = () => {
  eventSource = new EventSource("/api/upload-queue/sse");
  
  eventSource.onopen = () => {
    setPendingError(false);
    reconnectAttempts = 0;
  };

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'queue' && data.summary) {
      const count = (data.summary.queued || 0) + (data.summary.inprocess || 0);
      setPendingCount(count);
    }
  };
};
```

### 2. Process Queue Real-time Updates

**Location**: `src/components/candidates/CandidateImportUploadQueue.tsx`

**Features**:
- Real-time status cards showing counts for all queue states
- Live table updates with job status changes
- Visual real-time indicators (Live/Polling status)
- Automatic reconnection with fallback to polling
- Debounced updates for smooth UI experience
- Duration tracking for in-process jobs

**Implementation Details**:
```typescript
// Enhanced SSE with better error handling
const connectSSE = () => {
  eventSource = new EventSource(sseUrl);
  
  eventSource.onopen = () => {
    setIsRealtimeActive(true);
    setIsLoading(false);
  };

  eventSource.onerror = () => {
    setIsRealtimeActive(false);
    // Fallback to polling if SSE fails
    const pollInterval = setInterval(() => {
      if (!isConnected) {
        fetchJobs();
      }
    }, 10000);
  };
};
```

### 3. Server-Sent Events (SSE) Infrastructure

**Location**: `src/app/api/upload-queue/sse/`

**Components**:
- **Route Handler**: `route.ts` - Handles SSE connections
- **Broadcast Function**: `broadcastUploadQueueUpdate.ts` - Sends updates to all clients
- **Keepalive**: 10-second intervals for connection stability

**Features**:
- Multiple client support
- Automatic cleanup of disconnected clients
- Query parameter filtering
- Summary statistics included in updates

### 4. Visual Indicators

**Real-time Status Indicators**:
- **Live Updates**: Green dot with "Live Updates" text
- **Polling**: Yellow dot with "Polling" text
- **Connection Error**: Red indicator with error icon
- **Last Update Time**: Shows when data was last refreshed

**Status Cards**:
- Color-coded cards for different queue states
- Animated icons for processing items
- Real-time count updates
- Visual feedback for connection status

## Technical Implementation

### SSE Connection Flow

1. **Initial Connection**: Client connects to `/api/upload-queue/sse`
2. **Keepalive**: Server sends keepalive every 10 seconds
3. **Data Updates**: Server broadcasts updates when queue changes
4. **Reconnection**: Client automatically reconnects on connection loss
5. **Fallback**: Polling fallback if SSE fails completely

### Update Triggers

Updates are broadcast when:
- New files are uploaded to the queue
- Job status changes (queued → inprocess → success/error)
- Jobs are deleted or retried
- Manual processing is triggered

### Performance Optimizations

- **Debounced Updates**: 100ms debounce for UI updates
- **Selective Updates**: Only update changed data
- **Connection Pooling**: Reuse SSE connections
- **Fallback Polling**: 10-second intervals when SSE unavailable

## Usage Examples

### Testing Real-time Functionality

Visit `/test-realtime` to see a demonstration of the real-time features:

```typescript
// Test page shows:
- Simulated queue updates every 3 seconds
- Visual indicators for connection status
- Status cards with real-time counts
- Queue items with status changes
```

### Monitoring Queue Status

The left menu badge provides instant visibility:
- **Orange badge with number**: Items pending processing
- **Green badge with "0"**: No pending items
- **Red badge with "!"**: Connection error
- **Blue badge with spinner**: Loading state

### Process Queue Page

The process queue page shows:
- Real-time status cards with counts
- Live table updates
- Connection status indicators
- Last update timestamps

## Configuration

### Environment Variables

```env
# SSE Configuration
UPLOAD_QUEUE_PROCESS_URL=http://localhost:3000/api/upload-queue/process
PROCESSOR_API_KEY=your-api-key
```

### System Settings

```typescript
// Max concurrent processors (default: 5)
maxConcurrentProcessors: number
```

## Troubleshooting

### Common Issues

1. **SSE Connection Fails**:
   - Check network connectivity
   - Verify server is running
   - Check browser console for errors

2. **Updates Not Appearing**:
   - Verify SSE connection is active
   - Check if broadcast function is called
   - Ensure client is receiving messages

3. **High Memory Usage**:
   - Check for memory leaks in SSE connections
   - Verify proper cleanup on component unmount

### Debug Information

Enable debug logging:
```typescript
console.log('[SSE] Connection established');
console.log('[SSE] Broadcasting to X clients');
console.log('[SSE] Reconnection attempt X/Y');
```

## Future Enhancements

1. **WebSocket Support**: Alternative to SSE for better performance
2. **Push Notifications**: Browser notifications for status changes
3. **Queue Analytics**: Real-time performance metrics
4. **Batch Operations**: Real-time updates for bulk actions
5. **Mobile Optimization**: Optimized for mobile devices

## Conclusion

The real-time upload queue implementation provides users with immediate visibility into the status of their file uploads and processing jobs. The system is robust, with automatic reconnection, fallback mechanisms, and clear visual indicators to ensure users always know the current state of their queue.
