# Real-Time Updates for Recruitment Stage Pipeline

## Overview

The recruitment stage pipeline in the candidate detail page now supports real-time updates using Server-Sent Events (SSE). This allows multiple users to see changes to candidate stages, transitions, and notes instantly without refreshing the page.

## Features

### Real-Time Updates
- **Stage Changes**: When a candidate's status is changed, all connected users see the update immediately
- **Transition Notes**: When transition notes are edited, the changes appear instantly for all users
- **Recruitment Stages**: When recruitment stages are reordered or modified, the pipeline updates in real-time
- **Visual Feedback**: A green pulsing indicator shows when real-time updates are active

### Enhanced User Experience
- **Smooth Transitions**: All updates use CSS transitions for smooth visual feedback
- **Loading States**: Individual note edits show loading spinners while updating
- **Optimistic Updates**: Local state updates immediately for better perceived performance
- **Error Handling**: Graceful fallback when SSE connection is lost

## Technical Implementation

### Server-Sent Events (SSE)
The system uses SSE for real-time communication between the server and client:

```typescript
// Client-side SSE connection
const eventSource = new EventSource('/api/candidates/sse');

// Listen for different event types
eventSource.addEventListener('candidate', handleCandidateUpdate);
eventSource.addEventListener('transition', handleTransitionUpdate);
eventSource.addEventListener('recruitment-stages', handleStagesUpdate);
```

### Event Types

1. **Candidate Updates** (`candidate`)
   - Triggered when candidate status changes
   - Updates the current stage indicator

2. **Transition Updates** (`transition`)
   - Triggered when transition records are added, updated, or deleted
   - Updates the transition history and stage completion status

3. **Recruitment Stages Updates** (`recruitment-stages`)
   - Triggered when recruitment stages are reordered or modified
   - Updates the entire stage pipeline

### Broadcasting Events

The server broadcasts events when:
- Candidate status is changed (individual or bulk)
- Transition notes are edited
- Transition records are deleted
- Recruitment stages are reordered

```typescript
// Example: Broadcasting a transition update
broadcastCandidateTransitionUpdate({
  candidateId: candidateId,
  transition: updatedTransition,
  action: 'update'
});
```

## Component Architecture

### StagePipeline Component
The main component that handles real-time updates:

```typescript
interface StagePipelineProps {
  stages: RecruitmentStage[];
  transitionHistory: TransitionRecord[];
  currentStatus: string;
  onStageClick: (stageName: string) => void;
  editableNotes: boolean;
  onNoteEdit: (transitionId: string, newNote: string) => Promise<void>;
  candidateId: string; // Required for SSE filtering
}
```

### Local State Management
The component maintains local state that syncs with server updates:

- `localStages`: Current recruitment stages
- `localTransitionHistory`: Current transition records
- `localCurrentStatus`: Current candidate status
- `isConnected`: SSE connection status

## Usage

### Basic Usage
```tsx
<StagePipeline
  stages={availableStages}
  transitionHistory={transitionHistory}
  currentStatus={candidate.status}
  onStageClick={handleStageClick}
  editableNotes={true}
  onNoteEdit={handleNoteEdit}
  candidateId={candidateId}
/>
```

### Real-Time Features
1. **Automatic Connection**: SSE connection is established automatically when the component mounts
2. **Event Filtering**: Only events for the specific candidate are processed
3. **Graceful Disconnection**: Connection is cleaned up when component unmounts
4. **Reconnection**: Automatic reconnection attempts on connection loss

## Performance Considerations

- **Efficient Updates**: Only relevant data is updated, not entire components
- **Debounced Events**: Rapid updates are batched to prevent UI thrashing
- **Memory Management**: SSE connections are properly cleaned up
- **Error Recovery**: Failed connections are automatically retried

## Browser Support

The real-time features work in all modern browsers that support:
- Server-Sent Events (SSE)
- EventSource API
- ES6+ features

## Troubleshooting

### Connection Issues
- Check browser console for SSE connection errors
- Verify server is running and accessible
- Check network connectivity

### Update Issues
- Ensure candidateId is correctly passed to the component
- Verify server-side broadcasting is working
- Check browser console for event parsing errors

### Performance Issues
- Monitor SSE connection count in server logs
- Check for memory leaks in long-running sessions
- Verify proper cleanup on component unmount 