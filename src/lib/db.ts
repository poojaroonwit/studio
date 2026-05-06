// src/lib/db.ts
import { Pool } from 'pg';
import { addProcessHandler } from './process-manager';
import { isBuildTime } from './build-check';
import { expandPermissionSet } from './permission-aliases';

// Suppress pg-native warning by setting environment variable
process.env.PG_NATIVE = 'false';

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

// Start cleanup interval for old connections - reduced frequency for lower CPU usage
setInterval(cleanupOldConnections, 60000); // Optimized: 60s (was 10s)

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
    poolMonitorInterval = null;
  }
  
  // console.log('[DB POOL] Monitoring disabled to prevent instability');
  // Disabled aggressive monitoring
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
  // During build time, return a mock pool that won't actually connect
  if (isBuildTime()) {
    // Return a mock pool object that won't cause build to hang
    return {
      connect: async () => {
        throw new Error('Database connections are not available during build time');
      },
      query: async () => {
        throw new Error('Database queries are not available during build time');
      },
      end: async () => {},
    } as any;
  }
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('FATAL: DATABASE_URL environment variable is not set.');
  }
  
  if (!pool) {
    const poolConfig = {
      connectionString: databaseUrl,
      // SECURITY WARNING: rejectUnauthorized: false disables SSL certificate validation
      // This should only be used for development or with self-signed certificates
      // In production, use proper SSL certificates and set rejectUnauthorized: true
      ssl: process.env.DATABASE_SSL === 'true' 
        ? { 
            rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' 
          } 
        : false,
      // Optimized: Reduced max connections to lower memory usage
      max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '50'), // Optimized: 50 (was 90) for lower RAM
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '10000'), // Optimized: 10s (was 5s)
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '300000'), // Optimized: 5min (was 10min)
      // Add query timeout to prevent hanging queries
      statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '120000'), // Optimized: 2min (was 3min)
      // Add better error handling
      allowExitOnIdle: true, // Optimized: Allow exit when idle to free memory
      // Disable pg-native to prevent warning
      native: false,
    } as any;
    
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
    
    return expandPermissionSet(result.rows[0].permissions || []);
  } catch (error) {
    console.error('Error getting merged user permissions:', error);
    return [];
  } finally {
    client.release();
  }
}
