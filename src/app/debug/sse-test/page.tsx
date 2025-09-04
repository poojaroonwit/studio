"use client";
import { useEventSource } from '@/hooks/useEventSource';

export default function SSETestPage() {
  const { connected, lastEvent } = useEventSource('/api/sse');
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 space-y-4">
        <h1 className="text-2xl font-semibold">SSE Debug</h1>
        <div className="p-4 rounded border bg-white">Status: {connected ? 'connected' : 'disconnected'}</div>
        <pre className="p-4 rounded border bg-white overflow-auto text-sm">{JSON.stringify(lastEvent, null, 2)}</pre>
      </div>
    </div>
  );
}
