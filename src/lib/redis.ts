// src/lib/redis.ts
import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;
let isConnecting = false;
let connectionPromise: Promise<void> | null = null;

// Skip Redis initialization during build time
if (process.env.NEXT_PHASE === 'phase-production-build') {
  console.log('[REDIS] Skipping Redis initialization during build');
} else {
  console.log('Attempting to connect to Redis...');
}

export async function getRedisClient() {
  // Skip during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }

  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  if (isConnecting && connectionPromise) {
    await connectionPromise;
    return redisClient;
  }

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://redis:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis connection failed after 10 retries');
            return false;
          }
          return Math.min(retries * 100, 3000);
        },
        connectTimeout: 10000,
        commandTimeout: 5000,
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      console.log('Redis Client Ready');
    });

    redisClient.on('end', () => {
      console.log('Redis Client Disconnected');
    });

    redisClient.on('reconnecting', () => {
      console.log('Reconnecting to Redis server...');
    });
  }

  if (!redisClient.isOpen) {
    isConnecting = true;
    connectionPromise = redisClient.connect().catch((error) => {
      console.error('Failed to connect to Redis:', error);
      isConnecting = false;
      connectionPromise = null;
      throw error;
    });

    try {
      await connectionPromise;
      isConnecting = false;
      connectionPromise = null;
    } catch (error) {
      isConnecting = false;
      connectionPromise = null;
      throw error;
    }
  }

  return redisClient;
}

export async function closeRedisConnection() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeRedisConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeRedisConnection();
  process.exit(0);
});

// Optional: Export a ready check or a function to ensure connection before critical ops
export async function isRedisReady(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    // A more robust check than just isOpen, PING is a lightweight command.
    if (client && client.isOpen) {
      const pong = await client.ping();
      return pong === 'PONG';
    }
    return false;
  } catch (error) {
    console.warn("Redis readiness check failed:", error);
    return false;
  }
}

export default getRedisClient; // Default export for convenience

// Constants for cache
export const CACHE_KEY_RECRUITMENT_STAGES = 'cache:recruitment_stages';
export const CACHE_EXPIRY_SECONDS_STAGES = 3600; // 1 hour

export const CACHE_KEY_POSITIONS = 'cache:positions';
export const CACHE_EXPIRY_SECONDS_POSITIONS = 3600; // 1 hour

export const CACHE_KEY_USERS = 'cache:users';
export const CACHE_EXPIRY_SECONDS_USERS = 1800; // 30 minutes

// Real-time collaboration constants
export const REALTIME_KEYS = {
  PRESENCE: 'realtime:presence',
  COLLABORATION: 'realtime:collaboration',
  NOTIFICATIONS: 'realtime:notifications',
  CANDIDATE_UPDATES: 'realtime:candidate_updates',
  POSITION_UPDATES: 'realtime:position_updates',
  USER_ACTIVITY: 'realtime:user_activity',
} as const;

// Presence tracking for real-time collaboration
export interface UserPresence {
  userId: string;
  userName: string;
  userRole: string;
  currentPage: string;
  lastActivity: number;
  isOnline: boolean;
}

export interface CollaborationEvent {
  id: string;
  type: 'candidate_update' | 'position_update' | 'status_change' | 'comment' | 'assignment';
  userId: string;
  userName: string;
  timestamp: number;
  data: any;
  entityId: string;
  entityType: string;
}

export interface NotificationEvent {
  id: string;
  type: 'candidate_added' | 'status_changed' | 'assignment' | 'mention' | 'system';
  userId: string;
  targetUserId?: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: any;
}

// Real-time collaboration functions
export async function updateUserPresence(userId: string, presence: Partial<UserPresence>): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    const key = `${REALTIME_KEYS.PRESENCE}:${userId}`;
    const fullPresence: UserPresence = {
      userId,
      userName: presence.userName || '',
      userRole: presence.userRole || '',
      currentPage: presence.currentPage || '',
      lastActivity: Date.now(),
      isOnline: true,
      ...presence,
    };

    await client.hSet(key, Object.fromEntries(Object.entries(fullPresence).map(([k, v]) => [k, String(v)])));
    await client.expire(key, 300); // Expire after 5 minutes of inactivity
  } catch (error) {
    console.error('Failed to update user presence:', error);
  }
}

export async function removeUserPresence(userId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    const key = `${REALTIME_KEYS.PRESENCE}:${userId}`;
    await client.del(key);
  } catch (error) {
    console.error('Failed to remove user presence:', error);
  }
}

export async function getOnlineUsers(): Promise<UserPresence[]> {
  try {
    const client = await getRedisClient();
    if (!client) return [];

    const pattern = `${REALTIME_KEYS.PRESENCE}:*`;
    const keys = await client.keys(pattern);
    
    if (keys.length === 0) return [];

    const presences: UserPresence[] = [];
    for (const key of keys) {
      const presence = await client.hGetAll(key);
      if (presence.userId && presence.isOnline === 'true') {
        presences.push({
          userId: presence.userId,
          userName: presence.userName || '',
          userRole: presence.userRole || '',
          currentPage: presence.currentPage || '',
          lastActivity: parseInt(presence.lastActivity || '0'),
          isOnline: true,
        });
      }
    }

    return presences.sort((a, b) => b.lastActivity - a.lastActivity);
  } catch (error) {
    console.error('Failed to get online users:', error);
    return [];
  }
}

// Collaboration event functions
export async function publishCollaborationEvent(event: Omit<CollaborationEvent, 'id' | 'timestamp'>): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    const fullEvent: CollaborationEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    const key = `${REALTIME_KEYS.COLLABORATION}:${event.entityType}:${event.entityId}`;
    await client.lPush(key, JSON.stringify(fullEvent));
    await client.lTrim(key, 0, 99); // Keep only last 100 events
    await client.expire(key, 86400); // Expire after 24 hours

    // Also publish to general collaboration stream
    await client.publish('collaboration_events', JSON.stringify(fullEvent));
  } catch (error) {
    console.error('Failed to publish collaboration event:', error);
  }
}

export async function getCollaborationEvents(entityType: string, entityId: string, limit: number = 50): Promise<CollaborationEvent[]> {
  try {
    const client = await getRedisClient();
    if (!client) return [];

    const key = `${REALTIME_KEYS.COLLABORATION}:${entityType}:${entityId}`;
    const events = await client.lRange(key, 0, limit - 1);
    
    return events
      .map(event => JSON.parse(event))
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to get collaboration events:', error);
    return [];
  }
}

// Notification functions
export async function createNotification(notification: Omit<NotificationEvent, 'id' | 'timestamp' | 'read'>): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    const fullNotification: NotificationEvent = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };

    const key = `${REALTIME_KEYS.NOTIFICATIONS}:${notification.targetUserId || 'global'}`;
    await client.lPush(key, JSON.stringify(fullNotification));
    await client.lTrim(key, 0, 999); // Keep last 1000 notifications
    await client.expire(key, 604800); // Expire after 7 days

    // Publish notification event
    await client.publish('notifications', JSON.stringify(fullNotification));
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function getUserNotifications(userId: string, limit: number = 50): Promise<NotificationEvent[]> {
  try {
    const client = await getRedisClient();
    if (!client) return [];

    const userKey = `${REALTIME_KEYS.NOTIFICATIONS}:${userId}`;
    const globalKey = `${REALTIME_KEYS.NOTIFICATIONS}:global`;
    
    const [userNotifications, globalNotifications] = await Promise.all([
      client.lRange(userKey, 0, limit - 1),
      client.lRange(globalKey, 0, limit - 1),
    ]);

    const allNotifications = [
      ...userNotifications.map(n => ({ ...JSON.parse(n), isGlobal: false })),
      ...globalNotifications.map(n => ({ ...JSON.parse(n), isGlobal: true })),
    ];

    return allNotifications
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to get user notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    const userKey = `${REALTIME_KEYS.NOTIFICATIONS}:${userId}`;
    const notifications = await client.lRange(userKey, 0, -1);
    
    for (let i = 0; i < notifications.length; i++) {
      const notification = JSON.parse(notifications[i]);
      if (notification.id === notificationId) {
        notification.read = true;
        await client.lSet(userKey, i, JSON.stringify(notification));
        break;
      }
    }
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
}

// Cache management functions
export async function setCache<T>(key: string, data: T, expirySeconds: number = 3600): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    await client.setEx(key, expirySeconds, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to set cache:', error);
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    if (!client) return null;

    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get cache:', error);
    return null;
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    await client.del(key);
  } catch (error) {
    console.error('Failed to delete cache:', error);
  }
}

export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.error('Failed to invalidate cache pattern:', error);
  }
}

// Real-time data synchronization
export async function subscribeToChannel(channel: string, callback: (message: string) => void): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    await client.subscribe(channel, (message) => {
      callback(message);
    });
  } catch (error) {
    console.error('Failed to subscribe to channel:', error);
  }
}

export async function unsubscribeFromChannel(channel: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    await client.unsubscribe(channel);
  } catch (error) {
    console.error('Failed to unsubscribe from channel:', error);
  }
}

// Rate limiting for API endpoints
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    const client = await getRedisClient();
    if (!client) return { allowed: true, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 };

    const current = await client.incr(key);
    if (current === 1) {
      await client.expire(key, windowSeconds);
    }

    const ttl = await client.ttl(key);
    const remaining = Math.max(0, limit - current);
    const resetTime = Date.now() + ttl * 1000;

    return {
      allowed: current <= limit,
      remaining,
      resetTime,
    };
  } catch (error) {
    console.error('Failed to check rate limit:', error);
    return { allowed: true, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 };
  }
}
