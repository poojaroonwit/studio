# CandidateDetailView Infinite Loop Fix

## Problem Description

The `CandidateDetailView` component was experiencing an infinite loop in the `loadData` function, causing excessive API calls and performance issues. The warning message was:

```
🚨 Potential infinite loop in "CandidateDetailView_loadData": running too frequently
```

## Root Cause Analysis

The infinite loop was caused by a circular dependency in the React hooks:

1. **`loadData` function** had `isLoading` in its dependency array
2. **`loadData` function** called `setIsLoading(true)` internally
3. **`useEffect`** depended on `loadData`
4. **`useInfiniteLoopPrevention`** hook's `trackRun` function was being recreated due to `onExcessiveRuns` dependency

This created the following cycle:
```
loadData changes → useEffect runs → loadData called → setIsLoading(true) → loadData changes again
```

## Solution Implemented

### 1. Fixed `loadData` Dependency Array

**Before:**
```typescript
const loadData = useCallback(async () => {
  // ... function body
}, [candidateId, trackLoadData, isLoading]); // ❌ isLoading caused recreation
```

**After:**
```typescript
const loadData = useCallback(async () => {
  // ... function body
}, [candidateId, trackLoadData]); // ✅ Removed isLoading dependency
```

### 2. Fixed Timeout Logic

**Before:**
```typescript
timeoutRef.current = setTimeout(() => {
  if (mountedRef.current && isLoading) { // ❌ Used isLoading state
    // ... timeout logic
  }
}, 30000);
```

**After:**
```typescript
timeoutRef.current = setTimeout(() => {
  if (mountedRef.current) { // ✅ Removed isLoading dependency
    // ... timeout logic
  }
}, 30000);
```

### 3. Memoized `onExcessiveRuns` Callback

**Before:**
```typescript
const { trackRun: trackLoadData } = useInfiniteLoopPrevention('CandidateDetailView_loadData', 20, () => {
  console.error('🚨 Excessive data loading detected in CandidateDetailView');
}); // ❌ Inline function recreated on every render
```

**After:**
```typescript
const onExcessiveRuns = useCallback(() => {
  console.error('🚨 Excessive data loading detected in CandidateDetailView');
}, []); // ✅ Memoized callback

const { trackRun: trackLoadData } = useInfiniteLoopPrevention('CandidateDetailView_loadData', 20, onExcessiveRuns);
```

### 4. Fixed `useInfiniteLoopPrevention` Hook

**Before:**
```typescript
const trackRun = useCallback(() => {
  // ... function body
}, [effectKey, maxRuns, onExcessiveRuns]); // ❌ onExcessiveRuns caused recreation
```

**After:**
```typescript
// Store the callback in a ref to avoid dependency issues
const onExcessiveRunsRef = useRef(onExcessiveRuns);
onExcessiveRunsRef.current = onExcessiveRuns;

const trackRun = useCallback(() => {
  // ... function body using onExcessiveRunsRef.current
}, [effectKey, maxRuns]); // ✅ Removed onExcessiveRuns dependency
```

## Testing

A test script was created (`scripts/test-candidate-detail-view.js`) to verify the fix:

```bash
node scripts/test-candidate-detail-view.js
```

**Expected Output:**
```
✅ SUCCESS: Infinite loop fix is working correctly!
   - useEffect only called once
   - loadData only called once
   - No infinite re-renders detected
```

## Files Modified

1. **`src/components/candidates/CandidateDetailView.tsx`**
   - Fixed `loadData` dependency array
   - Memoized `onExcessiveRuns` callback
   - Fixed timeout logic

2. **`src/hooks/use-safe-effect.ts`**
   - Fixed `useInfiniteLoopPrevention` hook to use ref for callback
   - Removed `onExcessiveRuns` from dependency array

## Prevention Measures

1. **Infinite Loop Prevention Hook**: The component uses `useInfiniteLoopPrevention` to detect and prevent infinite loops
2. **Abort Controller**: API requests are properly aborted on cleanup
3. **Timeout Protection**: 30-second timeout prevents infinite loading
4. **Mounted Ref**: Prevents state updates after component unmount

## Best Practices Applied

1. **Stable Dependencies**: All `useCallback` and `useEffect` dependencies are now stable
2. **Proper Cleanup**: Abort controllers and timeouts are properly cleaned up
3. **Memoization**: Callbacks are properly memoized to prevent unnecessary re-renders
4. **Ref Usage**: Used refs for values that shouldn't trigger re-renders

## Monitoring

The fix includes console logging to monitor the component's behavior:

- `🔄 Starting to load candidate data for ID: [id]`
- `✅ All candidate data loading completed for: [id]`
- `🏁 Loading state set to false for candidate: [id]`

These logs help identify if the infinite loop issue reoccurs in the future.
