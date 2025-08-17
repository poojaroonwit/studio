# Task Board Real-Time Collaboration

## Overview

The task board now features comprehensive real-time collaboration capabilities that allow multiple users to see updates instantly when changes are made to candidates, statuses, comments, and other data.

## 🚀 **Features**

### ✅ **Real-Time Updates**
- **Candidate Status Changes**: See when candidates are moved between stages in real-time
- **New Comments**: Get notified when team members add comments to candidates
- **Resume Uploads**: Real-time notifications when resumes are uploaded
- **Attachments**: Instant updates when new attachments are added
- **Recruitment Stage Changes**: Live updates when stages are modified
- **Candidate Updates**: Any candidate data changes are reflected immediately

### ✅ **Visual Indicators**
- **Connection Status**: Live/Offline indicator in the task board header
- **Toast Notifications**: Non-intrusive notifications for real-time events
- **Animated Elements**: Visual feedback for active collaboration

### ✅ **Cross-User Collaboration**
- **Multi-User Support**: Multiple users can collaborate simultaneously
- **Permission-Aware**: Updates respect user permissions and visibility
- **Conflict Resolution**: Smart handling of concurrent updates

## 🔧 **Technical Implementation**

### **Server-Sent Events (SSE)**
The real-time collaboration uses Server-Sent Events for efficient, one-way communication from server to client.

```typescript
// Connection to SSE endpoint
const eventSource = new EventSource('/api/candidates/sse');

// Listen for different event types
eventSource.addEventListener('candidate', handleCandidateUpdate);
eventSource.addEventListener('transition', handleTransitionUpdate);
eventSource.addEventListener('comment', handleCommentUpdate);
```

### **Event Types**

#### **Candidate Updates**
```typescript
// Event: candidate
{
  type: 'candidate_update',
  candidate: {
    id: string,
    name: string,
    status: string,
    // ... other candidate fields
  }
}
```

#### **Status Transitions**
```typescript
// Event: transition
{
  type: 'transition_update',
  transition: {
    candidateId: string,
    stage: string,
    notes: string,
    actingUserId: string
  }
}
```

#### **Comments**
```typescript
// Event: comment
{
  type: 'comment_update',
  comment: {
    id: string,
    candidateId: string,
    content: string,
    createdBy: string
  }
}
```

#### **Resume Uploads**
```typescript
// Event: resume
{
  type: 'resume_update',
  resume: {
    id: string,
    candidateId: string,
    fileName: string,
    uploadedBy: string
  }
}
```

#### **Attachments**
```typescript
// Event: attachment
{
  type: 'attachment_update',
  attachment: {
    id: string,
    candidateId: string,
    fileName: string,
    uploadedBy: string
  }
}
```

#### **Recruitment Stages**
```typescript
// Event: recruitment-stages
[
  { id: string, name: string, order: number },
  // ... more stages
]
```

## 🎯 **User Experience**

### **Real-Time Notifications**
When another user makes changes, you'll see toast notifications:

- 🔄 **Status Changes**: "Candidate John Doe moved to Interviewing"
- 📋 **Stage Updates**: "Status updated: Shortlisted"
- 💬 **Comments**: "New comment added by Sarah Johnson"
- 📄 **Resumes**: "Resume uploaded for candidate"
- 📎 **Attachments**: "New attachment added"

### **Connection Status**
The task board header shows a real-time connection indicator:

- 🟢 **Green dot + "Live"**: Connected and receiving updates
- 🔴 **Red dot + "Offline"**: Connection lost, attempting to reconnect

### **Automatic Reconnection**
If the connection is lost, the system automatically:
1. Shows an error notification
2. Attempts to reconnect
3. Restores the connection when possible

## 🛠 **Implementation Details**

### **Custom Hook: `useRealtimeCollaboration`**
```typescript
import { useRealtimeCollaboration } from '@/hooks/use-realtime-collaboration';

const { isConnected, lastUpdate } = useRealtimeCollaboration({
  onCandidateUpdate: (candidate) => {
    // Handle candidate updates
  },
  onTransitionUpdate: (transition) => {
    // Handle status changes
  },
  onCommentUpdate: (comment) => {
    // Handle new comments
  },
  showNotifications: true
});
```

### **Reusable Component: `RealtimeIndicator`**
```typescript
import { RealtimeIndicator } from '@/components/ui/realtime-indicator';

<RealtimeIndicator 
  isConnected={isConnected}
  size="sm"
  showText={true}
/>
```

### **API Endpoints**
- **SSE Connection**: `/api/candidates/sse`
- **Broadcast Functions**: Available in `src/lib/candidateSse.ts`

## 📊 **Performance Considerations**

### **Optimizations**
- **Efficient Updates**: Only relevant data is sent over SSE
- **Debounced Updates**: Prevents excessive notifications
- **Connection Management**: Automatic cleanup and reconnection
- **Memory Management**: Proper cleanup of event listeners

### **Scalability**
- **Connection Pooling**: Efficient handling of multiple connections
- **Event Filtering**: Only send relevant events to connected clients
- **Rate Limiting**: Prevents abuse of real-time features

## 🔒 **Security & Permissions**

### **Permission-Aware Updates**
- Users only receive updates for data they have permission to view
- Admin users see all updates
- Recruiters see updates for their assigned candidates
- Permission changes are reflected in real-time

### **Data Validation**
- All real-time updates are validated server-side
- Malicious data is filtered out
- Audit logs track all real-time activities

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Connection Lost**
**Symptoms**: Red indicator, no real-time updates
**Solutions**:
1. Check internet connection
2. Refresh the page
3. Check browser console for errors
4. Verify server is running

#### **No Real-Time Updates**
**Symptoms**: Green indicator but no notifications
**Solutions**:
1. Check user permissions
2. Verify other users are making changes
3. Check browser console for SSE errors
4. Test with different browser

#### **Excessive Notifications**
**Symptoms**: Too many toast notifications
**Solutions**:
1. Adjust notification settings in the hook
2. Filter notifications by user preference
3. Implement notification throttling

### **Debug Mode**
Enable debug logging by checking browser console:
```javascript
// Check SSE connection status
console.log('SSE Status:', eventSource.readyState);

// Monitor real-time events
eventSource.addEventListener('candidate', (e) => {
  console.log('Candidate update:', JSON.parse(e.data));
});
```

## 🔄 **Migration Guide**

### **For Existing Implementations**
If you have existing real-time code:

1. **Replace manual SSE setup** with `useRealtimeCollaboration` hook
2. **Use `RealtimeIndicator`** component for connection status
3. **Update event handlers** to use the new callback system
4. **Test thoroughly** to ensure all events are handled

### **Example Migration**
```typescript
// Before: Manual SSE setup
const eventSource = new EventSource('/api/candidates/sse');
eventSource.addEventListener('candidate', handleUpdate);

// After: Using the hook
const { isConnected } = useRealtimeCollaboration({
  onCandidateUpdate: handleUpdate
});
```

## 📈 **Future Enhancements**

### **Planned Features**
- **User Presence**: Show who's currently viewing the task board
- **Typing Indicators**: Show when someone is adding a comment
- **Conflict Resolution**: Handle simultaneous edits gracefully
- **Offline Support**: Queue updates when offline
- **Push Notifications**: Browser notifications for important updates

### **Performance Improvements**
- **WebSocket Support**: For bi-directional communication
- **Message Queuing**: Handle high-frequency updates
- **Selective Updates**: Only update changed components
- **Caching**: Cache frequently accessed data

## 📚 **Related Documentation**

- [Task Board Permissions](./task-board-permissions.md)
- [Azure AD Task Board Troubleshooting](./azure-ad-task-board-troubleshooting.md)
- [Task Board Drag and Drop Troubleshooting](./task-board-drag-drop-troubleshooting.md)
- [SSE Implementation](../src/lib/candidateSse.ts)
- [Real-time Hook](../src/hooks/use-realtime-collaboration.ts)

## 🎉 **Benefits**

### **For Teams**
- **Improved Collaboration**: See changes instantly
- **Reduced Conflicts**: Real-time awareness prevents duplicate work
- **Better Communication**: Instant feedback on actions
- **Increased Productivity**: No need to refresh or poll for updates

### **For Users**
- **Seamless Experience**: Changes appear automatically
- **Visual Feedback**: Clear indication of what's happening
- **Reliable Connection**: Automatic reconnection handling
- **Permission Respect**: Only see relevant updates

The real-time collaboration feature transforms the task board into a truly collaborative workspace where team members can work together efficiently and stay informed of all changes in real-time.
