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
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '2000')
    };
    
    pool = new Pool(poolConfig);
    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
      process.exit(-1);
    });
  }
  return pool;
}

// Returns a deduplicated array of all permissions for a user (direct + group)
export async function getMergedUserPermissions(userId: string): Promise<string[]> {
  const client = await getPool().connect();
  try {
    // Get direct permissions
    const userRes = await client.query('SELECT "modulePermissions" FROM "User" WHERE id = $1', [userId]);
    const direct = (userRes.rows[0]?.modulePermissions || []) as string[];

    // Get group permissions
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

    // Merge and deduplicate
    return Array.from(new Set([...(direct || []), ...(group || [])]));
  } finally {
    client.release();
  }
}