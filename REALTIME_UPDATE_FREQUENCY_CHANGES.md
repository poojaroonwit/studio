# Real-Time Update Frequency Changes

## Overview
All real-time update frequencies have been reduced to maximize responsiveness:
- **SSE Keepalive**: 1 second (from 5-15 seconds)
- **Fallback Polling**: 10 seconds (from 5-30 seconds)  
- **Inactive Connection Timeout**: 3 minutes (from 5 minutes)

## Changes Made

### 1. SSE Keepalive Intervals
- **Primary SSE** (`src/lib/simple-sse.ts`): 5s → **1s**
- **Unified SSE** (`src/lib/unified-connection-manager.ts`): 15s → **1s**

### 2. Connection Timeouts
- **Primary SSE**: 120s → **180s** (3 minutes)
- **Unified SSE**: 300s → **180s** (3 minutes)
- **Inactive Connection Cleanup**: 5 minutes → **3 minutes**

### 3. Data Change Broadcasting
- **Position Updates**: 5s → **1s**
- **Upload Queue**: 2s → **1s**
- **Dashboard Updates**: 3s → **1s**
- **Batch Updates**: 2s → **1s**
- **Candidate Updates**: 3s → **1s**
- **Statistics**: 5s → **1s**

### 4. Fallback Polling Intervals
- **Candidates Page**: 5s → **10s**
- **Process Queue**: 5s → **10s**
- **My Tasks**: 30s → **10s**
- **User Presence**: 30s → **10s**
- **Sidebar Navigation**: 30s → **10s**

### 5. System Monitoring Intervals
- **Database Connection Cleanup**: 30s → **10s**
- **User Presence Updates**: 30s → **10s**
- **Presence Cleanup**: 5 minutes → **10s**
- **Global Cleanup**: 10s → **10s** (unchanged)
- **Enhanced SSE Status**: 30s → **1s**
- **Debug Metrics**: 30s → **1s**
- **Modal Cleanup**: 5s → **1s**

### 6. UI Update Debouncing
- **Dashboard Updates**: 500ms → **1s**
- **Real-time Status**: 30s → **1s**
- **Minimum Update Interval**: 2s → **1s**

### 7. Global Settings
- **Minimum Fetch Interval**: 5s → **1s**

## Benefits

### ✅ **Maximum Responsiveness**
- Real-time updates every 1 second
- Immediate feedback for user actions
- Reduced perceived latency

### ✅ **Better Fallback Strategy**
- 10-second polling when SSE fails
- Maintains responsiveness even during connection issues
- Balanced resource usage

### ✅ **Improved Connection Stability**
- 3-minute inactive timeout prevents premature disconnections
- Better handling of network interruptions
- Reduced connection drops

## Performance Considerations

### ⚠️ **Increased Server Load**
- 1-second keepalive generates more traffic
- More frequent database queries
- Higher CPU usage for change detection

### ⚠️ **Network Bandwidth**
- More frequent SSE messages
- Increased client-side processing
- Higher mobile data usage

### ⚠️ **Browser Resources**
- More frequent DOM updates
- Increased memory usage for frequent intervals
- Higher battery consumption on mobile

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

## Files Modified

- `src/lib/simple-sse.ts`
- `src/lib/unified-connection-manager.ts`
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
