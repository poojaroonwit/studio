# Timezone Fix Summary

## Problem
When creating a new candidate via the v1 API, the applied date was showing as "7 hours ago" instead of "just now" in the candidate table. This was happening because:

1. The server was creating dates in UTC
2. The database was storing dates in UTC
3. The frontend was displaying dates in the local timezone (Thailand is UTC+7)
4. This caused a 7-hour difference between when the candidate was created and when it appeared in the UI

## Solution
Implemented timezone-aware date handling throughout the application:

### 1. Created Timezone Utility Functions (`src/lib/dateUtils.ts`)
- `createDateInTimezone()`: Creates dates in the specified timezone and converts to UTC for database storage
- `convertUtcToTimezone()`: Converts UTC dates from database to local timezone for display
- `formatDateInTimezone()`: Formats dates for display in the specified timezone
- `getTimezoneOffset()`: Gets the current timezone offset in hours
- `getApplicationTimezone()`: Gets the current application timezone

### 2. Updated API Endpoints
- **v1 Candidates API** (`src/app/api/v1/candidates/route.ts`): Now uses `createDateInTimezone()` for all date fields
- **Main Candidates API** (`src/app/api/candidates/route.ts`): Updated to use timezone-aware date creation
- **Automation API** (`src/app/api/automation/create-candidate-with-matches/route.ts`): Updated to use timezone-aware date creation

### 3. Updated Frontend Display
- **Candidate Table** (`src/components/candidates/CandidateTable.tsx`): Updated `displayAppliedDate()` function to use timezone-aware date formatting

### 4. Environment Configuration
- Added `APP_TIMEZONE` environment variable (defaults to 'Asia/Bangkok')
- Updated all environment templates:
  - `env.local.template`
  - `env.production.template`
  - `env.internal.template`
- Updated `docker-compose.yml` to include the timezone environment variable

### 5. Dependencies
- Added `date-fns-tz` package for timezone handling

## Testing the Fix

### 1. Set Environment Variable
Make sure your `.env.local` file includes:
```env
APP_TIMEZONE=Asia/Bangkok
```

### 2. Test Candidate Creation
1. Create a new candidate via the v1 API
2. Check the candidate table in the frontend
3. The applied date should now show "just now" or "a few seconds ago" instead of "7 hours ago"

### 3. Test Different Timezones
You can test with different timezones by changing the `APP_TIMEZONE` environment variable:
```env
APP_TIMEZONE=UTC
APP_TIMEZONE=America/New_York
APP_TIMEZONE=Europe/London
```

## Files Modified
1. `src/lib/dateUtils.ts` (new file)
2. `src/app/api/v1/candidates/route.ts`
3. `src/app/api/candidates/route.ts`
4. `src/app/api/automation/create-candidate-with-matches/route.ts`
5. `src/components/candidates/CandidateTable.tsx`
6. `env.local.template`
7. `env.production.template`
8. `env.internal.template`
9. `docker-compose.yml`
10. `package.json` (added date-fns-tz dependency)

## Expected Behavior
After implementing this fix:
- New candidates created via the v1 API will show the correct applied date
- The applied date will display as "just now" or "a few seconds ago" for recently created candidates
- All date displays will be consistent with the configured timezone
- The fix maintains backward compatibility with existing data
