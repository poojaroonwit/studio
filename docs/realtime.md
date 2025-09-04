# Realtime (SSE) Guide

This app uses a minimal Server-Sent Events (SSE) hub for realtime updates.

## Server

- Hub: `src/lib/realtime.ts`
  - `subscribe(request: Request): Response` — returns a streaming SSE `Response`
  - `broadcast(data: unknown, event?: string)` — sends an event to all connected clients
  - `getConnectionCount()` — current connection count

## Route

- `src/app/api/sse/route.ts`:
  - `GET` returns `subscribe(request)`
  - Headers are set for SSE with `Transfer-Encoding: identity` and keepalive

## Client

- Hook: `src/hooks/useEventSource.ts`

```tsx
import { useEventSource } from '@/hooks/useEventSource';

export default function RealtimeWidget() {
  const { connected, lastEvent } = useEventSource('/api/sse');
  return (
    <div>
      <div>Status: {connected ? 'connected' : 'disconnected'}</div>
      <pre>{JSON.stringify(lastEvent, null, 2)}</pre>
    </div>
  );
}
```

## Broadcasting

```ts
import { broadcast } from '@/lib/realtime';

broadcast({ type: 'notification', message: 'hello world' }, 'notification');
```

## Change Detection

Use `src/lib/data-change-tracker.ts` to avoid noisy events. Helpers include:
- `broadcastCandidateUpdateIfChanged`
- `broadcastPositionUpdateIfChanged`
- `broadcastUploadQueueUpdateIfChanged`
- `broadcastDashboardUpdateIfChanged`

These enforce minimal intervals and only emit when data meaningfully changes.

## Keepalive

- Keepalive comment frames are sent every 1s to keep proxies/browsers aware the stream is alive.

## Notes

- Global broadcast only by default. For per-user streams, extend the hub with a `Map<userId, Set<controller>>` and add a lightweight auth check.
- Avoid sending large payloads frequently; prefer small, typed events.
