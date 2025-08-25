# Realtime Updates Implementation

## Overview

The candidate page now supports realtime updates using Server-Sent Events (SSE) to provide live collaboration features.

## Features Implemented

### 1. User Presence System
- **Live User Presence**: Shows all online users with overlapping avatars in the header
- **Current Page Tracking**: Displays which page each user is currently viewing
- **Online/Offline Status**: Real-time status with green indicators for online users
- **Offline User Display**: Shows grey transparent avatars for users who signed out (visible for 6 hours)
- **Hover Information**: Tooltips show user name, role, current page, and last online time
- **Expandable View**: Click to see all users when there are more than 5
- **Automatic Updates**: Presence updates every 30 seconds, data refreshes every 10 seconds

### 2. Main Candidates Page (`/candidates`)
- **Realtime Status Indicator**: Shows connection status at the top of the page
- **Live Candidate Updates**: Automatically updates candidate data when changes occur
- **Status Transitions**: Real-time updates when candidates move between stages
- **Recruitment Stages**: Live updates when recruitment stages are modified

### 2. Individual Candidate Detail Page (`/candidates/[id]`)
- **Live Candidate Data**: Real-time updates to candidate information
- **Comment Updates**: Live updates when new comments are added
- **Attachment Updates**: Real-time updates when attachments are added/modified
- **Status Indicator**: Shows realtime connection status in the header

### 3. My Tasks Page (`/my-tasks`)
- **Live Task Updates**: Real-time updates to candidate data and status changes
- **Status Transitions**: Live updates when candidates move between stages
- **Recruitment Stages**: Live updates when stage configurations change
- **Status Indicator**: Shows realtime connection status at the top of the page

### 4. Dashboard Page (`/dashboard`)
- **Live Metrics**: Real-time updates to all dashboard statistics and metrics
- **Candidate Updates**: Live updates to candidate data across all dashboard sections
- **Position Updates**: Real-time updates to position data and statistics
- **Status Transitions**: Live updates when candidates move between stages
- **Status Indicator**: Shows realtime connection status at the top of the page

## Technical Implementation

### Components Updated

1. **User Presence System**
   - **useUserPresence.ts**: Hook for managing user presence data and updates
   - **UserPresenceIndicator.tsx**: Component displaying overlapping user avatars with tooltips
   - **Header.tsx**: Integrated user presence indicator to the left of warning icon
   - **presence/route.ts**: API endpoints for managing user presence data

2. **CandidatesPageClient.tsx**
   - Added `useRealtimeCollaboration` hook
   - Implemented realtime status indicator
   - Added handlers for candidate updates, transitions, and stage updates

2. **CandidateDetailView.tsx**
   - Added realtime collaboration for individual candidate views
   - Handles comment and attachment updates

3. **useCandidateDetail.ts**
   - Added realtime updates to candidate detail hook
   - Implements live candidate data updates
   - Added transition history refresh on updates

4. **CandidateHeader.tsx**
   - Added realtime status indicator in header
   - Shows connection status with visual indicator

5. **MyTasksPageClient.tsx**
   - Added realtime status indicator at the top of the page
   - Enhanced existing realtime collaboration with visual feedback

6. **DashboardPageClient.tsx**
   - Added `useRealtimeCollaboration` hook
   - Implemented realtime status indicator
   - Added handlers for candidate updates, position updates, and transitions
   - Live updates to all dashboard metrics and statistics

### Realtime Events Handled

- **Candidate Updates**: When candidate data is modified
- **Status Transitions**: When candidates move between recruitment stages
- **Comments**: When new comments are added to candidates
- **Attachments**: When files are uploaded or modified
- **Recruitment Stages**: When stage configurations change

### Connection Status

The realtime system provides visual feedback on connection status:

- 🟢 **Green**: Connected and receiving live updates
- 🟡 **Yellow**: Reconnecting (with attempt counter)
- 🔴 **Red**: Disconnected from realtime service

## Usage

### For Users
1. **User Presence**: See overlapping avatars in the header showing all online users
2. **Hover for Details**: Hover over any avatar to see user name, role, and current page
3. **Offline Users**: Grey transparent avatars show users who signed out recently
4. **Expand View**: Click the "+" button to see all users when there are more than 5
5. **Navigate to any page** with realtime updates (candidates, positions, my tasks, dashboard)
6. **Look for the realtime status indicator** at the top
7. **When connected (green indicator)**, you'll receive live updates
8. **Changes made by other users** will appear automatically
9. **All metrics, statistics, and data** will update in real-time

### For Developers
The realtime system uses the existing SSE infrastructure:

```typescript
// Example usage in components
const { isConnected: realtimeConnected } = useRealtimeCollaboration({
  onCandidateUpdate: (updatedCandidate) => {
    // Handle candidate updates
  },
  onTransitionUpdate: (transition) => {
    // Handle status transitions
  },
  showNotifications: true,
  showErrorNotifications: false
});
```

## Benefits

1. **Real-time Collaboration**: Multiple users can see changes instantly
2. **Improved User Experience**: No need to manually refresh pages
3. **Visual Feedback**: Clear indication of connection status
4. **Automatic Recovery**: Handles connection drops and reconnections
5. **Performance**: Efficient updates without full page refreshes

## Configuration

The realtime system can be configured through the `useRealtimeCollaboration` hook options:

- `showNotifications`: Enable/disable toast notifications
- `showErrorNotifications`: Enable/disable error notifications
- `maxReconnectAttempts`: Maximum reconnection attempts
- `reconnectDelayMs`: Delay between reconnection attempts
- `maxReconnectDelayMs`: Maximum delay between attempts

## Troubleshooting

### Common Issues

1. **Connection Lost**: Check network connectivity and server status
2. **Updates Not Appearing**: Verify realtime status indicator is green
3. **Performance Issues**: Check for excessive reconnection attempts

### Debug Information

The realtime system logs connection events to the browser console:
- Connection established/lost
- Reconnection attempts
- Error messages
- Update events received
