// src/lib/db.ts
import { Pool } from 'pg';
import { addProcessHandler } from './process-manager';

let pool: Pool | null = null;
let shutdownHandlerAdded = false;

export function getPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('FATAL: DATABASE_URL environment variable is not set.');
  }
  
  if (!pool) {
    const poolConfig = {
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '1000'), // Reduced from 100 to 20
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'), // Reduced from 60s to 30s
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '1800000'),
      // Add query timeout to prevent hanging queries
      statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '180000'), // Increased from 120s to 180s
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
        // Removed DB pool logging to reduce console spam
      }, 60000); // Log every minute
    }
    
    // Graceful shutdown handling - only add once using process manager
    if (!shutdownHandlerAdded) {
      shutdownHandlerAdded = true;
      
      const shutdownHandler = async (signal: string) => {
        console.log(`[DB POOL] Received ${signal}, shutting down connection pool...`);
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
    return this.client.query(text, params);
  }

  // Safe release that prevents double release
  release() {
    if (!this.released) {
      this.released = true;
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