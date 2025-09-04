// Unified Connection Manager - Single connection per user
// Consolidates all SSE endpoints and database connections to prevent connection exhaustion

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';

// User connection interface
interface UserConnection {
  userId: string;
  controller: ReadableStreamDefaultController;
  dbClient?: any; // Database client for this user
  lastActivity: number;
  keepaliveInterval?: NodeJS.Timeout;
  connectionStartTime: number;
}

// Event types for unified system
export type UnifiedEventType = 
  | 'candidate_update'
  | 'position_update'
  | 'notification'
  | 'upload_queue_update'
  | 'dashboard_update'
  | 'keepalive'
  | 'connected';

// Unified event interface
export interface UnifiedEvent {
  type: UnifiedEventType;
  data: any;
  timestamp: string;
  targetUserId?: string;
}

// Global connection store - one connection per user
const userConnections = new Map<string, UserConnection>();

// ✅ REMOVED: No more persistent database connections per user
// Database operations now use withDbClient wrapper for proper connection management

// Unified broadcast function
export function broadcastUnifiedEvent(event: UnifiedEvent) {

  const encoder = new TextEncoder();
  const message = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  const encodedMessage = encoder.encode(message);

  if (event.targetUserId) {
    // Send to specific user
    const connection = userConnections.get(event.targetUserId);
    if (connection) {
      try {
        connection.controller.enqueue(encodedMessage);
        connection.lastActivity = Date.now();

      } catch (error) {
        console.error(`[UNIFIED] Failed to send ${event.type} to user ${event.targetUserId}:`, error);
        removeUserConnection(event.targetUserId);
      }
    }
  } else {
    // Broadcast to all users
    for (const [userId, connection] of userConnections.entries()) {
      try {
        connection.controller.enqueue(encodedMessage);
        connection.lastActivity = Date.now();

      } catch (error) {
        console.error(`[UNIFIED] Failed to broadcast ${event.type} to user ${userId}:`, error);
        removeUserConnection(userId);
      }
    }
  }
}

// Convenience functions for common event types
export function broadcastToAll(eventType: UnifiedEventType, data: any) {
  broadcastUnifiedEvent({
    type: eventType,
    data,
    timestamp: new Date().toISOString()
  });
}

export function broadcastToUser(userId: string, eventType: UnifiedEventType, data: any) {
  broadcastUnifiedEvent({
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
    targetUserId: userId
  });
}



// Connection management
function addUserConnection(userId: string, controller: ReadableStreamDefaultController) {
  const connection: UserConnection = {
    userId,
    controller,
    lastActivity: Date.now(),
    connectionStartTime: Date.now()
  };
  
  userConnections.set(userId, connection);

}

function removeUserConnection(userId: string) {
  const connection = userConnections.get(userId);
  if (connection) {
    // Cleanup keepalive interval
    if (connection.keepaliveInterval) {
      clearInterval(connection.keepaliveInterval);
    }
    
    // No more explicit release here as withDbClient handles it
    
    // Remove connection
    userConnections.delete(userId);

  }
}

// Get connection stats
export function getUnifiedConnectionStats() {
  return {
    totalConnections: userConnections.size,
    connectedUsers: Array.from(userConnections.keys())
  };
}

// Database operations with user connection
export async function withUserDbClient<T>(userId: string, operation: (client: any) => Promise<T>): Promise<T> {
  // ✅ FIXED: Use the existing withDbClient wrapper for proper connection management
  const { withDbClient } = await import('@/lib/db');
  return withDbClient(operation);
}

// Upload queue data fetcher using user's database connection
export async function getUploadQueueDataForUser(userId: string, queryParams?: any) {
  return withUserDbClient(userId, async (client) => {
    const { fileName, status, dateStart, dateEnd, positionId, limit = 20, offset = 0 } = queryParams || {};
    
    // Build WHERE clause
    const whereClauses = [];
    const values = [];
    let paramIdx = 1;
    
    if (fileName) {
      whereClauses.push(`uq.file_name ILIKE $${paramIdx++}`);
      values.push(`%${fileName}%`);
    }
    if (status) {
      const statusCodes = status.split(',').map((s: string) => s.trim());
      if (statusCodes.length === 1) {
        whereClauses.push(`uq.status = $${paramIdx++}`);
        values.push(status);
      } else {
        const placeholders = statusCodes.map(() => `$${paramIdx++}`).join(', ');
        whereClauses.push(`uq.status IN (${placeholders})`);
        values.push(...statusCodes);
      }
    }
    if (dateStart) {
      whereClauses.push(`uq.upload_date >= $${paramIdx++}`);
      values.push(dateStart);
    }
    if (dateEnd) {
      whereClauses.push(`uq.upload_date <= $${paramIdx++}`);
      values.push(dateEnd);
    }
    if (positionId) {
      whereClauses.push(`uq.position_id = $${paramIdx++}`);
      values.push(positionId);
    }
    
    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    // Validate pagination parameters (no upper limit on records)
    const safeLimit = Math.max(limit, 1); // Minimum 1, no maximum limit
    const safeOffset = Math.max(offset, 0);
    
    values.push(safeLimit, safeOffset);
    
    // Get upload queue data
    const res = await client.query(
      `SELECT uq.*, p.title as position_title 
       FROM upload_queue uq 
       LEFT JOIN "Position" p ON uq.position_id = p.id 
       ${whereSQL} ORDER BY uq.upload_date DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      values
    );
    
    // Get count
    const countRes = await client.query(
      `SELECT COUNT(*) 
       FROM upload_queue uq 
       LEFT JOIN "Position" p ON uq.position_id = p.id 
       ${whereSQL}`,
      values.slice(0, values.length - 2)
    );
    
    // Get summary
    const summaryRes = await client.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE uq.status = 'queued') as queued,
        COUNT(*) FILTER (WHERE uq.status = 'inprocess') as inprocess,
        COUNT(*) FILTER (WHERE uq.status = 'success') as success,
        COUNT(*) FILTER (WHERE uq.status = 'failed') as error
      FROM upload_queue uq 
      LEFT JOIN "Position" p ON uq.position_id = p.id 
      ${whereSQL}`,
      values.slice(0, values.length - 2)
    );
    
    const summary = summaryRes.rows[0];
    const safeSummary = {
      total: Number(summary.total) || 0,
      queued: Number(summary.queued) || 0,
      inprocess: Number(summary.inprocess) || 0,
      success: Number(summary.success) || 0,
      error: Number(summary.error) || 0,
    };
    
    const total = Number(countRes.rows[0]?.count) || 0;
    
    return {
      jobs: res.rows,
      total,
      summary: safeSummary,
      statusSummary: safeSummary,
      pagination: {
        page: Math.floor(safeOffset / safeLimit) + 1,
        limit: safeLimit,
        offset: safeOffset,
        totalPages: Math.ceil(total / safeLimit),
        hasNextPage: safeOffset + safeLimit < total,
        hasPrevPage: safeOffset > 0
      }
    };
  });
}

// Dashboard data fetcher using user's database connection
export async function getDashboardDataForUser(userId: string) {
  return withUserDbClient(userId, async (client) => {
    // Get basic dashboard statistics
    const statsRes = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM "Candidate") as total_candidates,
        (SELECT COUNT(*) FROM "Position") as total_positions,
        (SELECT COUNT(*) FROM upload_queue WHERE status = 'queued') as queued_uploads,
        (SELECT COUNT(*) FROM upload_queue WHERE status = 'inprocess') as processing_uploads
    `);
    
    return {
      stats: statsRes.rows[0],
      timestamp: new Date().toISOString()
    };
  });
}

// Unified SSE connection handler
export async function handleUnifiedSSEConnection(request: Request) {
  console.log('[UNIFIED] New SSE connection request received');
  
  try {
    // Authenticate user with better error handling
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionError) {
      console.error('[UNIFIED] Session authentication error:', sessionError);
      return new Response(JSON.stringify({
        error: 'Authentication failed',
        message: 'Session validation error',
        timestamp: new Date().toISOString()
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const userId = session?.user?.id;

    if (!userId) {
      console.log('[UNIFIED] Authentication failed - no user session');
      return new Response(JSON.stringify({
        error: 'Authentication required',
        message: 'No valid user session found',
        timestamp: new Date().toISOString()
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user already has a connection
    if (userConnections.has(userId)) {
      console.log(`[UNIFIED] User ${userId} already has a connection, replacing old one`);
      removeUserConnection(userId);
    }

    console.log(`[UNIFIED] User ${userId} authenticated successfully`);

    const encoder = new TextEncoder();
    let keepaliveInterval: NodeJS.Timeout;
    let connectionAlive = true;

    const stream = new ReadableStream({
      start(controller) {
        // console.log(`[UNIFIED] Starting unified stream for user ${userId}`);
        
        // Add connection
        addUserConnection(userId, controller);
        // console.log(`[UNIFIED] User ${userId} SSE connection established`);

        // Send initial connection confirmation
        const initialData = JSON.stringify({
          type: 'connected',
          message: 'Unified SSE connection established',
          timestamp: new Date().toISOString(),
          userId,
          connectionId: `${userId}-${Date.now()}`,
          features: ['candidates', 'positions', 'notifications', 'upload_queue', 'dashboard']
        });
        
        try {
          controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));
        } catch (error) {
          console.error(`[UNIFIED] Failed to send initial data to user ${userId}:`, error);
          connectionAlive = false;
          return;
        }

        // Send keepalive every 1 second for optimal stability
        keepaliveInterval = setInterval(() => {
          if (!connectionAlive) {
            clearInterval(keepaliveInterval);
            return;
          }
          
          try {
            const keepaliveData = JSON.stringify({
              type: 'keepalive',
              timestamp: new Date().toISOString(),
              uptime: Date.now() - userConnections.get(userId)!.connectionStartTime,
              connectionId: `${userId}-${Date.now()}`
            });
            
            // Use proper SSE format with explicit event type
            const keepaliveMessage = `event: keepalive\ndata: ${keepaliveData}\n\n`;
            controller.enqueue(encoder.encode(keepaliveMessage));
            
            // Update last activity
            const connection = userConnections.get(userId);
            if (connection) {
              connection.lastActivity = Date.now();
            }
            
            // console.log(`[UNIFIED] Keepalive sent to user ${userId}`);
          } catch (error) {
            console.error(`[UNIFIED] Keepalive failed for user ${userId}:`, error);
            connectionAlive = false;
            clearInterval(keepaliveInterval);
            removeUserConnection(userId);
          }
        }, 1000); // 1 second for optimal stability

        // Store keepalive interval reference
        const connection = userConnections.get(userId);
        if (connection) {
          connection.keepaliveInterval = keepaliveInterval;
        }

        // Cleanup on connection close
        request.signal.addEventListener('abort', () => {
          // console.log(`[UNIFIED] Connection aborted for user ${userId}`);
          connectionAlive = false;
          clearInterval(keepaliveInterval);
          removeUserConnection(userId);
          try { controller.close(); } catch (e) {
            console.error(`[UNIFIED] Error closing controller for user ${userId}:`, e);
          }
        });
      },
      cancel() {
        // console.log(`[UNIFIED] Stream cancelled for user ${userId}`);
        connectionAlive = false;
        clearInterval(keepaliveInterval);
        removeUserConnection(userId);
      }
    });

    // console.log(`[UNIFIED] Returning unified response for user ${userId}`);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'X-Accel-Buffering': 'no',
        'Keep-Alive': 'timeout=300, max=1000', // 5 minutes timeout
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        // Enhanced headers for SSE stability
        'Accept-Ranges': 'none',
        'X-DNS-Prefetch-Control': 'off',
        // Additional stability headers
        'X-Connection-Type': 'sse-stream',
        'X-Stream-Mode': 'continuous'
      },
    });
  } catch (error) {
    console.error('[UNIFIED] Connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Cleanup inactive connections (run every 60 seconds)
export function cleanupInactiveConnections() {
  const now = Date.now();
  const inactiveTimeout = 5 * 60 * 1000; // 5 minutes to match keepalive timeout
  
  for (const [userId, connection] of userConnections.entries()) {
    if (now - connection.lastActivity > inactiveTimeout) {
      console.log(`[UNIFIED] Cleaning up inactive connection for user ${userId}`);
      removeUserConnection(userId);
    }
  }
}

// Start cleanup interval (every 120 seconds for better performance)
setInterval(cleanupInactiveConnections, 120000); // Every 120 seconds

// Start periodic cleanup (every 60 seconds instead of 30)
let cleanupInterval: NodeJS.Timeout | null = null;

export function startPeriodicCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  
  cleanupInterval = setInterval(() => {
    try {
      cleanupInactiveConnections();
    } catch (error) {
      console.error('[UNIFIED] Error in periodic cleanup:', error);
    }
  }, 120000); // Every 120 seconds for better performance
  

}

export function stopPeriodicCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;

  }
}

// Auto-start cleanup when module is imported
startPeriodicCleanup();

// Connection monitoring and debugging
export function getConnectionDebugInfo() {
  const now = Date.now();
  const connections = Array.from(userConnections.entries()).map(([userId, conn]) => ({
    userId,
    lastActivity: new Date(conn.lastActivity).toISOString(),
    age: Math.round((now - conn.lastActivity) / 1000),
    hasKeepalive: !!conn.keepaliveInterval,
    connectionAge: Math.round((now - conn.connectionStartTime) / 1000)
  }));

  return {
    timestamp: new Date().toISOString(),
    totalConnections: userConnections.size,
    connections
  };
}

// Emergency connection reset (use with caution)
export function emergencyConnectionReset() {
  console.warn('[UNIFIED] EMERGENCY: Resetting all connections...');
  
  // Stop cleanup
  stopPeriodicCleanup();
  
  // Clear all connections
  for (const [userId, connection] of userConnections.entries()) {
    if (connection.keepaliveInterval) {
      clearInterval(connection.keepaliveInterval);
    }
  }
  userConnections.clear();
  
  // No more explicit release here as withDbClient handles it
  

  
  // Restart cleanup
  startPeriodicCleanup();
}
