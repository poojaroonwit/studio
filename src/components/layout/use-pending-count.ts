"use client";

import * as React from "react";
import {
  PENDING_COUNT_POLL_INTERVAL_MS,
  parsePendingCountSsePayload,
  shouldOpenPendingCountEventSource,
} from "./pending-count-utils";
import { fetchPendingCountState } from "./pending-count-api";

export function usePendingCount() {
  const [pendingCount, setPendingCount] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
  const eventSourceRef = React.useRef<EventSource | null>(null);
  const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        setIsLoading(true);
        const nextState = await fetchPendingCountState();
        setPendingCount(nextState.pendingCount);
        setHasPermission(nextState.hasPermission);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingCount();
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(fetchPendingCount, PENDING_COUNT_POLL_INTERVAL_MS);

    if (shouldOpenPendingCountEventSource(hasPermission)) {
      try {
        const eventSource = new EventSource("/api/sse");
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
          try {
            const nextPendingCount = parsePendingCountSsePayload(event.data);
            if (nextPendingCount !== null) {
              setPendingCount(nextPendingCount);
            }
          } catch (error) {
            console.warn("[PENDING_COUNT] Failed to parse SSE payload:", error);
          }
        };

        eventSource.onerror = () => {};
      } catch (error) {}
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [hasPermission]);

  return { pendingCount, isLoading };
}
