import { useEffect, useRef, useState } from 'react';

type EventData = any;

export function useEventSource(url: string, options?: { withCredentials?: boolean }) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<EventData | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(url, { withCredentials: !!options?.withCredentials });
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        setLastEvent(JSON.parse(e.data));
      } catch {
        setLastEvent(e.data);
      }
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [url, options?.withCredentials]);

  return { connected, lastEvent };
}


