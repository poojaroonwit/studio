// src/lib/db.ts
import { Pool } from 'pg';
import { addProcessHandler } from './process-manager';

let pool: Pool | null = null;
let shutdownHandlerAdded = false;

// Connection usage tracking for intelligent cleanup
const connectionUsageTracker = new Map<any, { lastUsed: number; queryCount: number }>();

// Track when a connection is used
function trackConnectionUsage(client: any) {
  const existing = connectionUsageTracker.get(client);
  if (existing) {
    existing.lastUsed = Date.now();
    existing.queryCount++;
  } else {
    connectionUsageTracker.set(client, { lastUsed: Date.now(), queryCount: 1 });
  }
}

// Clean up old connections (not used for more than 5 minutes)
function cleanupOldConnections() {
  const now = Date.now();
  const maxIdleTime = 5 * 60 * 1000; // 5 minutes
  
  for (const [client, usage] of connectionUsageTracker.entries()) {
    if (now - usage.lastUsed > maxIdleTime) {
      try {
        client.release();
        connectionUsageTracker.delete(client);
      } catch (error) {
        console.error('[DB CLEANUP] Error closing old connection:', error);
        connectionUsageTracker.delete(client);
      }
    }
  }
}

// Start cleanup interval for old connections
setInterval(cleanupOldConnections, 30000); // Check every 30 seconds

// Enhanced connection pool monitoring and cleanup
let poolMonitorInterval: NodeJS.Timeout | null = null;

// Manual connection cleanup function for emergency use
export async function emergencyConnectionCleanup() {
  if (!pool) {
    
    return { success: false, message: 'No active pool' };
  }
  
  try {
    const { totalCount, idleCount, waitingCount } = pool;
    const activeCount = totalCount - idleCount;
    const usagePercent = Math.round((totalCount / parseInt(process.env.DATABASE_MAX_CONNECTIONS || '90')) * 100);
    
    
    
    let cleanedConnections = 0;
    
    // Force close idle connections
    if (idleCount > 0) {
      
      
      // Get all idle clients and release them
      const idleClients = Array.from({ length: Math.min(idleCount, 10) }, () => pool!.connect());
      
      for (const clientPromise of idleClients) {
        try {
          const client = await clientPromise;
          client.release();
          cleanedConnections++;
        } catch (error) {
          console.error('[DB POOL] Error releasing idle client:', error);
        }
      }
      
      
    }
    
    // Clean up tracked connections that are no longer valid
    const now = Date.now();
    const maxIdleTime = 2 * 60 * 1000; // 2 minutes for emergency cleanup
    
    for (const [client, usage] of connectionUsageTracker.entries()) {
      if (now - usage.lastUsed > maxIdleTime) {
        try {
          connectionUsageTracker.delete(client);
        } catch (error) {
          console.error('[DB POOL] Error cleaning up tracked connection:', error);
          connectionUsageTracker.delete(client);
        }
      }
    }
    
    // Get updated stats after cleanup
    const newStats = getConnectionUsageStats();
    
    return {
      success: true,
      cleanedConnections,
      beforeStats: { totalCount, idleCount, waitingCount, usagePercent },
      afterStats: newStats,
      message: `Cleaned up ${cleanedConnections} connections. Usage: ${newStats?.usagePercent}%`
    };
    
  } catch (error) {
    console.error('[DB POOL] Error during emergency cleanup:', error);
    return { success: false, message: `Error: ${error}` };
  }
}

function startPoolMonitoring() {
  if (poolMonitorInterval) {
    clearInterval(poolMonitorInterval);
  }
  
  poolMonitorInterval = setInterval(async () => {
    if (pool) {
      const { totalCount, idleCount, waitingCount } = pool;
      const activeCount = totalCount - idleCount;
      const usagePercent = Math.round((totalCount / parseInt(process.env.DATABASE_MAX_CONNECTIONS || '90')) * 100);
      
      // Log connection status every 5 seconds
      if (usagePercent >= 70) {
        console.warn(`[DB POOL] ⚠️  HIGH CONNECTION USAGE: ${totalCount}/${process.env.DATABASE_MAX_CONNECTIONS || '90'} (${usagePercent}%) - Active: ${activeCount}, Idle: ${idleCount}, Waiting: ${waitingCount}`);
      }
      
      // Smart cleanup when approaching 80% threshold
      if (usagePercent >= 80 && idleCount > 0) {
        console.warn(`[DB POOL] 🚨 EMERGENCY: High usage detected (${usagePercent}%). Initiating smart cleanup...`);
        
        // Use the emergency cleanup function for better control
        const cleanupResult = await emergencyConnectionCleanup();
        if (cleanupResult.success) {
  
        } else {
          console.error(`[DB POOL] ❌ Smart cleanup failed: ${cleanupResult.message}`);
        }
      }
      
      // Critical threshold - more aggressive cleanup
      if (usagePercent >= 90) {
        console.error(`[DB POOL] 🚨 CRITICAL: Connection usage at ${usagePercent}%!`);
        
        // Force cleanup of all idle connections
        if (idleCount > 0) {
          console.error(`[DB POOL] 🚨 CRITICAL: Force closing all ${idleCount} idle connections!`);
          
          // Use a more aggressive approach for critical situations
          try {
            // Force the pool to close idle connections
            pool.end();
            
            // Recreate the pool after a short delay
            setTimeout(() => {
      
              pool = null;
              getPool();
            }, 2000);
          } catch (error) {
            console.error('[DB POOL] Error during critical cleanup:', error);
          }
        }
      }
    }
  }, 5000); // Check every 5 seconds instead of 30
}

export function getConnectionUsageStats() {
  if (!pool) return null;
  
  const { totalCount, idleCount, waitingCount } = pool;
  const activeCount = totalCount - idleCount;
  const usagePercent = Math.round((totalCount / parseInt(process.env.DATABASE_MAX_CONNECTIONS || '90')) * 100);
  
  return {
    totalCount,
    activeCount,
    idleCount,
    waitingCount,
    usagePercent,
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '90')
  };
}

export function getPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('FATAL: DATABASE_URL environment variable is not set.');
  }
  
  if (!pool) {
    const poolConfig = {
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '90'), // ✅ Set to 90 to stay under PostgreSQL's 100 limit
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '5000'), // ✅ Reduced to 5s
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '600000'), // ✅ Reduced to 10min
      // Add query timeout to prevent hanging queries
      statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '180000'), // ✅ 3min timeout
      // Add better error handling
      allowExitOnIdle: false,
    };
    
    pool = new Pool(poolConfig);
    
    // Enhanced error handling
    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
      // Don't exit the process, just log the error
      // process.exit(-1);
    });
    
    // Start the enhanced pool monitoring
    startPoolMonitoring();
    
    // Graceful shutdown handling - only add once using process manager
    if (!shutdownHandlerAdded) {
      shutdownHandlerAdded = true;
      
      const shutdownHandler = async (signal: string) => {

        
        if (poolMonitorInterval) {
          clearInterval(poolMonitorInterval);
          poolMonitorInterval = null;
        }
        
        if (pool) {
          await pool.end();
        }
        // Don't call process.exit() here as other handlers might need to run
      };
      
      addProcessHandler('SIGINT', () => shutdownHandler('SIGINT'), 'db-pool-shutdown');
      addProcessHandler('SIGTERM', () => shutdownHandler('SIGTERM'), 'db-pool-shutdown');
    }
  }
  return pool;
}

// Wrapper for the database client to prevent double release
class SafeClient {
  private client: any;
  private released = false;

  constructor(client: any) {
    this.client = client;
  }

  // Proxy all client methods to the underlying client
  query(text: string, params?: any[]) {
    if (this.released) {
      throw new Error('Cannot use client after it has been released');
    }
    
    // ✅ Track connection usage for intelligent cleanup
    trackConnectionUsage(this.client);
    
    return this.client.query(text, params);
  }

  // Safe release that prevents double release
  release() {
    if (!this.released) {
      this.released = true;
      
      // ✅ Remove from usage tracker when released
      connectionUsageTracker.delete(this.client);
      
      this.client.release();
    }
  }

  // Check if the client has been released
  isReleased() {
    return this.released;
  }
}

// Safe database connection function that returns a SafeClient
export async function getSafeDbClient() {
  const pool = getPool();
  const client = await pool.connect();
  return new SafeClient(client);
}

// Database operation wrapper that automatically handles connection management
export async function withDbClient<T>(
  operation: (client: any) => Promise<T>
): Promise<T> {
  const client = await getSafeDbClient();
  try {
    return await operation(client);
  } finally {
    client.release();
  }
}

// Transaction wrapper that automatically handles rollback and release
export async function withDbTransaction<T>(
  operation: (client: any) => Promise<T>
): Promise<T> {
  const client = await getSafeDbClient();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

// Returns permissions for a user from their assigned groups only
export async function getMergedUserPermissions(userId: string): Promise<string[]> {
  const client = await getPool().connect();
  try {
    // Get user permissions using direct foreign key
    const result = await client.query(`
      SELECT ug.permissions
      FROM "User" u
      JOIN "UserGroup" ug ON u."userGroupId" = ug.id
      WHERE u.id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return [];
    }
    
    return result.rows[0].permissions || [];
  } catch (error) {
    console.error('Error getting merged user permissions:', error);
    return [];
  } finally {
    client.release();
  }
}