# Toast Clearing and Error Handling Improvements

## Overview

This document outlines the enhancements made to the toast system and error handling, specifically addressing:

1. **Toast Clearing Functionality** - Enhanced ability to clear toasts programmatically and via UI
2. **403 Forbidden Error Handling** - Improved error handling for permission-related issues
3. **Better User Feedback** - More informative error messages and recovery options

## Toast Clearing Features

### Enhanced Toast Hook (`useToast`)

The `useToast` hook now includes additional methods for better toast management:

```typescript
const { 
  show, 
  success, 
  error, 
  loading, 
  dismiss,           // Clear all toasts
  dismissById,       // Clear specific toast by ID
  showWithId,        // Show toast and return ID
  successWithId,     // Show success toast and return ID
  errorWithId,       // Show error toast and return ID
  loadingWithId      // Show loading toast and return ID
} = useToast();
```

### Enhanced Toast Manager (`useToastManager`)

The `useToastManager` hook provides advanced toast management with deduplication:

```typescript
const { 
  success, 
  error, 
  loading, 
  clearAll,          // Clear all toasts and recent history
  showToastWithId,   // Show managed toast with ID
  clearRecent        // Clear recent toast history
} = useToastManager();
```

### Toast Clear Button Component

A reusable `ToastClearButton` component provides UI controls for clearing toasts:

```tsx
import { ToastClearButton } from '@/components/ui/ToastClearButton';

// Basic usage
<ToastClearButton />

// With custom styling
<ToastClearButton 
  variant="outline" 
  size="sm" 
  showText 
  showIcon 
/>
```

## UI Integration

### Header Integration

The toast clear functionality has been integrated into the application header:

1. **Icon Button**: A small X icon button next to notifications for quick clearing
2. **Dropdown Menu**: "Clear All Toasts" option in the user dropdown menu

### Usage Examples

#### Basic Toast Clearing
```tsx
import { useToast } from '@/hooks/use-toast';

function MyComponent() {
  const { dismiss, success } = useToast();
  
  const handleSuccess = () => {
    success('Operation completed!');
  };
  
  const clearAllToasts = () => {
    dismiss();
  };
  
  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={clearAllToasts}>Clear All</button>
    </div>
  );
}
```

#### Advanced Toast Management
```tsx
import { useToastManager } from '@/hooks/use-toast-manager';

function MyComponent() {
  const { success, clearAll, showToastWithId } = useToastManager();
  
  const handleComplexOperation = async () => {
    const loadingId = showToastWithId('Processing...', 'loading');
    
    try {
      await performOperation();
      success('Operation completed successfully!');
    } catch (error) {
      showToastWithId('Operation failed!', 'error');
    } finally {
      // Clear the loading toast if needed
      if (loadingId) {
        toast.dismiss(loadingId);
      }
    }
  };
  
  return (
    <div>
      <button onClick={handleComplexOperation}>Start Operation</button>
      <button onClick={clearAll}>Clear All Toasts</button>
    </div>
  );
}
```

## 403 Forbidden Error Handling

### Problem

The original error handling for drag-and-drop reordering operations was generic and didn't provide specific feedback for permission-related issues.

### Solution

Enhanced error handling in `src/app/settings/data-configuration/page.tsx`:

```typescript
const handleDragEnd = async (result: DropResult) => {
  // ... drag logic ...
  
  try {
    const response = await fetch('/api/settings/candidate-sources/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceIds: updatedItems.map(item => item.id) }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 403) {
        toast.error('Access denied: You do not have permission to reorder candidate sources. Please contact your administrator.');
      } else if (response.status === 401) {
        toast.error('Session expired: Please refresh the page and try again.');
      } else {
        toast.error(errorData.message || 'Failed to update source order');
      }
      
      // Revert to original order on error
      fetchSources();
      return;
    }

    toast.success('Source order updated successfully');
  } catch (error: any) {
    console.error('Failed to reorder:', error);
    
    if (error.message.includes('Failed to fetch')) {
      toast.error('Network error: Please check your connection and try again.');
    } else {
      toast.error('Failed to update source order');
    }
    
    // Revert to original order on error
    fetchSources();
  }
};
```

### Error Types Handled

1. **403 Forbidden**: Permission denied - user lacks required permissions
2. **401 Unauthorized**: Session expired - user needs to refresh/re-login
3. **Network Errors**: Connection issues - user should check connectivity
4. **Generic Errors**: Fallback for unexpected errors

### Permission Requirements

The candidate sources reorder endpoint requires the `SYSTEM_SETTINGS_EDIT` permission:

```typescript
// In the API endpoint
if (!hasPermission(session.user, 'SYSTEM_SETTINGS_EDIT')) {
  return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
}
```

## Best Practices

### Toast Usage

1. **Use Managed Toasts**: Prefer `useToastManager` for operations that might trigger multiple toasts
2. **Provide Context**: Include specific error messages that help users understand what went wrong
3. **Handle Loading States**: Use loading toasts for async operations and clear them appropriately
4. **Prevent Spam**: Use deduplication features to prevent multiple identical toasts

### Error Handling

1. **Specific Messages**: Provide specific error messages based on HTTP status codes
2. **Recovery Actions**: Suggest specific actions users can take to resolve issues
3. **State Reversion**: Revert UI state when operations fail
4. **Logging**: Log errors for debugging while showing user-friendly messages

### UI Integration

1. **Consistent Placement**: Place toast clear buttons in consistent locations
2. **Accessibility**: Ensure toast controls are accessible via keyboard and screen readers
3. **Visual Feedback**: Provide clear visual feedback for toast actions

## Testing

### Toast Clearing
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastDemo } from '@/components/ui/ToastDemo';

test('should clear all toasts when clear button is clicked', () => {
  render(<ToastDemo />);
  
  // Show some toasts
  fireEvent.click(screen.getByText('Show Basic Toasts'));
  
  // Clear all toasts
  fireEvent.click(screen.getByText('Clear All Toasts'));
  
  // Verify toasts are cleared (implementation depends on testing setup)
});
```

### Error Handling
```tsx
test('should show permission error for 403 response', async () => {
  // Mock 403 response
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 403,
    json: () => Promise.resolve({ message: 'Forbidden' })
  });
  
  // Test component behavior
  // Verify appropriate error message is shown
});
```

## Migration Guide

### From Basic Toast Usage

**Before:**
```tsx
import { toast } from 'react-hot-toast';

const showError = () => {
  toast.error('Something went wrong');
};

const clearAll = () => {
  toast.dismiss();
};
```

**After:**
```tsx
import { useToast } from '@/hooks/use-toast';

const { error, dismiss } = useToast();

const showError = () => {
  error('Something went wrong');
};

const clearAll = () => {
  dismiss();
};
```

### Adding Toast Clear Buttons

**Before:**
```tsx
// No built-in clear functionality
```

**After:**
```tsx
import { ToastClearButton } from '@/components/ui/ToastClearButton';

<ToastClearButton variant="outline" size="sm" showText />
```

## Future Enhancements

1. **Toast Persistence**: Option to persist important toasts across page reloads
2. **Toast Categories**: Different styling for different types of toasts
3. **Batch Operations**: Clear toasts by category or time range
4. **Analytics**: Track toast usage patterns for UX improvements
5. **Custom Animations**: Enhanced animations for toast appearance/disappearance

## Troubleshooting

### Common Issues

1. **Toasts Not Clearing**: Ensure you're using the correct dismiss method
2. **Permission Errors**: Check user permissions and session validity
3. **Duplicate Toasts**: Use managed toast system to prevent duplicates
4. **Memory Leaks**: Clear toast references when components unmount

### Debug Tips

1. **Console Logging**: Check browser console for error details
2. **Network Tab**: Monitor API responses for permission issues
3. **React DevTools**: Inspect component state and props
4. **Toast State**: Use browser dev tools to inspect toast DOM elements
