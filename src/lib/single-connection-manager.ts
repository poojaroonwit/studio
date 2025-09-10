// Single Connection Manager - Uses only ONE database connection for all operations
// This approach eliminates connection leaks but has trade-offs

import { Pool, PoolClient } from 'pg';

// Suppress pg-native warning by setting environment variable
process.env.PG_NATIVE = 'false';

class SingleConnectionManager {
  private static instance: SingleConnectionManager;
  private pool: Pool | null = null;
  private currentClient: PoolClient | null = null;
  private isConnected = false;
  private connectionPromise: Promise<PoolClient> | null = null;
  private lastUsed = 0;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private maxIdleTime = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.startKeepAlive();
  }

  static getInstance(): SingleConnectionManager {
    if (!SingleConnectionManager.instance) {
      SingleConnectionManager.instance = new SingleConnectionManager();
    }
    return SingleConnectionManager.instance;
  }

  private async createPool(): Promise<Pool> {
    if (this.pool) return this.pool;

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('FATAL: DATABASE_URL environment variable is not set.');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 1, // Only ONE connection!
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '5000'),
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '600000'),
      statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '180000'),
      allowExitOnIdle: false,
      // Disable pg-native to prevent warning
      native: false,
    } as any);

    // Enhanced error handling
    this.pool.on('error', (err, client) => {
      console.error('[SINGLE CONNECTION] Pool error:', err);
      this.isConnected = false;
      this.currentClient = null;
    });

    return this.pool;
  }

  private async getConnection(): Promise<PoolClient> {
    // If we already have a connection promise, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // If we have a current client and it's still valid, use it
    if (this.currentClient && this.isConnected) {
      this.lastUsed = Date.now();
      return this.currentClient;
    }

    // Create new connection
    this.connectionPromise = this.createPool().then(async (pool) => {
      try {
        const client = await pool.connect();
        this.currentClient = client;
        this.isConnected = true;
        this.lastUsed = Date.now();
        
        console.log('[SINGLE CONNECTION] ✅ New connection established');
        
        // Handle client errors
        client.on('error', (err) => {
          console.error('[SINGLE CONNECTION] Client error:', err);
          this.isConnected = false;
          this.currentClient = null;
        });

        // Handle client end
        client.on('end', () => {
          console.log('[SINGLE CONNECTION] Client disconnected');
          this.isConnected = false;
          this.currentClient = null;
        });

        return client;
      } catch (error) {
        console.error('[SINGLE CONNECTION] Failed to connect:', error);
        this.connectionPromise = null;
        throw error;
      }
    });

    return this.connectionPromise;
  }

  private startKeepAlive() {
    this.keepAliveInterval = setInterval(async () => {
      if (this.currentClient && this.isConnected) {
        try {
          // Simple ping query to keep connection alive
          await this.currentClient.query('SELECT 1');
          this.lastUsed = Date.now();
        } catch (error) {
          console.error('[SINGLE CONNECTION] Keep-alive failed:', error);
          this.isConnected = false;
          this.currentClient = null;
          this.connectionPromise = null;
        }
      }
    }, 30000); // Every 30 seconds
  }

  // Main method to execute database operations
  async execute<T>(
    operation: (client: PoolClient) => Promise<T>,
    operationName: string = 'unknown'
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const client = await this.getConnection();
      
      // Execute the operation
      const result = await operation(client);
      
      const duration = Date.now() - startTime;
      if (duration > 1000) { // Log slow operations
        console.warn(`[SINGLE CONNECTION] Slow operation '${operationName}': ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      console.error(`[SINGLE CONNECTION] Operation '${operationName}' failed:`, error);
      
      // Reset connection on error
      this.isConnected = false;
      this.currentClient = null;
      this.connectionPromise = null;
      
      throw error;
    }
  }

  // Transaction wrapper
  async executeTransaction<T>(
    operation: (client: PoolClient) => Promise<T>,
    operationName: string = 'transaction'
  ): Promise<T> {
    return this.execute(async (client) => {
      try {
        await client.query('BEGIN');
        const result = await operation(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('[SINGLE CONNECTION] Rollback failed:', rollbackError);
        }
        throw error;
      }
    }, operationName);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.execute(async (client) => {
        await client.query('SELECT 1');
      }, 'health-check');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      hasClient: !!this.currentClient,
      lastUsed: this.lastUsed,
      idleSeconds: Math.round((Date.now() - this.lastUsed) / 1000),
      poolSize: this.pool ? this.pool.totalCount : 0,
    };
  }

  // Cleanup
  async cleanup() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    if (this.currentClient) {
      try {
        this.currentClient.release();
      } catch (error) {
        console.error('[SINGLE CONNECTION] Error releasing client:', error);
      }
      this.currentClient = null;
    }

    if (this.pool) {
      try {
        await this.pool.end();
      } catch (error) {
        console.error('[SINGLE CONNECTION] Error ending pool:', error);
      }
      this.pool = null;
    }

    this.isConnected = false;
    this.connectionPromise = null;
  }
}

// Export singleton instance
export const singleConnectionManager = SingleConnectionManager.getInstance();

// Convenience functions
export async function withSingleConnection<T>(
  operation: (client: PoolClient) => Promise<T>,
  operationName?: string
): Promise<T> {
  return singleConnectionManager.execute(operation, operationName);
}

export async function withSingleTransaction<T>(
  operation: (client: PoolClient) => Promise<T>,
  operationName?: string
): Promise<T> {
  return singleConnectionManager.executeTransaction(operation, operationName);
}

// Health check function
export async function checkSingleConnectionHealth(): Promise<boolean> {
  return singleConnectionManager.healthCheck();
}

// Get connection status
export function getSingleConnectionStatus() {
  return singleConnectionManager.getStatus();
}

// Cleanup function
export async function cleanupSingleConnection() {
  await singleConnectionManager.cleanup();
}
