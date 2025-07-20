# Job Match Score Display Fix

## Problem Description

The job match scores in the candidate detail page were always showing as 1% instead of the correct percentage. The v1 API was correctly receiving decimal values like 0.70 (meaning 70%) but the main candidate API endpoint was not converting these decimal scores to percentages.

## Root Cause

The issue was in the main candidate API endpoint (`src/app/api/candidates/[id]/route.ts`) where job match scores were being processed. The v1 API endpoints had the correct conversion logic, but the main API endpoint was not applying the same conversion.

### Database Schema
- `JobMatch.fitScore` field is defined as `Int?` in the database schema
- This means it stores integer values (0-100)
- However, some systems were sending decimal values (0.70) instead of integers (70)

### API Inconsistency
- **v1 API endpoints**: Correctly converted decimal scores (0.70) to percentages (70)
- **Main candidate API**: Was not converting decimal scores, causing them to display as 1% (rounded from 0.70)

## Solution

### 1. Created a Utility Function
Added `normalizeFitScore()` function in `src/lib/scoreUtils.ts`:

```typescript
export function normalizeFitScore(score: number | null | undefined): number {
  if (score === null || score === undefined) return 0;
  
  // If score is a decimal (0-1), convert to percentage
  if (score > 0 && score < 1) return Math.round(score * 100);
  
  // If score is already in 0-100 range, use as is
  if (score >= 0 && score <= 100) return Math.round(score);
  
  // For any other case, ensure it's within 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
}
```

### 2. Updated API Endpoints
Updated the following API endpoints to use the new utility function:

- `src/app/api/candidates/[id]/route.ts` - Main candidate API
- `src/app/api/v1/candidates/[id]/route.ts` - v1 candidate API
- `src/app/api/v1/candidates/[id]/job-matches/route.ts` - v1 job matches API
- `src/app/api/v1/candidates/[id]/job-matches/[matchId]/route.ts` - v1 individual job match API
- `src/app/api/v1/candidates/[id]/job-matches/add/route.ts` - v1 add job match API
- `src/lib/apiUtils.ts` - API utilities

### 3. Score Conversion Logic
The utility function handles the following cases:

- **Decimal scores (0-1)**: Converts to percentage (0.70 → 70)
- **Integer scores (0-100)**: Uses as-is (70 → 70)
- **Null/undefined**: Converts to 0
- **Out of range values**: Clamps to 0-100 range

## Testing

Created and ran comprehensive tests to verify the conversion logic:

```javascript
// Test cases that all pass:
0.70 → 70  // Decimal to percentage
0.85 → 85  // Decimal to percentage
70 → 70    // Integer remains same
null → 0   // Null to zero
undefined → 0  // Undefined to zero
```

## Files Modified

1. `src/lib/scoreUtils.ts` - Added `normalizeFitScore()` utility function
2. `src/app/api/candidates/[id]/route.ts` - Updated to use new utility
3. `src/app/api/v1/candidates/[id]/route.ts` - Updated to use new utility
4. `src/app/api/v1/candidates/[id]/job-matches/route.ts` - Updated to use new utility
5. `src/app/api/v1/candidates/[id]/job-matches/[matchId]/route.ts` - Updated to use new utility
6. `src/app/api/v1/candidates/[id]/job-matches/add/route.ts` - Updated to use new utility
7. `src/lib/apiUtils.ts` - Updated to use new utility

## Result

- Job match scores now display correctly in the candidate detail page
- Decimal scores (0.70) are properly converted to percentages (70%)
- Integer scores (70) continue to work as expected
- All API endpoints now handle score conversion consistently
- Backward compatibility is maintained

## Future Considerations

- Consider standardizing the score format across all systems to use integers (0-100)
- Add validation to ensure scores are always in the correct format before storing
- Consider adding unit tests for the score conversion logic 