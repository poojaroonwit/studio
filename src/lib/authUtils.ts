import { getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import type { PlatformModuleId } from '@/lib/types';

/**
 * Authenticates a user with email and password
 * Uses a single database connection for all operations
 */
export async function authenticateUser(email: string, password: string) {
  const client = await getPool().connect();
  try {
    // Get user with all necessary data in one query
    const userResult = await client.query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.image, u.password, 
        u."avatarUrl", u."personal_color", u."is_active"
      FROM "User" u 
      WHERE u.email = $1
    `, [email]);
    
    const user = userResult.rows[0];
    if (!user || !user.password) {
      return null;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    // Check if user is active
    if (!user.is_active) {
      return null;
    }

    // Get user permissions using direct foreign key
    const permissionsResult = await client.query(`
      SELECT ug.permissions
      FROM "User" u
      JOIN "UserGroup" ug ON u."userGroupId" = ug.id
      WHERE u.id = $1
    `, [user.id]);

    const permissions = permissionsResult.rows[0]?.permissions || [];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      avatarUrl: user.avatarUrl,
      personalColor: user.personal_color,
      modulePermissions: permissions,
    };
  } catch (error) {
    console.error('[AUTH UTILS] Authentication error:', error);
    return null;
  } finally {
    client.release();
  }
}

/**
 * Gets user data for session creation
 * Uses a single database connection
 */
export async function getUserSessionData(userId: string) {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.image,
        u."avatarUrl", u."personal_color", u."is_active"
      FROM "User" u 
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      avatarUrl: user.avatarUrl,
      personalColor: user.personal_color,
      isActive: user.is_active,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[AUTH UTILS] Get user session data error:', {
      error: errorMessage,
      stack: errorStack,
      userId,
      timestamp: new Date().toISOString(),
    });
    return null;
  } finally {
    client.release();
  }
}

/**
 * Gets user permissions for session creation
 * Uses a single database connection
 */
export async function getUserPermissions(userId: string): Promise<PlatformModuleId[]> {
  const client = await getPool().connect();
  try {
    // Get permissions using direct foreign key (userGroupId)
    const result = await client.query(`
      SELECT DISTINCT unnest(ug.permissions) AS permission
      FROM "User" u
      JOIN "UserGroup" ug ON u."userGroupId" = ug.id
      WHERE u.id = $1
    `, [userId]);

    // Extract permissions from the result
    const permissions = result.rows.map((row: any) => row.permission) as PlatformModuleId[];
    return permissions;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[AUTH UTILS] Get user permissions error:', {
      error: errorMessage,
      stack: errorStack,
      userId,
      timestamp: new Date().toISOString(),
    });
    return [];
  } finally {
    client.release();
  }
}
