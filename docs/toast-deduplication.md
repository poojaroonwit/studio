# Toast Deduplication System

## Overview

This document explains the double toast notification issue that was identified in the application and the implemented solutions to prevent duplicate toasts from appearing for the same action.

## 🚨 **Problem: Double Toast Notifications**

### **Root Cause**
The application had two separate toast notification systems that could both trigger for the same event:

1. **Real-time Collaboration Hook** (`use-realtime-collaboration.ts`)
   - Shows toasts via `showNotification()` function
   - Listens to SSE events for real-time updates

2. **Notification Context** (`NotificationContext.tsx`)
   - Shows toasts via `addNotification()` function
   - Also listens to the same SSE events

### **Specific Scenarios Where Double Toasts Occurred**

#### **Candidate Updates**
```typescript
// Real-time Collaboration Hook
showNotification(`Candidate ${updatedCandidate.name} moved to ${updatedCandidate.status}`, '🔄');

// Notification Context
addNotification({
  type: 'candidate_update',
  title: 'Candidate Updated',
  message: `Candidate ${data.candidate.name || data.candidate.email} has been updated`,
  // This also triggers a toast
});
```

#### **Comment Updates**
```typescript
// Real-time Collaboration Hook
showNotification(`New comment added by ${data.comment.createdBy || 'Team member'}`, '💬');

// Notification Context
addNotification({
  type: 'new_comment',
  title: 'New Comment',
  message: `New comment added by ${data.comment.authorName || 'Team member'}`,
  // This also triggers a toast
});
```

#### **Position Updates**
```typescript
// Real-time Collaboration Hook
showNotification(`Position "${data.position.title}" updated`, '💼');

// Notification Context
addNotification({
  type: 'position_update',
  title: 'Position Updated',
  message: `Position "${data.position.title}" has been updated`,
  // This also triggers a toast
});
```

## ✅ **Solutions Implemented**

### **1. Centralized Toast Manager Hook**

Created `useToastManager` hook that prevents duplicate toasts by tracking recent toast messages and their timestamps.

**Features:**
- **Deduplication Window**: Configurable time window (default: 3 seconds) to prevent duplicate toasts
- **Message Tracking**: Tracks recent toast messages and types
- **Automatic Cleanup**: Removes old toast records outside the deduplication window
- **Console Logging**: Logs when toasts are deduplicated for debugging

**Usage:**
```typescript
import { useToastManager } from '@/hooks/use-toast-manager';

function MyComponent() {
  const { success, error, loading, info } = useToastManager({
    deduplicationWindowMs: 3000, // 3 seconds
    maxRecentToasts: 10
  });

  const handleAction = () => {
    success('Action completed successfully'); // Will be deduplicated if called again within 3 seconds
  };
}
```

### **2. Updated Notification Context**

Modified `NotificationContext` to use the centralized toast manager:

```typescript
// Before
import { toast } from 'react-hot-toast';
toast.success(`${notification.title}: ${notification.message}`, options);

// After
import { useToastManager } from '@/hooks/use-toast-manager';
const { success: showToast } = useToastManager({ deduplicationWindowMs: 2000 });
showToast(`${notification.title}: ${notification.message}`, options);
```

### **3. Updated Real-time Collaboration Hook**

Modified `use-realtime-collaboration.ts` to use the centralized toast manager:

```typescript
// Before
import { toast } from 'react-hot-toast';
toast.success(message, options);

// After
import { useToastManager } from '@/hooks/use-toast-manager';
const { success: showToast, error: showErrorToast } = useToastManager({ deduplicationWindowMs: 2000 });
showToast(message, options);
```

### **4. Notification Enable/Disable Feature**

Added ability to disable notifications in specific contexts:

```typescript
// In NotificationContext
const [notificationsEnabled, setNotificationsEnabled] = useState(true);

// Usage in components
const { setNotificationsEnabled } = useNotifications();

// Disable notifications for specific operations
setNotificationsEnabled(false);
// ... perform operation ...
setNotificationsEnabled(true);
```

## 🔧 **Configuration Options**

### **Toast Manager Options**

```typescript
interface ToastManagerOptions {
  deduplicationWindowMs?: number; // Time window to prevent duplicate toasts
  maxRecentToasts?: number; // Maximum number of recent toasts to track
}
```

### **Default Values**
- `deduplicationWindowMs`: 3000ms (3 seconds)
- `maxRecentToasts`: 10

### **Context-Specific Settings**
- **Notification Context**: 2000ms deduplication window
- **Real-time Collaboration**: 2000ms deduplication window
- **Task Board**: Notifications disabled to prevent conflicts

## 🧪 **Testing the Solution**

### **Manual Testing**
1. Perform an action that triggers a notification (e.g., move a candidate)
2. Quickly perform the same action again
3. Verify only one toast appears instead of two

### **Console Logging**
When a toast is deduplicated, you'll see a console log:
```
Toast deduplicated: Candidate John Doe moved to Interview (success)
```

### **Debugging**
To check recent toasts:
```typescript
const { clearRecent, isDuplicate } = useToastManager();
console.log('Is duplicate:', isDuplicate('My message', 'success'));
clearRecent(); // Clear recent toast history
```

## 📋 **Best Practices**

### **When to Use Toast Manager**
- ✅ Use `useToastManager` for all new toast notifications
- ✅ Use it in components that might trigger multiple toasts
- ✅ Use it in real-time collaboration scenarios

### **When to Disable Notifications**
- ✅ During bulk operations
- ✅ In task board where real-time updates are frequent
- ✅ When performing multiple related actions

### **Configuration Guidelines**
- Use shorter deduplication windows (1-2 seconds) for frequent updates
- Use longer deduplication windows (3-5 seconds) for important notifications
- Disable notifications during bulk operations to prevent spam

## 🚀 **Migration Guide**

### **For Existing Components**

1. **Replace direct toast imports:**
```typescript
// Before
import { toast } from 'react-hot-toast';

// After
import { useToastManager } from '@/hooks/use-toast-manager';
```

2. **Update toast calls:**
```typescript
// Before
const { success, error } = useToast();

// After
const { success, error } = useToastManager();
```

3. **Add deduplication where needed:**
```typescript
const { success, error } = useToastManager({ deduplicationWindowMs: 2000 });
```

### **For New Components**

Always use `useToastManager` instead of direct toast calls:

```typescript
import { useToastManager } from '@/hooks/use-toast-manager';

function MyComponent() {
  const { success, error, loading } = useToastManager({
    deduplicationWindowMs: 3000
  });

  const handleAction = async () => {
    try {
      loading('Processing...');
      await performAction();
      success('Action completed successfully');
    } catch (err) {
      error('Action failed');
    }
  };
}
```

## 📊 **Performance Impact**

- **Memory**: Minimal - only stores recent toast metadata
- **CPU**: Negligible - simple string comparison and timestamp checks
- **User Experience**: Significantly improved - no more duplicate toasts
- **Network**: No impact - deduplication happens client-side

## 🔮 **Future Enhancements**

1. **Smart Deduplication**: Group similar messages instead of exact matches
2. **Toast Queuing**: Queue toasts when many are triggered simultaneously
3. **User Preferences**: Allow users to configure deduplication settings
4. **Analytics**: Track toast frequency and deduplication rates
