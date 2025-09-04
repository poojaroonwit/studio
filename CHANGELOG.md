## Realtime SSE Migration (2025-09-04)

- Replaced unified/enhanced/robust SSE managers with a simple SSE hub.
- New server hub: `src/lib/realtime.ts` with `subscribe(request)` and `broadcast(data, event?)`.
- `/api/sse` now returns `subscribe(request)`.
- Client: use `useEventSource('/api/sse')` from `src/hooks/useEventSource.ts`.
- Docs updated; legacy files removed.

Notes
- Broadcasts are event-driven with change detection in `src/lib/data-change-tracker.ts`.
- Keepalive interval is 1s to maintain stable proxies and visibility.
- Per-user targeting is not included by default; can be added if required.


