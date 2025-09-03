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

// Get connection usage statistics for monitoring
export function getConnectionUsageStats() {
  const now = Date.now();
  const stats = {
    totalTracked: connectionUsageTracker.size,
    connections: Array.from(connectionUsageTracker.entries()).map(([client, usage]) => ({
      lastUsed: new Date(usage.lastUsed).toISOString(),
      idleSeconds: Math.round((now - usage.lastUsed) / 1000),
      queryCount: usage.queryCount,
      willBeClosed: (now - usage.lastUsed) > (5 * 60 * 1000) // 5 minutes
    }))
  };
  
  return stats;
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
    
    // Connection pool monitoring and cleanup (guard against dev hot-reloads)
    const __globalAny = globalThis as unknown as { __dbPoolMonitor?: NodeJS.Timeout };
    if (!__globalAny.__dbPoolMonitor) {
      __globalAny.__dbPoolMonitor = setInterval(() => {
        if (pool) {
          const { totalCount, idleCount, waitingCount } = pool;
          const activeCount = totalCount - idleCount;
          const usagePercent = Math.round((totalCount / poolConfig.max) * 100);
          
          // Log warning when approaching limit
          if (usagePercent >= 80) {
            console.warn(`[DB POOL] ⚠️  HIGH CONNECTION USAGE: ${totalCount}/${poolConfig.max} (${usagePercent}%) - Active: ${activeCount}, Idle: ${idleCount}, Waiting: ${waitingCount}`);
            
            // ✅ EMERGENCY CLEANUP: Force close idle connections when usage is high
            if (idleCount > 0) {
              console.warn(`[DB POOL] 🚨 EMERGENCY: Force closing ${idleCount} idle connections due to high usage`);
              pool.end(); // This will close all connections
              
              // Recreate the pool
              setTimeout(() => {
  
                pool = null; // Force recreation
                getPool(); // Recreate pool
              }, 1000);
            }
          }
        }
      }, 60000); // Log every minute
    }
    
    // Graceful shutdown handling - only add once using process manager
    if (!shutdownHandlerAdded) {
      shutdownHandlerAdded = true;
      
      const shutdownHandler = async (signal: string) => {

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
      console.error('Rollback error:', rollbackError);
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