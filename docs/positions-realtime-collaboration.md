# Positions Real-Time Collaboration

## Overview

The positions page now features comprehensive real-time collaboration capabilities that allow multiple users to see updates instantly when changes are made to positions, statistics, and other position-related data.

## 🚀 **Features**

### ✅ **Real-Time Updates**
- **Position Changes**: See when positions are created, updated, or deleted in real-time
- **Position List Updates**: Get notified when the position list is refreshed
- **Statistics Updates**: Live updates to position statistics (total, open, closed counts)
- **Recruiter Assignments**: Real-time updates when recruiters are assigned to positions
- **Status Changes**: Instant updates when positions are opened or closed

### ✅ **Visual Indicators**
- **Connection Status**: Live/Offline indicator in the positions page header
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
eventSource.addEventListener('position', handlePositionUpdate);
eventSource.addEventListener('position-statistics', handleStatisticsUpdate);
```

### **Event Types**

#### **Position Updates**
```typescript
// Event: position
{
  type: 'position_update',
  positionId: string,
  position: {
    id: string,
    title: string,
    department: string,
    isOpen: boolean,
    // ... other position fields
  }
}
```

#### **Position List Updates**
```typescript
// Event: position
{
  type: 'position_list_update'
}
```

#### **Position Statistics Updates**
```typescript
// Event: position-statistics
{
  type: 'position_statistics_update',
  statistics: {
    total: number,
    open: number,
    closed: number
  }
}
```

## 🎯 **User Experience**

### **Real-Time Notifications**
When another user makes changes, you'll see toast notifications:

- 💼 **Position Updates**: "Position 'Software Engineer' updated"
- 📋 **List Updates**: "Position list updated"
- 📊 **Statistics**: Statistics are updated automatically without notifications

### **Connection Status**
The positions page header shows a real-time connection indicator:

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

const { isConnected } = useRealtimeCollaboration({
  onPositionUpdate: (position) => {
    // Handle position updates
  },
  onPositionListUpdate: () => {
    // Refresh the entire position list
  },
  onPositionStatisticsUpdate: (statistics) => {
    // Update statistics
  }
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
- Regular users see updates based on their role permissions
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
eventSource.addEventListener('position', (e) => {
  console.log('Position update:', JSON.parse(e.data));
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
eventSource.addEventListener('position', handleUpdate);

// After: Using the hook
const { isConnected } = useRealtimeCollaboration({
  onPositionUpdate: handleUpdate
});
```

## 📈 **Future Enhancements**

### **Planned Features**
- **User Presence**: Show who's currently viewing the positions page
- **Typing Indicators**: Show when someone is editing a position
- **Conflict Resolution**: Handle simultaneous edits gracefully
- **Offline Support**: Queue updates when offline
- **Push Notifications**: Browser notifications for important updates

### **Performance Improvements**
- **WebSocket Support**: For bi-directional communication
- **Message Queuing**: Handle high-frequency updates
- **Selective Updates**: Only update changed components
- **Caching**: Cache frequently accessed data

## 📚 **Related Documentation**

- [Task Board Real-Time Collaboration](./task-board-realtime-collaboration.md)
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

## 🔧 **API Integration**

### **Broadcast Functions**
The following broadcast functions are available in `src/lib/candidateSse.ts`:

```typescript
// Broadcast position update
broadcastPositionUpdate(position);

// Broadcast position list update
broadcastPositionListUpdate();

// Broadcast position statistics update
broadcastPositionStatisticsUpdate(statistics);
```

### **Integration Points**
Real-time updates are automatically broadcast from:

1. **Position Creation** (`POST /api/positions`)
2. **Position Updates** (`PUT /api/positions/[id]`)
3. **Position Deletion** (`DELETE /api/positions/[id]`)

### **Statistics Calculation**
Position statistics are calculated in real-time and include:
- **Total Positions**: Count of all positions
- **Open Positions**: Count of positions with `isOpen = true`
- **Closed Positions**: Count of positions with `isOpen = false`

The positions real-time collaboration feature transforms the positions page into a truly collaborative workspace where team members can work together efficiently and stay informed of all changes in real-time.
