# Simple SSE Implementation Guide

## Why Simplify SSE?

The original SSE implementation was overly complex with:
- Multiple connection managers
- Complex retry mechanisms
- Connection pooling
- Extensive error handling layers
- Hard to debug and maintain

**The new simple SSE system is:**
- ✅ Easy to understand (under 200 lines total)
- ✅ Easy to debug
- ✅ Follows best practices
- ✅ Maintainable
- ✅ Performant

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Hook   │    │   SSE Route     │    │  Broadcasting   │
│  useSimpleSSE   │◄──►│   /api/sse      │◄──►│   Utility       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Files Structure

```
src/
├── lib/
│   ├── simple-sse.ts          # Core SSE implementation
│   └── simple-broadcaster.ts  # Broadcasting utilities
├── hooks/
│   └── use-simple-sse.ts      # Client-side hooks
├── app/api/
│   └── sse/route.ts           # SSE endpoint
└── components/ui/
    └── simple-sse-status.tsx  # Example component
```

## Server-Side Implementation

### 1. Core SSE Handler (`src/lib/simple-sse.ts`)

```typescript
// Simple connection store
const connections = new Map<string, ReadableStreamDefaultController>();

// Broadcast to all users
export function broadcastToAll(eventType: SSEEventType, data: any) {
  broadcastEvent({
    type: eventType,
    data,
    timestamp: new Date().toISOString()
  });
}

// Broadcast to specific user
export function broadcastToUser(userId: string, eventType: SSEEventType, data: any) {
  broadcastEvent({
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
    targetUserId: userId
  });
}
```

### 2. Broadcasting Utilities (`src/lib/simple-broadcaster.ts`)

```typescript
// Easy-to-use broadcasting functions
export function broadcastCandidateUpdate(candidate: any, actingUserId?: string) {
  broadcastToAll('candidate_update', {
    candidate,
    actingUserId,
    action: 'updated',
    timestamp: new Date().toISOString()
  });
}

export function broadcastNotification(message: string, type: string = 'info', targetUserId?: string) {
  const notification = {
    message,
    type,
    timestamp: new Date().toISOString()
  };

  if (targetUserId) {
    broadcastToUser(targetUserId, 'notification', notification);
  } else {
    broadcastToAll('notification', notification);
  }
}
```

## Client-Side Implementation

### 1. Basic Hook (`src/hooks/use-simple-sse.ts`)

```typescript
export function useSimpleSSE() {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Automatic reconnection with exponential backoff
  // Error handling
  // Connection management

  return {
    isConnected,
    lastMessage,
    error,
    reconnect,
    disconnect
  };
}
```

### 2. Specialized Hooks

```typescript
// For candidate updates
export function useCandidateUpdates() {
  const { isConnected, lastMessage } = useSimpleSSE();
  const [candidateUpdates, setCandidateUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (lastMessage?.type === 'candidate_update') {
      setCandidateUpdates(prev => [...prev, lastMessage.data]);
    }
  }, [lastMessage]);

  return {
    isConnected,
    candidateUpdates,
    latestUpdate: lastMessage?.type === 'candidate_update' ? lastMessage.data : null
  };
}

// For notifications
export function useNotifications() {
  // Similar implementation for notifications
}

// For upload queue updates
export function useUploadQueueUpdates() {
  // Similar implementation for upload queue
}
```

## Usage Examples

### 1. Basic Usage in Component

```typescript
import { useSimpleSSE } from '@/hooks/use-simple-sse';

function MyComponent() {
  const { isConnected, lastMessage, error, reconnect } = useSimpleSSE();

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {error && <div>Error: {error}</div>}
      {lastMessage && <div>Last: {JSON.stringify(lastMessage)}</div>}
      <button onClick={reconnect}>Reconnect</button>
    </div>
  );
}
```

### 2. Specialized Usage

```typescript
import { useCandidateUpdates, useNotifications } from '@/hooks/use-simple-sse';

function CandidateList() {
  const { candidateUpdates, latestUpdate } = useCandidateUpdates();
  const { notifications } = useNotifications();

  return (
    <div>
      <h2>Candidates ({candidateUpdates.length} updates)</h2>
      {latestUpdate && (
        <div>Latest: {latestUpdate.action} - {latestUpdate.candidate.name}</div>
      )}
      <h3>Notifications ({notifications.length})</h3>
    </div>
  );
}
```

### 3. Broadcasting from Server

```typescript
import { broadcastCandidateUpdate, broadcastNotification } from '@/lib/simple-broadcaster';

// In your API route or server function
export async function updateCandidate(candidateId: string, data: any, userId: string) {
  // Update candidate in database
  const updatedCandidate = await updateCandidateInDB(candidateId, data);
  
  // Broadcast the update
  broadcastCandidateUpdate(updatedCandidate, userId);
  
  // Send notification
  broadcastNotification('Candidate updated successfully', 'success', userId);
  
  return updatedCandidate;
}
```

## Best Practices

### 1. Event Types
- Use consistent event types: `candidate_update`, `position_update`, `notification`, etc.
- Keep event data structure consistent
- Always include timestamps

### 2. Error Handling
- The system automatically handles connection errors
- Implements exponential backoff for reconnections
- Provides error state to components

### 3. Performance
- Single connection per user
- Automatic cleanup on unmount
- Efficient message parsing

### 4. Security
- Authentication required for connections
- User-specific broadcasting available
- CORS properly configured

## Migration from Complex SSE

### Before (Complex):
```typescript
// Multiple files, complex setup
import { useSimpleSSE } from '@/hooks/use-simple-sse';

const { isConnected, lastMessage, error, reconnect } = useSimpleSSE();
  onCandidateUpdate: (candidate) => { /* complex logic */ },
  onPositionUpdate: (position) => { /* complex logic */ },
  // ... many more options
});
```

### After (Simple):
```typescript
// Single hook, simple setup
import { useCandidateUpdates } from '@/hooks/use-simple-sse';

const { isConnected, candidateUpdates, latestUpdate } = useCandidateUpdates();
```

## Benefits of Simple SSE

1. **Easier to Understand**: Clear, linear code flow
2. **Easier to Debug**: Fewer layers, clearer error messages
3. **Easier to Maintain**: Less code, fewer dependencies
4. **Better Performance**: No complex connection pooling overhead
5. **More Reliable**: Simpler error handling, fewer edge cases

## Troubleshooting

### Common Issues

1. **Connection not established**
   - Check authentication
   - Verify `/api/sse` endpoint is accessible
   - Check browser console for errors

2. **Messages not received**
   - Verify event types match
   - Check server-side broadcasting calls
   - Ensure proper JSON formatting

3. **Reconnection loops**
   - Check network connectivity
   - Verify server is running
   - Check authentication status

### Debug Tools

```typescript
// Add to your component for debugging
const { isConnected, lastMessage, error } = useSimpleSSE();

console.log('SSE Status:', { isConnected, error, lastMessage });
```

## Performance Considerations

- **Connection Limits**: No artificial limits, browser handles it
- **Memory Usage**: Minimal overhead, automatic cleanup
- **Network**: Efficient HTTP/1.1 keep-alive
- **Scalability**: Works well for typical web applications

## Future Enhancements

The simple SSE system can be extended with:
- Message queuing for offline scenarios
- Message acknowledgment
- Custom event types
- Advanced filtering

But start simple and add complexity only when needed!
