#!/usr/bin/env node

/**
 * Consolidate Real-time Endpoints Script
 * Reduces multiple SSE connections to a single unified endpoint
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Consolidating Real-time Endpoints...\n');

// Create a unified real-time hook that replaces multiple SSE connections
const unifiedRealtimeHook = `
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface UnifiedRealtimeOptions {
  onCandidateUpdate?: (candidate: any) => void;
  onPositionUpdate?: (position: any) => void;
  onWarningUpdate?: () => void;
  onNotificationUpdate?: (notification: any) => void;
  onUploadQueueUpdate?: (queue: any) => void;
  onPresenceUpdate?: (presence: any) => void;
}

export function useUnifiedRealtime(options: UnifiedRealtimeOptions = {}) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (healthCheckRef.current) {
      clearTimeout(healthCheckRef.current);
      healthCheckRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!session?.user) return;

    try {
      const eventSource = new EventSource('/api/realtime/unified');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setLastUpdate(new Date());
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        cleanup();
        
        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (session?.user) {
            connect();
          }
        }, 5000);
      };

      // Handle different event types
      eventSource.addEventListener('candidate_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onCandidateUpdate?.(data);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error parsing candidate update:', error);
        }
      });

      eventSource.addEventListener('position_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onPositionUpdate?.(data);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error parsing position update:', error);
        }
      });

      eventSource.addEventListener('warning_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onWarningUpdate?.();
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error parsing warning update:', error);
        }
      });

      eventSource.addEventListener('notification_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onNotificationUpdate?.(data);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error parsing notification update:', error);
        }
      });

      eventSource.addEventListener('upload_queue_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onUploadQueueUpdate?.(data);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error parsing upload queue update:', error);
        }
      });

      eventSource.addEventListener('presence_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onPresenceUpdate?.(data);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error parsing presence update:', error);
        }
      });

      eventSource.addEventListener('keepalive', () => {
        setLastUpdate(new Date());
      });

    } catch (error) {
      console.error('Failed to connect to unified real-time:', error);
      setIsConnected(false);
    }
  }, [session?.user, options, cleanup]);

  useEffect(() => {
    if (session?.user) {
      connect();
    } else {
      cleanup();
    }

    return cleanup;
  }, [session?.user, connect, cleanup]);

  return {
    isConnected,
    lastUpdate,
    reconnect: connect,
    disconnect: cleanup
  };
}
`;

// Create the unified real-time API endpoint
const unifiedApiEndpoint = `
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

const connections = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      connections.set(userId, controller);
      
      // Send initial connection confirmation
      controller.enqueue(encoder.encode(\`data: \${JSON.stringify({ type: 'connected', userId })}\\n\\n\`));
      
      // Send keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(\`event: keepalive\\ndata: \${JSON.stringify({ timestamp: new Date().toISOString() })}\\n\\n\`));
        } catch (error) {
          clearInterval(keepaliveInterval);
          connections.delete(userId);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);
        connections.delete(userId);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Broadcast function for other parts of the application
export function broadcastToUser(userId: string, eventType: string, data: any) {
  const controller = connections.get(userId);
  if (controller) {
    try {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(\`event: \${eventType}\\ndata: \${JSON.stringify(data)}\\n\\n\`));
    } catch (error) {
      connections.delete(userId);
    }
  }
}

// Broadcast to all connected users
export function broadcastToAll(eventType: string, data: any) {
  const encoder = new TextEncoder();
  const message = \`event: \${eventType}\\ndata: \${JSON.stringify(data)}\\n\\n\`;
  
  for (const [userId, controller] of connections.entries()) {
    try {
      controller.enqueue(encoder.encode(message));
    } catch (error) {
      connections.delete(userId);
    }
  }
}
`;

// Create directories if they don't exist
const apiDir = 'src/app/api/realtime/unified';
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
  console.log('📁 Created directory:', apiDir);
}

// Write the files
fs.writeFileSync('src/hooks/use-unified-realtime-optimized.ts', unifiedRealtimeHook);
fs.writeFileSync('src/app/api/realtime/unified/route.ts', unifiedApiEndpoint);

console.log('✅ Created unified real-time hook: src/hooks/use-unified-realtime-optimized.ts');
console.log('✅ Created unified API endpoint: src/app/api/realtime/unified/route.ts');

console.log('\n🚀 Next Steps:');
console.log('1. Replace individual SSE connections with the unified hook');
console.log('2. Update components to use the new unified endpoint');
console.log('3. Test the application with reduced connection count');
console.log('4. Monitor memory usage improvement');

console.log('\n📋 Migration Guide:');
console.log('- Replace useRealtimeCollaboration with useUnifiedRealtime');
console.log('- Replace NotificationContext SSE with unified endpoint');
console.log('- Replace WarningContext SSE with unified endpoint');
console.log('- Replace SidebarNav SSE with unified endpoint');
console.log('- Update all EventSource connections to use the unified endpoint');
