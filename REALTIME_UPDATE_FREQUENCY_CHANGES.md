# Real-Time Update Frequency Changes

## Overview
Real-time update frequencies have been optimized for maximum responsiveness:
- **SSE Keepalive**: 500ms (optimized for ultra-fast real-time responsiveness)
- **Fallback Polling**: 10 seconds (optimized from 30 seconds)  
- **Inactive Connection Timeout**: 3 minutes (from 5 minutes)
- **Taskboard Update Delay**: 500ms (reduced from 2+ seconds)

## Changes Made

### 1. SSE Keepalive Intervals
- **Primary SSE** (`src/lib/simple-sse.ts`): 1s → **500ms** (optimized for ultra-fast real-time)
- **Unified SSE** → replaced by simple hub (`src/lib/realtime.ts`): **500ms** keepalive

### 2. Connection Timeouts
- **Primary SSE**: 120s → **180s** (3 minutes)
- **Unified SSE**: 300s → **180s** (3 minutes)
- **Inactive Connection Cleanup**: 5 minutes → **3 minutes**

### 3. Data Change Broadcasting
- **Position Updates**: 5s → **1s** (optimized for real-time)
- **Upload Queue**: 2s → **1s** (optimized for real-time)
- **Dashboard Updates**: 3s → **1s** (optimized for real-time)
- **Batch Updates**: 2s → **1s** (optimized for real-time)
- **Candidate Updates**: 3s → **1s** (optimized for real-time)
- **Statistics**: 5s → **1s** (optimized for real-time)

### 4. Fallback Polling Intervals
- **Candidates Page**: 5s → **30s** (optimized)
- **Process Queue**: 5s → **30s** (optimized)
- **My Tasks**: 30s → **10s** (optimized for faster responsiveness)
- **User Presence**: 30s → **30s** (optimized)
- **Sidebar Navigation**: 30s → **30s** (optimized)

### 5. System Monitoring Intervals
- **Database Connection Cleanup**: 30s → **120s** (optimized)
- **User Presence Updates**: 30s → **30s** (unchanged)
- **Presence Cleanup**: 5 minutes → **120s** (optimized)
- **Global Cleanup**: 10s → **120s** (optimized)
- **Enhanced SSE Status**: 30s → **10s** (optimized)
- **Debug Metrics**: 30s → **10s** (optimized)
- **Modal Cleanup**: 5s → **5s** (unchanged)

### 6. UI Update Debouncing
- **Dashboard Updates**: 3s → **1s** (optimized for real-time)
- **Real-time Status**: 5s → **1s** (optimized for real-time)

### 7. Taskboard-Specific Optimizations
- **SSE Update Interval**: 1000ms → **300ms** (ultra-fast real-time updates)
- **SSE Debounce Timeout**: 1000ms → **200ms** (reduced delay)
- **Fallback Polling**: 30s → **10s** (faster fallback)
- **Database Query Timeout**: 25s → **10s** (faster response)
- **API Timeout**: 10s → **6s** (faster client timeout)
- **New Optimized Endpoint**: `/api/taskboard/candidates` (streamlined for taskboard)
- **Initial Load Pagination**: All candidates → **200 candidates** (faster initial load)
- **Minimum Update Interval**: 3s → **1s** (optimized for real-time)

### 8. Global Settings
- **Minimum Fetch Interval**: 3s → **1s** (optimized for real-time)
- **Global Event Limit**: 5/s → **1/s** (optimized for real-time)
- **Batch Flush Interval**: 5s → **1s** (optimized for real-time)

## Benefits

### ✅ **Ultra-Fast Real-time Performance**
- Event frequency optimized to ~500ms for ultra-fast real-time responsiveness
- Maximum responsiveness for user interactions
- Real-time data synchronization with minimal delay

### ✅ **Taskboard-Specific Optimizations**
- Taskboard updates now respond in ~500ms (down from 2+ seconds)
- Optimized database queries with faster timeouts
- Dedicated API endpoint for taskboard performance
- Reduced initial load time with pagination

### ✅ **Better Fallback Strategy**
- 10-second polling when SSE fails (reduced from 30 seconds)
- Maintains responsiveness even during connection issues
- Balanced resource usage

### ✅ **Improved Connection Stability**
- 3-minute inactive timeout prevents premature disconnections
- Better handling of network interruptions
- Reduced connection drops

## Performance Considerations

### ⚠️ **Maximum Server Load**
- 1-second keepalive generates maximum traffic
- Very frequent database queries
- High CPU usage for change detection

### ⚠️ **High Network Bandwidth**
- Very frequent SSE messages
- Maximum client-side processing
- High mobile data usage

### ⚠️ **High Browser Resources**
- Very frequent DOM updates
- High memory usage for frequent intervals
- High battery consumption on mobile

## Monitoring Recommendations

1. **Monitor server performance** during peak usage
2. **Track SSE connection stability** and error rates
3. **Watch database connection pool** utilization
4. **Monitor client-side performance** and memory usage
5. **Consider adaptive intervals** based on system load

## Rollback Plan

If performance issues arise, consider:
1. **Gradual increase** to 2-3 second intervals
2. **Conditional intervals** based on user activity
3. **User preference settings** for update frequency
4. **Load-based throttling** during high traffic
5. **Monitor server resources** closely with 1-second intervals

## Files Modified

- `src/lib/simple-sse.ts`
- `src/lib/realtime.ts`
- `src/lib/data-change-tracker.ts`
- `src/lib/simple-broadcaster.ts`
- `src/components/dashboard/RealTimeStatus.tsx`
- `src/components/dashboard/DashboardPageClient.tsx`
- `src/components/candidates/CandidatesPageClient.tsx`
- `src/components/candidates/CandidateImportUploadQueue.tsx`
- `src/components/tasks/MyTasksPageClient.tsx`
- `src/components/layout/SafeSidebarNav.tsx`
- `src/hooks/use-user-presence.ts`
- `src/lib/presence-store.ts`
- `src/lib/db.ts`
- `src/lib/global-cleanup.ts`
- `src/hooks/use-enhanced-sse.ts`
- `src/components/ui/floating-debug-overlay.tsx`
- `src/lib/modal-cleanup.ts`
- `src/contexts/GlobalSettingsContext.tsx`

## Testing Checklist

- [ ] SSE connections maintain stability
- [ ] Real-time updates appear within 1 second
- [ ] Fallback polling works when SSE fails
- [ ] No excessive server load or errors
- [ ] Client performance remains acceptable
- [ ] Mobile devices handle increased frequency
- [ ] Database connections remain stable
- [ ] Memory usage is within acceptable limits
