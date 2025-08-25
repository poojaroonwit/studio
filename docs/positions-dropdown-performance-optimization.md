# Positions Dropdown Performance Optimization

## Problem Identified

The user reported that "on process queue popup, the Assign to Position dropdown is loading for longtime too". This was caused by:

1. **Multiple API Calls**: Each `PositionSelectDropdown` component in the upload queue table was making its own API call to `/api/positions/all`
2. **No Caching**: The API endpoint had no caching mechanism
3. **Database Query Inefficiency**: The query was doing a `LEFT JOIN` with the `Grade` table without proper indexing

## Solutions Implemented

### 1. Client-Side Caching Hook

**File**: `src/hooks/use-positions-cache.ts`

- Created a global cache that shares positions data between all dropdown components
- 5-minute cache duration to balance freshness with performance
- Automatic cache invalidation and refresh mechanism
- Prevents multiple simultaneous API calls for the same data

### 2. Optimized PositionSelectDropdown Components

**Files**: 
- `src/components/candidates/PositionSelectDropdown.tsx`
- `src/components/candidates/PositionMultiSelectDropdown.tsx`

- Replaced individual `useEffect` hooks with the shared cache hook
- Removed duplicate API calls
- Maintained all existing functionality while improving performance

### 3. Server-Side API Caching

**File**: `src/app/api/positions/all/route.ts`

- Added in-memory caching with 2-minute duration
- Cache is shared across all requests to the same endpoint
- Automatic cache invalidation based on filter parameters
- Returns cache status in response metadata

### 4. Database Indexes

**File**: `scripts/optimize-positions-performance.sql`

Added specific indexes for positions queries:
- `idx_position_is_open` - For filtering open/closed positions
- `idx_position_created_at` - For ordering by creation date
- `idx_position_title` - GIN index for text search
- `idx_position_department` - For department filtering
- `idx_position_level` - For position level filtering
- `idx_position_open_created` - Composite index for common queries
- `idx_position_grade_id` - For JOIN with Grade table

## Performance Improvements

### Before Optimization
- Each dropdown made its own API call
- No caching at any level
- Database queries without proper indexing
- Multiple simultaneous requests could overwhelm the server

### After Optimization
- Single API call shared across all dropdowns
- Client-side cache with 5-minute duration
- Server-side cache with 2-minute duration
- Optimized database queries with proper indexing
- Reduced server load and improved response times

## Testing

### Cache Performance Test
**File**: `scripts/test-positions-cache.js`

This script tests:
1. First request performance (no cache)
2. Cached request performance
3. Multiple concurrent requests
4. Cache hit rates and response times

### Usage
```bash
node scripts/test-positions-cache.js
```

## Expected Results

1. **Faster Dropdown Loading**: Positions dropdowns should load almost instantly after the first load
2. **Reduced Server Load**: Fewer database queries and API calls
3. **Better User Experience**: No more "loading for longtime" issues
4. **Scalability**: Performance remains consistent even with many dropdown instances

## Monitoring

To monitor the effectiveness of these optimizations:

1. **Check Cache Hit Rates**: Look for `cached: true` in API responses
2. **Monitor Response Times**: Use the test script to measure performance
3. **Database Performance**: Use `scripts/simple-performance-monitor.js` to track query performance

## Future Improvements

1. **Redis Caching**: Replace in-memory cache with Redis for production scalability
2. **Background Refresh**: Implement background cache refresh to avoid cache misses
3. **Selective Loading**: Load only essential position data initially, with full data on demand
4. **Pagination**: If positions grow significantly, implement pagination for the dropdown

## Files Modified

- `src/hooks/use-positions-cache.ts` (new)
- `src/components/candidates/PositionSelectDropdown.tsx`
- `src/components/candidates/PositionMultiSelectDropdown.tsx`
- `src/app/api/positions/all/route.ts`
- `scripts/optimize-positions-performance.sql` (new)
- `scripts/test-positions-cache.js` (new)
- `docs/positions-dropdown-performance-optimization.md` (new)
