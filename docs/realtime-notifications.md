# Real-Time Notifications System

## Overview

The real-time notification system provides instant notifications across all pages of the application. It uses Server-Sent Events (SSE) for real-time communication and includes both toast notifications and a persistent notification drawer.

## 🚀 **Features**

### ✅ **Real-Time Notifications**
- **Instant Updates**: Notifications appear immediately across all pages
- **Toast Notifications**: Non-intrusive pop-up notifications
- **Persistent Drawer**: Full notification history with read/unread status
- **Global State**: Notifications are managed globally and persist across page navigation

### ✅ **Notification Types**
- **Candidate Updates**: When candidates are created, updated, moved, or commented on
- **Position Updates**: When positions are created, updated, opened, or closed
- **User Actions**: Login/logout, profile updates, password changes
- **System Events**: Maintenance notifications, system warnings, errors
- **Task Updates**: Task assignments, completions, and updates
- **Custom Events**: Any custom notification type

### ✅ **User Experience**
- **Unread Count Badge**: Shows number of unread notifications in header
- **Mark as Read**: Individual and bulk mark-as-read functionality
- **Real-Time Updates**: Notifications appear instantly without page refresh
- **Persistent Storage**: Notifications are stored in the database

## 🔧 **Technical Implementation**

### **Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Components    │    │  Notification    │    │   SSE Server    │
│                 │    │    Context       │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │Notification │ │◄──►│ │Global State  │ │◄──►│ │Event Source │ │
│ │Icon/Drawer  │ │    │ │Management    │ │    │ │Controller   │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Routes    │    │   Database       │    │   Broadcast     │
│                 │    │                  │    │   Functions     │
│ • GET /api/     │    │ • Notifications  │    │ • SSE Events    │
│ • POST /api/    │    │ • User-specific  │    │ • Real-time     │
│ • Mark as read  │    │ • Read status    │    │ • Multi-user    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### **Key Components**

#### **1. NotificationContext (`src/contexts/NotificationContext.tsx`)**
Global state management for notifications with real-time SSE integration.

```typescript
const { notifications, unreadCount, markAsRead, addNotification } = useNotifications();
```

#### **2. NotificationIcon (`src/components/ui/notification-icon.tsx`)**
Header notification bell with unread count badge.

#### **3. NotificationDrawer (`src/components/ui/notification-drawer.tsx`)**
Full-screen notification drawer with read/unread management.

#### **4. useNotificationManager Hook (`src/hooks/use-notification-manager.ts`)**
Easy-to-use hook for creating notifications in components.

```typescript
const { notifyCandidateUpdate, notifyPositionUpdate } = useNotificationManager();
```

## 📖 **Usage Guide**

### **Basic Usage**

#### **1. Using the Notification Manager Hook**

```typescript
import { useNotificationManager } from '@/hooks/use-notification-manager';

function MyComponent() {
  const { notifyCandidateUpdate, notifyCustom } = useNotificationManager();

  const handleCandidateSave = () => {
    // Create a candidate update notification
    notifyCandidateUpdate(
      'candidate-123',
      'John Doe',
      'updated',
      { stage: 'Interview', recruiter: 'Jane Smith' }
    );
  };

  const handleCustomEvent = () => {
    // Create a custom notification
    notifyCustom(
      'custom_event',
      'Custom Title',
      'Custom message with details',
      { customData: 'value' }
    );
  };

  return (
    <div>
      <button onClick={handleCandidateSave}>Save Candidate</button>
      <button onClick={handleCustomEvent}>Custom Event</button>
    </div>
  );
}
```

#### **2. Direct API Usage**

```typescript
import { createNotification } from '@/lib/notificationUtils';

// Create a notification directly
await createNotification({
  type: 'candidate_update',
  title: 'Candidate Updated',
  message: 'John Doe has been moved to Interview stage',
  data: { candidateId: '123', stage: 'Interview' }
});
```

#### **3. Server-Side Notification Creation**

```typescript
// In API routes or server-side code
import { broadcastUserNotification } from '@/lib/candidateSse';

// Broadcast to specific user
broadcastUserNotification(userId, {
  id: 'notification-123',
  type: 'system_warning',
  title: 'System Maintenance',
  message: 'Scheduled maintenance in 30 minutes',
  data: { maintenanceId: 'maint-001' },
  isRead: false,
  createdAt: new Date().toISOString()
});
```

### **Notification Types**

#### **Candidate Notifications**
```typescript
notifyCandidateUpdate(
  candidateId: string,
  candidateName: string,
  action: 'created' | 'updated' | 'deleted' | 'moved' | 'commented',
  additionalData?: Record<string, any>
);
```

#### **Position Notifications**
```typescript
notifyPositionUpdate(
  positionId: string,
  positionTitle: string,
  action: 'created' | 'updated' | 'deleted' | 'opened' | 'closed',
  additionalData?: Record<string, any>
);
```

#### **User Action Notifications**
```typescript
notifyUserAction(
  userId: string,
  userName: string,
  action: 'logged_in' | 'logged_out' | 'profile_updated' | 'password_changed',
  additionalData?: Record<string, any>
);
```

#### **System Event Notifications**
```typescript
notifySystemEvent(
  title: string,
  message: string,
  type: 'info' | 'warning' | 'error' | 'success',
  additionalData?: Record<string, any>
);
```

#### **Task Notifications**
```typescript
notifyTaskUpdate(
  taskId: string,
  taskTitle: string,
  action: 'created' | 'updated' | 'completed' | 'assigned',
  additionalData?: Record<string, any>
);
```

## 🎯 **Integration Examples**

### **Candidate Management Integration**

```typescript
// In candidate update API route
export async function PUT(request: NextRequest) {
  // ... update candidate logic ...
  
  // Create notification for the update
  await createCandidateNotification(
    candidate.id,
    candidate.name,
    'updated',
    { 
      stage: candidate.currentStage,
      updatedBy: session.user.name,
      changes: updatedFields 
    }
  );
  
  // Broadcast real-time update
  broadcastCandidateUpdate(candidate);
}
```

### **Position Management Integration**

```typescript
// In position creation API route
export async function POST(request: NextRequest) {
  // ... create position logic ...
  
  // Create notification for new position
  await createPositionNotification(
    position.id,
    position.title,
    'created',
    { 
      department: position.department,
      createdBy: session.user.name 
    }
  );
  
  // Broadcast real-time update
  broadcastPositionUpdate(position);
}
```

### **User Authentication Integration**

```typescript
// In login API route
export async function POST(request: NextRequest) {
  // ... authentication logic ...
  
  // Create login notification
  await createUserNotification(
    user.id,
    user.name,
    'logged_in',
    { 
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    }
  );
}
```

## 🔧 **API Endpoints**

### **GET /api/realtime/notifications**
Get user's notifications with optional filters.

**Query Parameters:**
- `limit`: Number of notifications to return (default: 50)
- `unread`: Filter to unread only (`true`/`false`)

**Response:**
```json
[
  {
    "id": "notification-123",
    "type": "candidate_update",
    "title": "Candidate Updated",
    "message": "John Doe has been moved to Interview stage",
    "data": { "candidateId": "123", "stage": "Interview" },
    "isRead": false,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### **POST /api/realtime/notifications**
Create a new notification.

**Request Body:**
```json
{
  "type": "candidate_update",
  "title": "Candidate Updated",
  "message": "John Doe has been moved to Interview stage",
  "data": { "candidateId": "123", "stage": "Interview" },
  "targetUserId": "user-456" // Optional, defaults to current user
}
```

### **POST /api/realtime/notifications/{id}/read**
Mark a specific notification as read.

### **POST /api/realtime/notifications/mark-all-read**
Mark all user's notifications as read.

## 🎨 **Customization**

### **Styling Notifications**

The notification system uses the existing design system. You can customize:

1. **Toast Styling**: Modify `src/components/ui/ToastClient.tsx`
2. **Drawer Styling**: Modify `src/components/ui/notification-drawer.tsx`
3. **Icon Styling**: Modify `src/components/ui/notification-icon.tsx`

### **Adding New Notification Types**

1. **Add to Notification Manager Hook:**
```typescript
const notifyNewType = useCallback((
  // ... parameters
) => {
  createLocalNotification({
    type: 'new_type',
    title: 'New Type Title',
    message: 'New type message',
    data: { /* additional data */ }
  });
}, [createLocalNotification]);
```

2. **Add to Utility Functions:**
```typescript
export async function createNewTypeNotification(
  // ... parameters
): Promise<boolean> {
  return createNotification({
    type: 'new_type',
    title: 'New Type Title',
    message: 'New type message',
    data: { /* additional data */ }
  });
}
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Notifications Not Appearing**
1. Check if the NotificationProvider is wrapped around your app
2. Verify SSE connection is established (check browser console)
3. Ensure user is authenticated
4. Check notification API endpoints are working

#### **Real-Time Updates Not Working**
1. Verify SSE endpoint is accessible (`/api/candidates/sse`)
2. Check browser console for SSE connection errors
3. Ensure broadcast functions are being called
4. Verify network connectivity

#### **Performance Issues**
1. Limit notification history (default: 50 notifications)
2. Implement notification cleanup for old notifications
3. Consider pagination for large notification lists
4. Monitor SSE connection count

### **Debug Mode**

Enable debug logging by checking browser console:

```javascript
// Check notification context
console.log('Notifications:', notifications);
console.log('Unread count:', unreadCount);

// Check SSE connection
console.log('SSE Status:', eventSource?.readyState);
```

## 📈 **Future Enhancements**

### **Planned Features**
- **Push Notifications**: Browser push notifications for important events
- **Email Notifications**: Email integration for critical notifications
- **Notification Preferences**: User-configurable notification settings
- **Notification Categories**: Filtering and categorization
- **Rich Notifications**: Images, links, and interactive elements
- **Notification History**: Extended history with search and filtering

### **Performance Improvements**
- **WebSocket Support**: For bi-directional communication
- **Notification Queuing**: Handle high-frequency updates
- **Selective Broadcasting**: Only send relevant notifications
- **Caching**: Cache frequently accessed notification data

## 📚 **Related Documentation**

- [Real-Time Collaboration](./positions-realtime-collaboration.md)
- [Task Board Real-Time Collaboration](./task-board-realtime-collaboration.md)
- [SSE Implementation](../src/lib/candidateSse.ts)
- [Notification Context](../src/contexts/NotificationContext.tsx)
- [Notification Manager Hook](../src/hooks/use-notification-manager.ts)
