# Enhanced Error Handling for Filter Errors

This document describes the enhanced error handling system that provides detailed debugging information for filter errors and other common issues.

## Overview

The system now provides comprehensive error reporting and debugging capabilities for filter errors, which are common when working with API data that may be null, undefined, or have unexpected structure.

## Components

### 1. Enhanced Error Boundary (`src/components/ui/error-boundary.tsx`)

The error boundary now provides:
- Detailed stack trace information for filter errors
- Root cause analysis
- Suggested fixes
- Integration with global error handler

### 2. Global Error Handler (`src/lib/error-handler.ts`)

A singleton error handler that:
- Catches unhandled errors globally
- Provides special handling for filter errors
- Logs detailed error context
- Can integrate with error reporting services

### 3. Safe Filter Hook (`src/hooks/use-safe-filter.ts`)

A React hook that provides:
- Safe filtering operations with error context
- Debugging information for problematic data
- Memoized filtering for performance

### 4. Enhanced Utils (`src/lib/utils.ts`)

Additional utility functions:
- `safeFilter()` - Enhanced safe filter with error context
- `debugFilterError()` - Debug utility for filter errors

## Usage Examples

### Using the Safe Filter Hook

```typescript
import { useSafeFilter } from '@/hooks/use-safe-filter';

function MyComponent() {
  const { safeFilter } = useSafeFilter();
  
  const filteredData = safeFilter(
    apiData, 
    (item) => item.status === 'active',
    'MyComponent.filteredData'
  );
  
  return <div>{/* render filtered data */}</div>;
}
```

### Using Safe Filter Utils

```typescript
import { reactSafeArray } from '@/lib/utils';

// Instead of: data.filter(item => item.active)
const filteredData = reactSafeArray.filter(data, item => item.active);

// With error context:
const filteredData = reactSafeArray.safeFilter(
  data, 
  item => item.active, 
  'MyComponent.dataFilter'
);
```

### Defensive Programming

```typescript
// Always check if data is an array before filtering
const filteredData = Array.isArray(data) ? data.filter(item => item.active) : [];

// Or use the safe utilities
const filteredData = reactSafeArray.filter(data, item => item.active);
```

## Error Information Provided

When a filter error occurs, the system now provides:

1. **Error Type**: Identifies it as a filter error
2. **Context**: Where the error occurred (component, function)
3. **Data Analysis**: 
   - Data type (array, object, null, undefined)
   - Array status (isArray, length, constructor)
   - Sample of the problematic data
4. **Stack Trace**: Relevant lines from the call stack
5. **Suggested Fixes**: Code examples for preventing the error

## Error Display

The error boundary now shows:
- Clear error message
- Expandable details section with stack trace
- Root cause explanation
- Suggested fixes with code examples
- Retry and reload options

## Integration with Error Reporting

The global error handler can be configured to send errors to:
- Sentry
- LogRocket
- Custom error reporting services
- Console logging (development)

## Best Practices

1. **Always use safe filtering utilities** when working with API data
2. **Add defensive checks** before filtering operations
3. **Provide context** when using safe filter functions
4. **Monitor error logs** to identify patterns
5. **Test with various data states** (null, undefined, empty arrays)

## Common Filter Error Scenarios

1. **API returns null instead of array**
2. **Data structure changes unexpectedly**
3. **Async data not yet loaded**
4. **Network errors returning unexpected formats**
5. **TypeScript type mismatches**

## Debugging Tips

1. Check the browser console for detailed error context
2. Use the `debugFilterError` utility to inspect problematic data
3. Look at the stack trace to identify the source component
4. Verify API response structure
5. Add defensive checks in high-risk areas

## Migration Guide

To migrate existing code:

1. Replace direct `.filter()` calls with `reactSafeArray.filter()`
2. Add context parameters to filter operations
3. Use the `useSafeFilter` hook in React components
4. Wrap components with the enhanced error boundary
5. Monitor error logs for patterns

## Example Migration

**Before:**
```typescript
const filteredCandidates = candidates.filter(c => c.status === 'active');
```

**After:**
```typescript
const filteredCandidates = reactSafeArray.filter(
  candidates, 
  c => c.status === 'active',
  'CandidateList.filteredCandidates'
);
```

Or with the hook:
```typescript
const { safeFilter } = useSafeFilter();
const filteredCandidates = safeFilter(
  candidates, 
  c => c.status === 'active',
  'CandidateList.filteredCandidates'
);
```
