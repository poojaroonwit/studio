// src/lib/db.ts
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('FATAL: DATABASE_URL environment variable is not set.');
  }
  
  if (!pool) {
    const poolConfig = {
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '1800000'),
      // Add query timeout to prevent hanging queries
      statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '120000'), // 120 seconds
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
    
    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      console.log('[DB POOL] Shutting down connection pool...');
      if (pool) {
        await pool.end();
      }
      process.exit(0);
    });
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
  return withDbClient(async (client) => {
    // Get group permissions only
    const groupRes = await client.query(`
      SELECT array_agg(DISTINCT perm) AS group_permissions
      FROM (
        SELECT unnest(permissions) AS perm
        FROM "UserGroup" ug
        JOIN "User_UserGroup" uug ON ug.id = uug."groupId"
        WHERE uug."userId" = $1
      ) AS perms
    `, [userId]);
    const group = (groupRes.rows[0]?.group_permissions || []) as string[];

    // Return only group permissions (no direct permissions)
    return group || [];
  });
}