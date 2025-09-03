# Error 403 Toast Update Summary

## Overview
Updated the application to show "No permission" instead of generic "Failed" messages when encountering 403 (Forbidden) errors.

## Changes Made

### 1. Updated `src/lib/networkUtils.ts`
- Modified `getErrorMessage()` function to return "No permission" for 403 status codes
- Added new utility functions:
  - `handleApiResponse()` - Handles API responses and throws appropriate errors with user-friendly messages
  - `handleApiResponseJson()` - Handles API responses with JSON parsing and error handling

### 2. Updated Components to Use New Error Handling

#### `src/components/settings/UnifiedRoleDrawer.tsx`
- Added import for new network utility functions
- Updated permission update error handling to use `handleApiResponse()`
- Updated user addition/removal error handling to use `handleApiResponse()`

#### `src/components/candidates/CandidatesPageClient.tsx`
- Updated export function to show "No permission" for 403 errors instead of "Permission denied. You may not have permission to export candidates."

#### `src/components/settings/UserGroupsTab.tsx`
- Updated error handling to show "No permission" for 403 errors
- Separated 401 and 403 error handling logic

#### `src/app/settings/user-groups/page.tsx`
- Updated error handling to show "No permission" for 403 errors
- Separated 401 and 403 error handling logic

#### `src/app/settings/custom-fields/page.tsx`
- Updated error handling to show "No permission" for 403 errors
- Separated 401 and 403 error handling logic

#### `src/app/settings/logs/page.tsx`
- Updated error handling to show "No permission" for 403 errors
- Updated 401 error message to be more specific

#### `src/components/candidates/CandidateImportUploadQueue.tsx`
- Updated error handling to show "No permission" for Forbidden errors instead of "Permission denied: You do not have permission to retry jobs."

#### `src/components/settings/AiApiKeysTab.tsx`
- Updated error handling to show "No permission" for 403 errors instead of detailed permission message

## Benefits

1. **Consistent Error Messages**: All 403 errors now show the same "No permission" message
2. **User-Friendly**: Clearer, more concise error messages
3. **Maintainable**: Centralized error handling through utility functions
4. **Better UX**: Users immediately understand they lack permissions without verbose explanations

## Usage

### For New Components
Use the new utility functions for consistent error handling:

```typescript
import { handleApiResponse, handleApiResponseJson } from '@/lib/networkUtils';

// Simple response handling
try {
  const response = await fetch('/api/endpoint');
  handleApiResponse(response, 'Default error message');
  // Process successful response
} catch (error) {
  toast.error(error.message); // Will show "No permission" for 403 errors
}

// JSON response handling
try {
  const response = await fetch('/api/endpoint');
  const data = await handleApiResponseJson(response, 'Default error message');
  // Process data
} catch (error) {
  toast.error(error.message);
}
```

### For Existing Components
The `getErrorMessage()` function can be used to get user-friendly error messages:

```typescript
import { getErrorMessage } from '@/lib/networkUtils';

// In catch blocks
} catch (error) {
  const userMessage = getErrorMessage(error);
  toast.error(userMessage);
}
```

## Testing
The changes have been implemented and tested to ensure:
- 403 errors consistently show "No permission"
- 401 errors show appropriate authentication messages
- Other error types maintain their existing behavior
- New utility functions work correctly

## Files Modified
- `src/lib/networkUtils.ts`
- `src/components/settings/UnifiedRoleDrawer.tsx`
- `src/components/candidates/CandidatesPageClient.tsx`
- `src/components/settings/UserGroupsTab.tsx`
- `src/app/settings/user-groups/page.tsx`
- `src/app/settings/custom-fields/page.tsx`
- `src/app/settings/logs/page.tsx`
- `src/components/candidates/CandidateImportUploadQueue.tsx`
- `src/components/settings/AiApiKeysTab.tsx`
