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
        u."avatarUrl", u."personal_color"
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

    // Get user permissions using the User_UserGroup junction table
    const permissionsResult = await client.query(`
      SELECT DISTINCT unnest(ug.permissions) AS permission
      FROM "User" u
      JOIN "User_UserGroup" uug ON u.id = uug."userId"
      JOIN "UserGroup" ug ON uug."groupId" = ug.id
      WHERE u.id = $1
    `, [user.id]);

    const permissions = permissionsResult.rows.map(row => row.permission) as PlatformModuleId[];

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
        u."avatarUrl", u."personal_color"
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
    };
  } catch (error) {
    console.error('[AUTH UTILS] Get user session data error:', error);
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
    // Updated to use the User_UserGroup junction table for many-to-many relationship
    const result = await client.query(`
      SELECT DISTINCT unnest(ug.permissions) AS permission
      FROM "User" u
      JOIN "User_UserGroup" uug ON u.id = uug."userId"
      JOIN "UserGroup" ug ON uug."groupId" = ug.id
      WHERE u.id = $1
    `, [userId]);

    // Extract permissions from the result
    const permissions = result.rows.map(row => row.permission) as PlatformModuleId[];
    return permissions;
  } catch (error) {
    console.error('[AUTH UTILS] Get user permissions error:', error);
    return [];
  } finally {
    client.release();
  }
}
