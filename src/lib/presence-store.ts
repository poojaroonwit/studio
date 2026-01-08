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
        // Ensure lastSeen is a valid Date object
        const lastSeenDate = presence.lastSeen instanceof Date ? presence.lastSeen : new Date(presence.lastSeen);
        if (isNaN(lastSeenDate.getTime())) {
          // Remove entries with invalid dates
          userPresenceStore.delete(userId);
          return;
        }
        
        const timeSinceLastSeen = now.getTime() - lastSeenDate.getTime();
        if (timeSinceLastSeen > OFFLINE_THRESHOLD) {
          userPresenceStore.delete(userId);
        }
      } catch (error) {
        // Remove corrupted entries
        userPresenceStore.delete(userId);
      }
    }
  } catch (error) {
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
      return;
    }
    
    // Validate presence data
    if (!presence.userName || !presence.userRole) {
      return;
    }
    
    userPresenceStore.set(userId, presence);
  } catch (error) {
  }
}

export function getUserPresence(userId: string): UserPresence | undefined {
  try {
    if (!userId) {
      return undefined;
    }
    
    return userPresenceStore.get(userId);
  } catch (error) {
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
        return false;
      }
    });
  } catch (error) {
    return [];
  }
}

export function removeUserPresence(userId: string) {
  try {
    if (!userId) {
      return;
    }
    
    userPresenceStore.delete(userId);
  } catch (error) {
  }
}

export function markUserOffline(userId: string) {
  try {
    if (!userId) {
      return;
    }
    
    const existingPresence = userPresenceStore.get(userId);
    if (existingPresence) {
      existingPresence.isOnline = false;
      existingPresence.lastSeen = new Date();
      userPresenceStore.set(userId, existingPresence);
    }
  } catch (error) {
  }
}

export function updateUserPage(userId: string, currentPage: string) {
  try {
    if (!userId || !currentPage) {
      return;
    }
    
    const existingPresence = userPresenceStore.get(userId);
    if (existingPresence) {
      existingPresence.currentPage = currentPage;
      existingPresence.lastSeen = new Date();
      userPresenceStore.set(userId, existingPresence);
    }
  } catch (error) {
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
          return 0;
        }
        
        return values.filter(p => {
          try {
            return p && p.isOnline;
          } catch (error) {
            return false;
          }
        }).length;
      } catch (error) {
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
    return {
      totalUsers: 0,
      onlineUsers: 0,
      offlineUsers: 0,
      storeSize: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
