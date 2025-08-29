# Infinite Loop Fixes Implementation Guide

## Critical Fixes Required

### 1. Fix Unified Realtime Broadcaster Retry Queue

**File:** `src/lib/unified-realtime-broadcaster.ts`

**Problem:** The retry queue can grow infinitely if broadcast operations consistently fail.

**Solution:** Add circuit breaker and queue size limits.

```typescript
// Add these properties to the class
private maxRetryQueueSize = 100;
private circuitBreakerThreshold = 10;
private consecutiveFailures = 0;
private lastFailureTime = 0;

// Update the processRetryQueue method
private async processRetryQueue() {
  if (this.isProcessingRetries || this.retryQueue.length === 0) {
    return;
  }

  // Circuit breaker check
  if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    if (timeSinceLastFailure < 60000) { // 1 minute cooldown
      console.error('🚨 Circuit breaker active, skipping retry queue processing');
      return;
    } else {
      // Reset circuit breaker after cooldown
      this.consecutiveFailures = 0;
    }
  }

  // Queue size limit check
  if (this.retryQueue.length > this.maxRetryQueueSize) {
    console.error(`🚨 Retry queue overflow (${this.retryQueue.length} items), clearing queue`);
    this.retryQueue = [];
    this.consecutiveFailures = 0;
    return;
  }

  this.isProcessingRetries = true;

  while (this.retryQueue.length > 0) {
    const item = this.retryQueue.shift();
    if (!item) continue;

    if (item.retryCount < item.maxRetries) {
      try {
        await this.broadcast(item.event.type, item.event.data, item.options);
        this.consecutiveFailures = 0; // Reset on success
      } catch (error) {
        item.retryCount++;
        this.consecutiveFailures++;
        this.lastFailureTime = Date.now();
        
        if (item.retryCount < item.maxRetries) {
          this.retryQueue.push(item);
        }
      }
    }

    // Wait between retries with exponential backoff
    const backoffDelay = Math.min(1000 * Math.pow(2, this.consecutiveFailures), 10000);
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
  }

  this.isProcessingRetries = false;
}
```

### 2. Fix User Preferences Retry Logic

**File:** `src/hooks/use-user-preferences.ts`

**Problem:** Retry logic could run indefinitely with exponential backoff.

**Solution:** Add maximum total retry time and better error handling.

```typescript
// Update the savePreferences function
const savePreferences = useCallback(async (modelType: string, updates: any) => {
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }

  saveTimeoutRef.current = setTimeout(async () => {
    isSavingRef.current = true;
    
    const maxRetries = 3;
    const maxRetryTime = 30000; // 30 seconds total
    let retryCount = 0;
    const startTime = Date.now();

    while (retryCount < maxRetries && (Date.now() - startTime) < maxRetryTime) {
      try {
        const response = await fetch('/api/user-preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            modelType,
            updates,
          }),
          credentials: 'include',
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          console.warn(`Failed to save user preferences: ${response.status} ${response.statusText}`);
          if (response.status >= 500) {
            retryCount++;
            if (retryCount < maxRetries && (Date.now() - startTime) < maxRetryTime) {
              const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              continue;
            }
          }
        } else {
          break; // Success, exit retry loop
        }
      } catch (error) {
        console.warn(`Error saving user preferences (attempt ${retryCount + 1}):`, error);
        
        if (error instanceof Error && error.name === 'TimeoutError') {
          retryCount++;
          if (retryCount < maxRetries && (Date.now() - startTime) < maxRetryTime) {
            const backoffDelay = Math.min(2000 * Math.pow(2, retryCount), 10000);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
        }
        
        if (error instanceof TypeError && error.message.includes('fetch')) {
          retryCount++;
          if (retryCount < maxRetries && (Date.now() - startTime) < maxRetryTime) {
            const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
        }
        
        break; // Don't retry other errors
      }
    }
    
    // Clear saving flag after a short delay
    if (clearSavingTimeoutRef.current) {
      clearTimeout(clearSavingTimeoutRef.current);
    }
    clearSavingTimeoutRef.current = setTimeout(() => {
      isSavingRef.current = false;
    }, 100);
  }, 500);
}, [session?.user?.id]);
```

### 3. Fix Candidate Filters Auto-apply Effect

**File:** `src/components/candidates/CandidateFilters.tsx`

**Problem:** The useEffect could trigger infinite loops if handleApplyStandardFilters updates dependencies.

**Solution:** Add dependency guards and prevent circular updates.

```typescript
// Add this ref to track previous filter values
const prevFiltersRef = useRef<string>('');

// Update the auto-apply useEffect
useEffect(() => {
  // Skip if we're not ready to apply filters
  if (isInitialLoadRef.current || isSyncingFromInitialFiltersRef.current || !isComponentInitializedRef.current) {
    return;
  }
  
  // Skip if we're currently handling position changes directly
  if (isHandlingPositionChangeRef.current) {
    return;
  }
  
  // Skip if we're currently applying filters
  if (isApplyingFilters) {
    return;
  }
  
  // Skip if there's an advanced query active
  if (advancedQueryInput.trim()) {
    return;
  }

  // Create a hash of current filter values
  const currentFilters = JSON.stringify({
    name, nameOperator, email, emailOperator, phone, phoneOperator,
    location, locationOperator, selectedPositionIds, selectedStatuses,
    selectedRecruiterIds, selectedSourceIds, skills, experienceYearsRange,
    applicationDateRange
  });

  // Skip if filters haven't actually changed
  if (prevFiltersRef.current === currentFilters) {
    return;
  }

  prevFiltersRef.current = currentFilters;
  
  // Clear any existing timeout
  if (autoApplyTimeoutRef.current) {
    clearTimeout(autoApplyTimeoutRef.current);
  }
  
  // Debounce filter application
  autoApplyTimeoutRef.current = setTimeout(() => {
    handleApplyStandardFilters();
  }, 200);
  
  // Cleanup timeout on unmount or dependency change
  return () => {
    if (autoApplyTimeoutRef.current) {
      clearTimeout(autoApplyTimeoutRef.current);
      autoApplyTimeoutRef.current = null;
    }
  };
}, [
  name, nameOperator, email, emailOperator, phone, phoneOperator,
  location, locationOperator, selectedPositionIds, selectedStatuses,
  selectedRecruiterIds, selectedSourceIds, skills, experienceYearsRange,
  applicationDateRange, advancedQueryInput
]);
```

### 4. Fix Candidate Kanban View Index Reset

**File:** `src/components/candidates/CandidateKanbanView.tsx`

**Problem:** The useEffect could trigger infinite loops if setCurrentIndex affects filteredCandidates.length.

**Solution:** Add a ref to track if this is the initial load.

```typescript
// Add this ref to track if we've already reset the index
const hasResetIndexRef = useRef(false);

// Update the useEffect
useEffect(() => {
  // Only reset index if we haven't already done so for this candidate set
  if (!hasResetIndexRef.current) {
    setCurrentIndex(0);
    hasResetIndexRef.current = true;
  }
}, [filteredCandidates.length]);

// Reset the flag when candidates change
useEffect(() => {
  hasResetIndexRef.current = false;
}, [filteredCandidates]);
```

## Implementation Steps

### Step 1: Apply Critical Fixes

1. **Update Unified Realtime Broadcaster**
   ```bash
   # Apply the circuit breaker and queue size limits
   # Edit src/lib/unified-realtime-broadcaster.ts
   ```

2. **Update User Preferences Hook**
   ```bash
   # Apply the retry time limits and better error handling
   # Edit src/hooks/use-user-preferences.ts
   ```

3. **Update Candidate Filters**
   ```bash
   # Apply the dependency guards
   # Edit src/components/candidates/CandidateFilters.tsx
   ```

4. **Update Candidate Kanban View**
   ```bash
   # Apply the index reset protection
   # Edit src/components/candidates/CandidateKanbanView.tsx
   ```

### Step 2: Add Infinite Loop Detection Utilities

1. **Import the utilities in high-risk components**
   ```typescript
   import { useInfiniteLoopDetection, useRetryGuard } from '@/lib/infinite-loop-detection';
   ```

2. **Add detection to critical useEffect hooks**
   ```typescript
   // In CandidateFilters.tsx
   useInfiniteLoopDetection('CandidateFilters.autoApply', 50, 2000);
   
   // In use-user-preferences.ts
   const { shouldRetry, reset } = useRetryGuard(3, 30000, 'UserPreferences');
   ```

### Step 3: Add Monitoring

1. **Add performance monitoring**
   ```typescript
   // In high-risk components
   useEffectMonitor('ComponentName.effectName', 100);
   ```

2. **Add circuit breakers to async operations**
   ```typescript
   // In components with retry logic
   const circuitBreaker = useCircuitBreaker('ComponentName', 5, 60000);
   ```

### Step 4: Testing

1. **Run the infinite loop detection test**
   ```bash
   node test-infinite-loop-detection.js
   ```

2. **Test specific components**
   ```bash
   # Test candidate filters
   node test-candidate-modal-infinite-loop.js
   
   # Test task board
   node test-task-board-infinite-loop.js
   ```

## Monitoring and Prevention

### 1. Add ESLint Rules

Add these rules to your ESLint configuration:

```json
{
  "rules": {
    "react-hooks/exhaustive-deps": "error",
    "react-hooks/rules-of-hooks": "error",
    "no-constant-condition": "error",
    "no-unreachable-loop": "error"
  }
}
```

### 2. Add Pre-commit Hooks

Create a pre-commit hook to check for potential infinite loops:

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for while loops without proper exit conditions
if grep -r "while.*true" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"; then
  echo "⚠️  Warning: Found while(true) loops. Please ensure they have proper exit conditions."
fi

# Check for useEffect with missing dependencies
if grep -r "useEffect.*\[\]" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"; then
  echo "⚠️  Warning: Found useEffect with empty dependency array. Please verify this is intentional."
fi
```

### 3. Add Runtime Monitoring

Add this to your main application component:

```typescript
// In _app.tsx or main layout component
import { useEffectMonitor } from '@/lib/infinite-loop-detection';

export default function App({ Component, pageProps }) {
  // Monitor the entire app for frequent re-renders
  useEffectMonitor('App.render', 50);
  
  return <Component {...pageProps} />;
}
```

## Verification Checklist

After implementing the fixes, verify:

- [ ] Retry queue has circuit breaker and size limits
- [ ] User preferences retry logic has time limits
- [ ] Candidate filters have dependency guards
- [ ] Kanban view index reset is protected
- [ ] Infinite loop detection utilities are imported
- [ ] Performance monitoring is active
- [ ] ESLint rules are configured
- [ ] Pre-commit hooks are installed
- [ ] Tests pass without infinite loops
- [ ] No console errors about excessive calls

## Emergency Procedures

If infinite loops are detected in production:

1. **Immediate Response**
   - Check browser console for error messages
   - Look for excessive API calls or re-renders
   - Identify the problematic component

2. **Quick Fixes**
   - Add circuit breakers to failing operations
   - Implement rate limiting
   - Add timeout guards

3. **Long-term Prevention**
   - Implement the fixes above
   - Add monitoring and alerting
   - Regular code reviews focusing on useEffect dependencies

## Conclusion

These fixes address the most critical infinite loop risks in your codebase. The key principles are:

1. **Always have exit conditions** for loops and retries
2. **Use circuit breakers** for failing operations
3. **Add dependency guards** to useEffect hooks
4. **Monitor performance** for frequent calls
5. **Test thoroughly** before deployment

Implement these fixes systematically, starting with the critical issues, and your application will be much more robust against infinite loops.
