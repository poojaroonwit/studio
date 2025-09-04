// Shared presence store for realtime presence management
export interface UserPresence {
  userId: string;
  userName: string;
  userRole: string;
  avatarUrl?: string | null;
  personalColor?: string | null;
  currentPage: string;
  lastSeen: Date;
  isOnline: boolean;
}

// In-memory storage for user presence (in production, use Redis)
const userPresenceStore = new Map<string, UserPresence>();

// Clean up offline users (older than 6 hours)
const OFFLINE_THRESHOLD = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

export function cleanupOfflineUsers() {
  try {
    const now = new Date();
    for (const [userId, presence] of userPresenceStore.entries()) {
      try {
        const timeSinceLastSeen = now.getTime() - presence.lastSeen.getTime();
        if (timeSinceLastSeen > OFFLINE_THRESHOLD) {
          userPresenceStore.delete(userId);
        }
      } catch (error) {
        console.error(`Error cleaning up user ${userId}:`, error);
        // Remove corrupted entries
        userPresenceStore.delete(userId);
      }
    }
  } catch (error) {
    console.error('Error in cleanupOfflineUsers:', error);
  }
}

// Clean up every 5 minutes (guard against dev hot-reloads)
const __presenceGlobal = globalThis as unknown as { __presenceCleanupInterval?: NodeJS.Timeout };
if (!__presenceGlobal.__presenceCleanupInterval) {
  // Start periodic cleanup of offline users
  __presenceGlobal.__presenceCleanupInterval = setInterval(cleanupOfflineUsers, 10000); // 10 seconds
}

// Presence store functions
export function setUserPresence(userId: string, presence: UserPresence) {
  try {
    if (!userId || !presence) {
      console.error('Invalid userId or presence data:', { userId, presence });
      return;
    }
    
    // Validate presence data
    if (!presence.userName || !presence.userRole) {
      console.error('Invalid presence data - missing required fields:', presence);
      return;
    }
    
    userPresenceStore.set(userId, presence);
  } catch (error) {
    console.error('Error setting user presence:', error);
  }
}

export function getUserPresence(userId: string): UserPresence | undefined {
  try {
    if (!userId) {
      console.error('Invalid userId provided to getUserPresence');
      return undefined;
    }
    
    return userPresenceStore.get(userId);
  } catch (error) {
    console.error('Error getting user presence:', error);
    return undefined;
  }
}

export function getAllUserPresence(): UserPresence[] {
  try {
    const values = Array.from(userPresenceStore.values());
    // Defensive check to prevent filter errors
    if (!Array.isArray(values)) {
      console.warn('PresenceStore: values is not an array:', values);
      return [];
    }
    
    return values.filter(presence => {
      try {
        // Filter out any corrupted entries
        return presence && presence.userId && presence.userName;
      } catch (error) {
        console.warn('PresenceStore: Error filtering presence entry:', error, presence);
        return false;
      }
    });
  } catch (error) {
    console.error('Error getting all user presence:', error);
    return [];
  }
}

export function removeUserPresence(userId: string) {
  try {
    if (!userId) {
      console.error('Invalid userId provided to removeUserPresence');
      return;
    }
    
    userPresenceStore.delete(userId);
  } catch (error) {
    console.error('Error removing user presence:', error);
  }
}

export function markUserOffline(userId: string) {
  try {
    if (!userId) {
      console.error('Invalid userId provided to markUserOffline');
      return;
    }
    
    const existingPresence = userPresenceStore.get(userId);
    if (existingPresence) {
      existingPresence.isOnline = false;
      existingPresence.lastSeen = new Date();
      userPresenceStore.set(userId, existingPresence);
    }
  } catch (error) {
    console.error('Error marking user offline:', error);
  }
}

export function updateUserPage(userId: string, currentPage: string) {
  try {
    if (!userId || !currentPage) {
      console.error('Invalid userId or currentPage provided to updateUserPage:', { userId, currentPage });
      return;
    }
    
    const existingPresence = userPresenceStore.get(userId);
    if (existingPresence) {
      existingPresence.currentPage = currentPage;
      existingPresence.lastSeen = new Date();
      userPresenceStore.set(userId, existingPresence);
    }
  } catch (error) {
    console.error('Error updating user page:', error);
  }
}

// Get store statistics for debugging
export function getPresenceStoreStats() {
  try {
    const totalUsers = userPresenceStore.size;
    const onlineUsers = (() => {
      try {
        const values = Array.from(userPresenceStore.values());
        // Defensive check to prevent filter errors
        if (!Array.isArray(values)) {
          console.warn('PresenceStore: values is not an array:', values);
          return 0;
        }
        
        return values.filter(p => {
          try {
            return p && p.isOnline;
          } catch (error) {
            console.warn('PresenceStore: Error filtering online presence:', error, p);
            return false;
          }
        }).length;
      } catch (error) {
        console.error('PresenceStore: Error counting online users:', error);
        return 0;
      }
    })();
    const offlineUsers = totalUsers - onlineUsers;
    
    return {
      totalUsers,
      onlineUsers,
      offlineUsers,
      storeSize: userPresenceStore.size
    };
  } catch (error) {
    console.error('Error getting presence store stats:', error);
    return {
      totalUsers: 0,
      onlineUsers: 0,
      offlineUsers: 0,
      storeSize: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
