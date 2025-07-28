# Upload Queue UI Fix

## Problem
The upload queue table was showing a loading spinner ("Loading upload queue...") when there were no jobs in the queue, instead of showing a clear "No queue" message.

## Solution
Modified the table body logic to show a proper empty state when there are no jobs, regardless of the loading state.

## Changes Made

### 1. Updated Table Body Logic

**Before:**
```tsx
{isLoading && jobs.length === 0 ? (
  <TableRow>
    <TableCell colSpan={8} className="text-center py-8">
      <div className="flex items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading upload queue...</span>
      </div>
    </TableCell>
  </TableRow>
) : fetchError ? (
  // Error state
) : jobs.length === 0 ? (
  <TableRow>
    <TableCell colSpan={8} className="text-center text-muted-foreground">
      {isLoading ? (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading upload queue...</span>
        </div>
      ) : (
        'No queue'
      )}
    </TableCell>
  </TableRow>
```

**After:**
```tsx
{fetchError ? (
  <TableRow>
    <TableCell colSpan={8} className="text-center text-destructive">
      <div className="flex flex-col items-center gap-2">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <span>{fetchError.includes('401') ? 'You are not authorized to view the upload queue. Please sign in again.' : fetchError}</span>
      </div>
    </TableCell>
  </TableRow>
) : jobs.length === 0 ? (
  <TableRow>
    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
      <div className="flex flex-col items-center gap-2">
        <Inbox className="h-8 w-8 text-muted-foreground/50" />
        <span className="text-lg font-medium">No queue</span>
        <span className="text-sm text-muted-foreground">Upload queue is empty</span>
      </div>
    </TableCell>
  </TableRow>
```

### 2. Added Inbox Icon Import

Added the `Inbox` icon to the imports from lucide-react:
```tsx
import { Loader2, XCircle, CheckCircle, FileText, RotateCcw, ExternalLink, AlertCircle, Eye, FileUp, UploadCloud, X, Download, ChevronLeft, ChevronRight, MoreHorizontal, Play, MoreVertical, ChevronUp, ChevronDown, BarChart3, Timer, Inbox } from "lucide-react";
```

## Expected Behavior

### When Queue is Empty:
✅ **Shows "No queue" message** with inbox icon  
✅ **No loading spinner**  
✅ **Clear visual indication** that the queue is empty  
✅ **Status cards show "0"** for all counts  

### When Queue has Jobs:
✅ **Shows job list** normally  
✅ **Status cards show actual counts**  
✅ **All functionality works** as expected  

### When Loading:
✅ **Only shows loading** when actually fetching data  
✅ **Once loaded, shows appropriate state** (empty or with jobs)  

## Files Modified

- `src/components/candidates/CandidateImportUploadQueue.tsx`
  - Updated table body logic
  - Added Inbox icon import
  - Improved empty state styling

## Testing

Use the provided test script to verify the behavior:
```bash
node test-queue-ui.js
```

This will:
- Check current queue status
- Verify system settings
- Test processor endpoint
- Confirm expected UI behavior

## Visual Improvements

The new empty state includes:
- **Inbox icon** for visual clarity
- **"No queue" title** in larger, bold text
- **"Upload queue is empty" subtitle** for context
- **Better spacing** with `py-8` padding
- **Muted colors** for appropriate visual hierarchy

## Benefits

1. **Clear Communication**: Users immediately understand the queue is empty
2. **No Confusion**: No loading spinner when there's nothing to load
3. **Better UX**: Professional empty state design
4. **Consistent**: Matches modern UI patterns for empty states 