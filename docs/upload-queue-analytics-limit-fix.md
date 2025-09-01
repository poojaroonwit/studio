# Upload Queue Analytics Date Filter Fix

## Problem
The process-queue analytics tab was showing a maximum total of 100 jobs, even when there were more jobs available in the database. This was due to a hardcoded limit in the upload-queue API endpoint.

## Root Cause
In `src/app/api/upload-queue/route.ts`, line 133, there was a hardcoded limit:
```typescript
const safeLimit = Math.min(Math.max(limit, 1), 100); // Between 1 and 100
```

This prevented the analytics component from fetching more than 100 jobs, even when requesting 1000 jobs.

## Solution
Modified the upload-queue analytics to use date-based filtering with a default 30-day range instead of relying on high limits:

### Changes Made

1. **Analytics Component** (`src/components/candidates/ProcessQueueAnalytics.tsx`):
   - Set default date range to last 30 days
   - Always include date filters in API requests
   - Added "30d" reset button for quick access to default range
   - Updated UI to show "Last 30 days" as default

2. **API Endpoints** (`src/app/api/upload-queue/route.ts` and `src/app/api/v1/upload-queue/route.ts`):
   - Increased limit to 1000 for all requests
   - Removed analytics-specific logic since date filtering handles the scope

3. **Updated Documentation**:
   - Updated OpenAPI documentation to reflect the new limit behavior

### Code Changes

```typescript
// Before - Analytics component
const [dateRange, setDateRange] = useState<DateRange | undefined>();

// After - Analytics component
const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
  // Default to last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  return { from: thirtyDaysAgo, to: now };
});

// Before - API endpoint
const safeLimit = Math.min(Math.max(limit, 1), 100); // Between 1 and 100

// After - API endpoint
const safeLimit = Math.min(Math.max(limit, 1), 1000); // Up to 1000 for all requests
```

## Benefits

1. **Better Performance**: Date filtering naturally limits data scope instead of arbitrary limits
2. **Relevant Data**: Analytics shows recent, relevant data by default
3. **User Control**: Users can easily adjust date ranges for different analysis periods
4. **Consistency**: All requests can use the same limit since date filtering handles scope
5. **Intuitive UX**: "Last 30 days" is a common and expected default for analytics

## Usage

### Analytics Default Behavior
- Automatically shows last 30 days of data
- Users can adjust date range as needed
- "30d" button resets to default 30-day range

### API Requests
```javascript
// Analytics with date filtering
fetch('/api/upload-queue?limit=1000&date_start=2024-01-01&date_end=2024-01-31')

// Regular pagination
fetch('/api/upload-queue?limit=50&offset=0')
```

## Files Modified

- `src/components/candidates/ProcessQueueAnalytics.tsx`
- `src/app/api/upload-queue/route.ts`
- `src/app/api/v1/upload-queue/route.ts`
- `scripts/seed-upload-queue.js`
- `scripts/test-upload-queue-limit.js` (new)
- `docs/upload-queue-analytics-limit-fix.md`

## Verification

To verify the fix:

1. Run the seed script to create test data:
   ```bash
   node scripts/seed-upload-queue.js
   ```

2. Run the test script:
   ```bash
   node scripts/test-upload-queue-limit.js
   ```

3. Check the analytics tab in the UI - it should now:
   - Show "Last 30 days" as the default date range
   - Display all jobs within the selected date range (up to 1000)
   - Allow easy date range adjustment
   - Have a "30d" button to reset to default range
