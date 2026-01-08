import { getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import type { PlatformModuleId } from '@/lib/types';

<<<<<<< HEAD
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
=======
// Account lockout configuration
const LOCKOUT_CONFIG = {
  MAX_FAILED_ATTEMPTS: 3,           // Lock after 3 failed attempts
  LOCKOUT_DURATION_MINUTES: 15,     // Lock for 15 minutes
  RESET_FAILED_ATTEMPTS_MINUTES: 30 // Reset counter after 30 minutes of no failed attempts
};

// Authentication result types
export type AuthResult = {
  success: true;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image: string | null;
    avatarUrl: string | null;
    personalColor: string | null;
    modulePermissions: PlatformModuleId[];
  };
} | {
  success: false;
  error: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'ACCOUNT_DISABLED' | 'USER_NOT_FOUND' | 'SYSTEM_ERROR';
  message: string;
  lockedUntil?: Date;
  remainingAttempts?: number;
};

/**
 * Masks email for secure logging
 */
function maskEmail(email: string): string {
  if (!email || email.indexOf('@') === -1) return '[invalid]';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] : '*'.repeat(local.length);
  return `${maskedLocal}@${domain}`;
}

/**
 * Records a failed login attempt and checks if account should be locked
 */
async function recordFailedLoginAttempt(client: any, userId: string, email: string): Promise<{ locked: boolean; lockedUntil?: Date; remainingAttempts: number }> {
  const now = new Date();
  
  // Get current failed attempts
  const currentResult = await client.query(`
    SELECT "failed_login_attempts", "last_failed_login"
    FROM "User"
    WHERE id = $1
  `, [userId]);
  
  const current = currentResult.rows[0];
  let failedAttempts = current?.failed_login_attempts || 0;
  const lastFailedLogin = current?.last_failed_login ? new Date(current.last_failed_login) : null;
  
  // Reset counter if last failed attempt was more than RESET_FAILED_ATTEMPTS_MINUTES ago
  if (lastFailedLogin) {
    const minutesSinceLastFailed = (now.getTime() - lastFailedLogin.getTime()) / (1000 * 60);
    if (minutesSinceLastFailed > LOCKOUT_CONFIG.RESET_FAILED_ATTEMPTS_MINUTES) {
      failedAttempts = 0;
    }
  }
  
  // Increment failed attempts
  failedAttempts += 1;
  
  // Check if we should lock the account
  let lockedUntil: Date | undefined;
  if (failedAttempts >= LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS) {
    lockedUntil = new Date(now.getTime() + LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000);
    
    // Update user with lock
    await client.query(`
      UPDATE "User"
      SET "failed_login_attempts" = $1,
          "last_failed_login" = $2,
          "locked_until" = $3,
          "updatedAt" = $2
      WHERE id = $4
    `, [failedAttempts, now, lockedUntil, userId]);
    
    console.warn(`[AUTH] Account locked for email: ${maskEmail(email)} until ${lockedUntil.toISOString()}`);
    
    // Log the lockout event
    await client.query(`
      INSERT INTO "UserActivityLog" (id, user_id, action, details, created_at)
      VALUES (gen_random_uuid(), $1, 'ACCOUNT_LOCKED', $2, $3)
    `, [userId, JSON.stringify({ 
      reason: 'Too many failed login attempts',
      failedAttempts,
      lockedUntil: lockedUntil.toISOString()
    }), now]);
    
    return { locked: true, lockedUntil, remainingAttempts: 0 };
  }
  
  // Update failed attempts without locking
  await client.query(`
    UPDATE "User"
    SET "failed_login_attempts" = $1,
        "last_failed_login" = $2,
        "updatedAt" = $2
    WHERE id = $3
  `, [failedAttempts, now, userId]);
  
  // Log the failed attempt
  await client.query(`
    INSERT INTO "UserActivityLog" (id, user_id, action, details, created_at)
    VALUES (gen_random_uuid(), $1, 'SIGN_IN_FAILED', $2, $3)
  `, [userId, JSON.stringify({ 
    reason: 'Invalid password',
    failedAttempts,
    remainingAttempts: LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS - failedAttempts
  }), now]);
  
  return { 
    locked: false, 
    remainingAttempts: LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS - failedAttempts 
  };
}

/**
 * Resets failed login attempts on successful login
 */
async function resetFailedLoginAttempts(client: any, userId: string): Promise<void> {
  await client.query(`
    UPDATE "User"
    SET "failed_login_attempts" = 0,
        "last_failed_login" = NULL,
        "locked_until" = NULL,
        "updatedAt" = NOW()
    WHERE id = $1
  `, [userId]);
}

/**
 * Checks if account is currently locked
 */
async function checkAccountLockout(client: any, userId: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
  const result = await client.query(`
    SELECT "locked_until"
    FROM "User"
    WHERE id = $1
  `, [userId]);
  
  const lockedUntil = result.rows[0]?.locked_until;
  
  if (!lockedUntil) {
    return { locked: false };
  }
  
  const lockDate = new Date(lockedUntil);
  const now = new Date();
  
  if (lockDate > now) {
    return { locked: true, lockedUntil: lockDate };
  }
  
  // Lock has expired, clear it
  await client.query(`
    UPDATE "User"
    SET "locked_until" = NULL,
        "failed_login_attempts" = 0,
        "updatedAt" = NOW()
    WHERE id = $1
  `, [userId]);
  
  return { locked: false };
}

/**
 * Authenticates a user with email and password
 * Implements account lockout after 3 failed attempts
 * Uses a single database connection for all operations
 */
export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  console.log('[AUTH UTILS] Authenticating user:', maskEmail(email));
  const client = await getPool().connect();
  try {
    // Get user with all necessary data in one query (including lockout fields)
    const userResult = await client.query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.image, u.password, 
        u."avatarUrl", u."personal_color", u."is_active",
        u."failed_login_attempts", u."locked_until", u."last_failed_login"
>>>>>>> ca51ac36
      FROM "User" u 
      WHERE u.email = $1
    `, [email]);
    
    const user = userResult.rows[0];
    if (!user || !user.password) {
<<<<<<< HEAD
      console.warn(`[AUTH] User not found or no password for email: ${email}`);
      return null;
=======
      console.warn(`[AUTH] User not found or no password for email: ${maskEmail(email)}`);
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Invalid email or password'
      };
    }

    // Check if account is locked
    const lockStatus = await checkAccountLockout(client, user.id);
    if (lockStatus.locked) {
      console.warn(`[AUTH] Account is locked for email: ${maskEmail(email)}`);
      return {
        success: false,
        error: 'ACCOUNT_LOCKED',
        message: `Account is locked due to too many failed login attempts. Please try again later.`,
        lockedUntil: lockStatus.lockedUntil
      };
    }

    // Check if user is active
    if (!user.is_active) {
      console.warn(`[AUTH] User account is disabled for email: ${maskEmail(email)}`);
      return {
        success: false,
        error: 'ACCOUNT_DISABLED',
        message: 'This account has been disabled. Please contact an administrator.'
      };
>>>>>>> ca51ac36
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
<<<<<<< HEAD
      console.warn(`[AUTH] Invalid password for email: ${email}`);
      return null;
    }

    // Check if user is active
    if (!user.is_active) {
      console.warn(`[AUTH] User account is disabled for email: ${email}`);
      return null;
    }
=======
      console.warn(`[AUTH] Invalid password for email: ${maskEmail(email)}`);
      
      // Record failed attempt
      const failResult = await recordFailedLoginAttempt(client, user.id, email);
      
      if (failResult.locked) {
        return {
          success: false,
          error: 'ACCOUNT_LOCKED',
          message: `Account has been locked due to too many failed login attempts. Please try again after ${LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES} minutes.`,
          lockedUntil: failResult.lockedUntil
        };
      }
      
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: `Invalid email or password. ${failResult.remainingAttempts} attempt(s) remaining before account lockout.`,
        remainingAttempts: failResult.remainingAttempts
      };
    }

    // Successful login - reset failed attempts
    await resetFailedLoginAttempts(client, user.id);

    // Log successful login
    await client.query(`
      INSERT INTO "UserActivityLog" (id, user_id, action, details, created_at)
      VALUES (gen_random_uuid(), $1, 'SIGN_IN', $2, NOW())
    `, [user.id, JSON.stringify({ method: 'credentials' })]);
>>>>>>> ca51ac36

    // Get user permissions using direct foreign key
    const permissionsResult = await client.query(`
      SELECT ug.permissions
      FROM "User" u
      JOIN "UserGroup" ug ON u."userGroupId" = ug.id
      WHERE u.id = $1
    `, [user.id]);

    const permissions = permissionsResult.rows[0]?.permissions || [];

    return {
<<<<<<< HEAD
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
=======
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        avatarUrl: user.avatarUrl,
        personalColor: user.personal_color,
        modulePermissions: permissions,
      }
    };
  } catch (error) {
    console.error('[AUTH UTILS] Authentication error:', error);
    return {
      success: false,
      error: 'SYSTEM_ERROR',
      message: 'An error occurred during authentication. Please try again.'
    };
  } finally {
    console.log('[AUTH UTILS] Releasing client for:', maskEmail(email));
    client.release();
  }
}

/**
 * Unlocks a user account (admin function)
 */
export async function unlockUserAccount(userId: string, performedBy: string): Promise<boolean> {
  const client = await getPool().connect();
  try {
    // Reset lockout fields
    await client.query(`
      UPDATE "User"
      SET "failed_login_attempts" = 0,
          "last_failed_login" = NULL,
          "locked_until" = NULL,
          "updatedAt" = NOW()
      WHERE id = $1
    `, [userId]);
    
    // Log the unlock event
    await client.query(`
      INSERT INTO "UserActivityLog" (id, user_id, action, details, performed_by, created_at)
      VALUES (gen_random_uuid(), $1, 'ACCOUNT_UNLOCKED', $2, $3, NOW())
    `, [userId, JSON.stringify({ reason: 'Manual unlock by administrator' }), performedBy]);
    
    console.log(`[AUTH] Account unlocked for user: ${userId} by: ${performedBy}`);
    return true;
  } catch (error) {
    console.error('[AUTH UTILS] Unlock account error:', error);
    return false;
>>>>>>> ca51ac36
  } finally {
    client.release();
  }
}

/**
<<<<<<< HEAD
=======
 * Gets account lockout status for a user
 */
export async function getAccountLockoutStatus(userId: string): Promise<{
  failedAttempts: number;
  isLocked: boolean;
  lockedUntil: Date | null;
  lastFailedLogin: Date | null;
}> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT "failed_login_attempts", "locked_until", "last_failed_login"
      FROM "User"
      WHERE id = $1
    `, [userId]);
    
    const user = result.rows[0];
    if (!user) {
      return {
        failedAttempts: 0,
        isLocked: false,
        lockedUntil: null,
        lastFailedLogin: null
      };
    }
    
    const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
    const isLocked = lockedUntil ? lockedUntil > new Date() : false;
    
    return {
      failedAttempts: user.failed_login_attempts || 0,
      isLocked,
      lockedUntil: isLocked ? lockedUntil : null,
      lastFailedLogin: user.last_failed_login ? new Date(user.last_failed_login) : null
    };
  } catch (error) {
    console.error('[AUTH UTILS] Get lockout status error:', error);
    return {
      failedAttempts: 0,
      isLocked: false,
      lockedUntil: null,
      lastFailedLogin: null
    };
  } finally {
    client.release();
  }
}

// Export lockout configuration for use in other modules
export { LOCKOUT_CONFIG };

/**
>>>>>>> ca51ac36
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
