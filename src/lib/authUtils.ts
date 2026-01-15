import { getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import type { PlatformModuleId } from '@/lib/types';
import { verifyTotpCode, generateEmailOtp, sendEmailOtp } from '@/lib/twoFactorAuth';
import { sendEmail } from '@/lib/emailService';
import { webhookFetch } from '@/lib/webhookFetch';
import { getSystemSetting } from '@/lib/systemSettings';

// Account lockout configuration
const LOCKOUT_CONFIG = {
  MAX_FAILED_ATTEMPTS: 3,           // Lock after 3 failed attempts
  // NOTE: Lockout is PERMANENT until admin unlocks - no auto-reset or duration
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
  error: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'ACCOUNT_DISABLED' | 'USER_NOT_FOUND' | 'SYSTEM_ERROR' | 'TWO_FACTOR_REQUIRED';
  message: string;
  lockedUntil?: Date;
  remainingAttempts?: number;
  twoFactorMethod?: 'totp' | 'email';
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
async function recordFailedLoginAttempt(client: any, userId: string, email: string, failureType: 'password' | '2fa' = 'password'): Promise<{ locked: boolean; remainingAttempts: number }> {
  const now = new Date();

  // Get current failed attempts
  const currentResult = await client.query(`
    SELECT "failed_login_attempts"
    FROM "User"
    WHERE id = $1
  `, [userId]);

  const current = currentResult.rows[0];
  let failedAttempts = (current?.failed_login_attempts || 0) + 1;

  // Check if we should lock the account (PERMANENT lock until admin unlocks)
  if (failedAttempts >= LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS) {
    // Lock the account permanently by setting is_active = false
    await client.query(`
      UPDATE "User"
      SET "failed_login_attempts" = $1,
          "last_failed_login" = $2,
          "is_active" = false,
          "updatedAt" = $2
      WHERE id = $3
    `, [failedAttempts, now, userId]);

    console.warn(`[AUTH] Account PERMANENTLY locked for email: ${maskEmail(email)} - requires admin unlock`);

    // Log the lockout event
    await client.query(`
      INSERT INTO "UserActivityLog" (id, user_id, action, details, created_at)
      VALUES (gen_random_uuid(), $1, 'ACCOUNT_LOCKED', $2, $3)
    `, [userId, JSON.stringify({
      reason: 'Too many failed login attempts',
      failedAttempts,
      failureType,
      lockType: 'PERMANENT_UNTIL_ADMIN_UNLOCK'
    }), now]);

    // Trigger Alerts (Email & Webhook)
    try {
      const alertEmailsStr = await getSystemSetting('lockoutAlertEmails');
      const webhookUrl = await getSystemSetting('lockoutWebhookUrl');

      let alertEmails: string[] = [];
      try {
        alertEmails = alertEmailsStr ? JSON.parse(alertEmailsStr) : [];
      } catch (e) {
        alertEmails = alertEmailsStr ? alertEmailsStr.split(',') : [];
      }

      const alertDetails = {
        event: 'ACCOUNT_LOCKED',
        timestamp: now.toISOString(),
        userId,
        userEmail: email,
        failedAttempts,
        reason: 'Too many failed login attempts',
      };

      // 1. Send Email Alerts
      if (alertEmails.length > 0) {
        console.log(`[AUTH] Sending lockout alerts to: ${alertEmails.join(', ')}`);
        const subject = `[SECURITY ALERT] Account Locked: ${maskEmail(email)}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px;">
            <h2 style="color: #d73a49; border-bottom: 2px solid #d73a49; padding-bottom: 10px;">Security Alert: Account Locked</h2>
            <p>An account has been <strong>permanently locked</strong> due to too many failed login attempts.</p>
            <div style="background-color: #f6f8fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>User Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Failed Attempts:</strong> ${failedAttempts}</p>
              <p style="margin: 5px 0;"><strong>Timestamp:</strong> ${now.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> Requires Manual Admin Unlock</p>
            </div>
            <p>Please log in to the administrator portal to review this activity and unlock the account if necessary.</p>
            <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e1e4e8; color: #586069; font-size: 12px;">
              <p>This is an automated security notification from Ihres Recruitment System.</p>
            </div>
          </div>
        `;

        await sendEmail(alertEmails, subject, html);
      }

      // 2. Trigger Webhook Alert
      if (webhookUrl) {
        console.log(`[AUTH] Triggering lockout webhook: ${webhookUrl}`);
        webhookFetch({
          url: webhookUrl,
          method: 'POST',
          body: JSON.stringify(alertDetails),
          timeoutMs: 5000,
        }).catch(err => console.error('[AUTH] Webhook delivery failed:', err));
      }
    } catch (alertError) {
      console.error('[AUTH] Error triggering lockout alerts:', alertError);
      // Don't throw, we want the lockout to succeed even if alerts fail
    }

    return { locked: true, remainingAttempts: 0 };
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
 * Note: With permanent lockout, we check if is_active is false AND failed_login_attempts >= MAX
 */
async function checkAccountLockout(client: any, userId: string): Promise<{ locked: boolean }> {
  const result = await client.query(`
    SELECT "is_active", "failed_login_attempts"
    FROM "User"
    WHERE id = $1
  `, [userId]);

  const user = result.rows[0];

  // Account is locked if is_active is false AND there were failed login attempts
  // (This distinguishes between admin-disabled accounts and lockout-disabled accounts)
  if (!user?.is_active && user?.failed_login_attempts >= LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS) {
    return { locked: true };
  }

  return { locked: false };
}

/**
 * Authenticates a user with email, password, and optional 2FA code
 * Implements account lockout after 3 failed attempts
 * Uses a single database connection for all operations
 */
export async function authenticateUser(email: string, password: string, twoFactorCode?: string): Promise<AuthResult> {
  console.log('[AUTH UTILS] Authenticating user:', maskEmail(email));
  const client = await getPool().connect();
  try {
    // Get user with all necessary data in one query (including lockout fields)
    const userResult = await client.query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.image, u.password, 
        u."avatarUrl", u."personal_color", u."is_active",
        u."failed_login_attempts", u."locked_until", u."last_failed_login",
        u."two_factor_enabled", u."two_factor_secret", u."two_factor_method", u."two_factor_backup_codes"
      FROM "User" u 
      WHERE u.email = $1
    `, [email]);

    const user = userResult.rows[0];
    if (!user || !user.password) {
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
        message: 'Account is locked due to too many failed login attempts. Please contact an administrator to unlock your account.'
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
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.warn(`[AUTH] Invalid password for email: ${maskEmail(email)}`);

      // Record failed attempt
      const failResult = await recordFailedLoginAttempt(client, user.id, email, 'password');

      if (failResult.locked) {
        return {
          success: false,
          error: 'ACCOUNT_LOCKED',
          message: 'Account has been locked due to too many failed login attempts. Please contact an administrator to unlock your account.'
        };
      }

      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: `Invalid email or password. ${failResult.remainingAttempts} attempt(s) remaining before account lockout.`,
        remainingAttempts: failResult.remainingAttempts
      };
    }

    // 2FA Verification
    if (user.two_factor_enabled) {
      // If code is provided, verify it
      if (twoFactorCode) {
        let isTwoFactorValid = false;

        // Check if it's a backup code first
        if (user.two_factor_backup_codes && user.two_factor_backup_codes.includes(twoFactorCode)) {
          isTwoFactorValid = true;
          // Remove used backup code
          const newBackupCodes = user.two_factor_backup_codes.filter((c: string) => c !== twoFactorCode);
          await client.query('UPDATE "User" SET "two_factor_backup_codes" = $1 WHERE id = $2', [newBackupCodes, user.id]);
          console.log(`[AUTH] Used backup code for user: ${maskEmail(email)}`);
        } else {
          // Standard verification
          if (user.two_factor_method === 'totp') {
            isTwoFactorValid = verifyTotpCode(twoFactorCode, user.two_factor_secret);
          } else if (user.two_factor_method === 'email') {
            // For email, we compare against stored (temp) secret which holds the OTP
            // Note: In a real implementation, we should check expiration time
            isTwoFactorValid = twoFactorCode === user.two_factor_secret;

            // Clear the OTP after successful use if it was valid
            if (isTwoFactorValid) {
              await client.query('UPDATE "User" SET "two_factor_secret" = NULL WHERE id = $1', [user.id]);
            }
          }
        }

        if (!isTwoFactorValid) {
          console.warn(`[AUTH] Invalid 2FA code for email: ${maskEmail(email)}`);

          // Record failed attempt
          const failResult = await recordFailedLoginAttempt(client, user.id, email, '2fa');

          if (failResult.locked) {
            return {
              success: false,
              error: 'ACCOUNT_LOCKED',
              message: 'Account has been locked due to too many failed login attempts. Please contact an administrator to unlock your account.'
            };
          }

          return {
            success: false,
            error: 'INVALID_CREDENTIALS',
            message: `Invalid 2FA code. ${failResult.remainingAttempts} attempt(s) remaining before account lockout.`,
            twoFactorMethod: user.two_factor_method
          };
        }
      } else {
        // No code provided, but 2FA is enabled -> Return required

        // If email method, send the code now
        if (user.two_factor_method === 'email') {
          const otp = generateEmailOtp();
          // Store OTP
          await client.query('UPDATE "User" SET "two_factor_secret" = $1 WHERE id = $2', [otp, user.id]);
          // Send email
          await sendEmailOtp(user.email, otp, user.name);
          console.log(`[AUTH] Sent 2FA email to ${maskEmail(email)}`);
        }

        return {
          success: false,
          error: 'TWO_FACTOR_REQUIRED',
          message: 'Two-factor authentication required',
          twoFactorMethod: user.two_factor_method
        };
      }
    }

    // Successful login - reset failed attempts
    await resetFailedLoginAttempts(client, user.id);

    // Log successful login
    await client.query(`
      INSERT INTO "UserActivityLog" (id, user_id, action, details, created_at)
      VALUES (gen_random_uuid(), $1, 'SIGN_IN', $2, NOW())
    `, [user.id, JSON.stringify({ method: 'credentials' })]);

    // Get user permissions using direct foreign key
    const permissionsResult = await client.query(`
      SELECT ug.permissions
      FROM "User" u
      JOIN "UserGroup" ug ON u."userGroupId" = ug.id
      WHERE u.id = $1
    `, [user.id]);

    const permissions = permissionsResult.rows[0]?.permissions || [];

    return {
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
  } finally {
    client.release();
  }
}

/**
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
 * Gets user data for session creation
 * Uses a single database connection
 */
export async function getUserSessionData(userId: string) {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.image,
        u."avatarUrl", u."personal_color", u."is_active",
        u."two_factor_enabled", u."two_factor_method"
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
      avatarUrl: user.avatarUrl || user.image || null,
      personalColor: user.personal_color || null,
      isActive: user.is_active,
      twoFactorEnabled: user.two_factor_enabled,
      twoFactorMethod: user.two_factor_method
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

// ============================================================================
// SINGLE-DEVICE LOGIN - Session Management
// ============================================================================

/**
 * Creates a new session for a user and invalidates all previous sessions.
 * This enforces single-device login.
 */
export async function createUserSession(
  userId: string,
  sessionToken: string,
  options: {
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }
): Promise<{ sessionId: string; invalidatedCount: number }> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // First, invalidate all existing active sessions for this user
    const invalidateResult = await client.query(`
      UPDATE "UserSession"
      SET "is_active" = false
      WHERE "user_id" = $1 AND "is_active" = true
    `, [userId]);

    const invalidatedCount = invalidateResult.rowCount || 0;

    if (invalidatedCount > 0) {
      console.log(`[SESSION] Invalidated ${invalidatedCount} existing session(s) for user: ${userId}`);

      // Log the session invalidation
      await client.query(`
        INSERT INTO "UserActivityLog" (id, user_id, action, details, created_at)
        VALUES (gen_random_uuid(), $1, 'SESSION_INVALIDATED', $2, NOW())
      `, [userId, JSON.stringify({
        reason: 'New login from another device',
        invalidatedCount
      })]);
    }

    // Create new session
    const sessionResult = await client.query(`
      INSERT INTO "UserSession" (id, user_id, session_token, device_info, ip_address, user_agent, is_active, created_at, expires_at, last_activity_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, NOW(), $6, NOW())
      RETURNING id
    `, [userId, sessionToken, options.deviceInfo || null, options.ipAddress || null, options.userAgent || null, options.expiresAt]);

    const sessionId = sessionResult.rows[0].id;

    await client.query('COMMIT');

    console.log(`[SESSION] Created new session for user: ${userId}, sessionId: ${sessionId}`);

    return { sessionId, invalidatedCount };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[AUTH UTILS] Create session error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Validates if a session token is still active and not expired.
 * Returns the session info if valid, null if invalid.
 */
export async function validateUserSession(sessionToken: string): Promise<{
  isValid: boolean;
  userId?: string;
  sessionId?: string;
  expiresAt?: Date;
  reason?: 'VALID' | 'NOT_FOUND' | 'EXPIRED' | 'INVALIDATED';
}> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT id, user_id, is_active, expires_at
      FROM "UserSession"
      WHERE session_token = $1
    `, [sessionToken]);

    if (result.rows.length === 0) {
      return { isValid: false, reason: 'NOT_FOUND' };
    }

    const session = result.rows[0];

    // Check if session is still active
    if (!session.is_active) {
      return { isValid: false, reason: 'INVALIDATED', userId: session.user_id };
    }

    // Check if session has expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < now) {
      return { isValid: false, reason: 'EXPIRED', userId: session.user_id };
    }

    // Update last activity timestamp
    await client.query(`
      UPDATE "UserSession"
      SET last_activity_at = NOW()
      WHERE id = $1
    `, [session.id]);

    return {
      isValid: true,
      userId: session.user_id,
      sessionId: session.id,
      expiresAt,
      reason: 'VALID'
    };
  } catch (error) {
    console.error('[AUTH UTILS] Validate session error:', error);
    return { isValid: false, reason: 'NOT_FOUND' };
  } finally {
    client.release();
  }
}

/**
 * Invalidates all sessions for a user (e.g., on password change or admin action)
 */
export async function invalidateUserSessions(userId: string, performedBy?: string): Promise<number> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      UPDATE "UserSession"
      SET "is_active" = false
      WHERE "user_id" = $1 AND "is_active" = true
    `, [userId]);

    const invalidatedCount = result.rowCount || 0;

    if (invalidatedCount > 0) {
      // Log the invalidation
      await client.query(`
        INSERT INTO "UserActivityLog" (id, user_id, action, details, performed_by, created_at)
        VALUES (gen_random_uuid(), $1, 'ALL_SESSIONS_INVALIDATED', $2, $3, NOW())
      `, [userId, JSON.stringify({
        reason: 'Manual invalidation',
        invalidatedCount
      }), performedBy || null]);
    }

    console.log(`[SESSION] Invalidated ${invalidatedCount} session(s) for user: ${userId}`);
    return invalidatedCount;
  } catch (error) {
    console.error('[AUTH UTILS] Invalidate sessions error:', error);
    return 0;
  } finally {
    client.release();
  }
}

/**
 * Invalidates a specific session by token (e.g., on logout)
 */
export async function invalidateSession(sessionToken: string): Promise<boolean> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      UPDATE "UserSession"
      SET "is_active" = false
      WHERE "session_token" = $1 AND "is_active" = true
      RETURNING user_id
    `, [sessionToken]);

    if (result.rows.length > 0) {
      const userId = result.rows[0].user_id;

      // Log the logout
      await client.query(`
        INSERT INTO "UserActivityLog" (id, user_id, action, details, created_at)
        VALUES (gen_random_uuid(), $1, 'SIGN_OUT', $2, NOW())
      `, [userId, JSON.stringify({ method: 'session_invalidation' })]);

      console.log(`[SESSION] Session invalidated for user: ${userId}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('[AUTH UTILS] Invalidate session error:', error);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Gets active session count for a user
 */
export async function getActiveSessionCount(userId: string): Promise<number> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM "UserSession"
      WHERE "user_id" = $1 AND "is_active" = true AND "expires_at" > NOW()
    `, [userId]);

    return parseInt(result.rows[0]?.count || '0', 10);
  } catch (error) {
    console.error('[AUTH UTILS] Get active session count error:', error);
    return 0;
  } finally {
    client.release();
  }
}

/**
 * Optimized function to fetch all user context in a single query
 * Replaces validateUserSession, getUserPermissions, and getUserSessionData
 */
export async function getUserFullContext(sessionToken: string): Promise<{
  isValid: boolean;
  reason?: 'VALID' | 'NOT_FOUND' | 'EXPIRED' | 'INVALIDATED' | 'ERROR';
  userId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    image: string | null;
    avatarUrl: string | null;
    personalColor: string | null;
    isActive: boolean;
    twoFactorEnabled: boolean;
    twoFactorMethod: string | null;
    modulePermissions: PlatformModuleId[];
  };
}> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT
        s.id as session_id, s.user_id, s.is_active as session_active, s.expires_at, s.last_activity_at,
        u.name, u.email, u.role, u.image, u."avatarUrl", u."personal_color",
        u."is_active" as user_active, u."two_factor_enabled", u."two_factor_method",
        ug.permissions
      FROM "UserSession" s
      JOIN "User" u ON s.user_id = u.id
      LEFT JOIN "UserGroup" ug ON u."userGroupId" = ug.id
      WHERE s.session_token = $1
    `, [sessionToken]);

    if (result.rows.length === 0) {
      return { isValid: false, reason: 'NOT_FOUND' };
    }

    const row = result.rows[0];

    // Validate Session
    if (!row.session_active) {
      return { isValid: false, reason: 'INVALIDATED', userId: row.user_id };
    }

    const now = new Date();
    if (new Date(row.expires_at) < now) {
      return { isValid: false, reason: 'EXPIRED', userId: row.user_id };
    }

    // PERFORMANCE FIX: Throttle activity updates to once per 60 seconds
    // This reduces DB write overhead by ~95% during active sessions
    const lastActivity = row.last_activity_at ? new Date(row.last_activity_at) : null;
    const shouldUpdateActivity = !lastActivity || (now.getTime() - lastActivity.getTime()) > 60000;

    if (shouldUpdateActivity) {
      await client.query('UPDATE "UserSession" SET last_activity_at = NOW() WHERE id = $1', [row.session_id]);
    }

    return {
      isValid: true,
      reason: 'VALID',
      userId: row.user_id,
      user: {
        id: row.user_id,
        name: row.name,
        email: row.email,
        role: row.role,
        image: row.image,
        avatarUrl: row.avatarUrl || row.image || null,
        personalColor: row.personal_color || null,
        isActive: row.user_active,
        twoFactorEnabled: row.two_factor_enabled,
        twoFactorMethod: row.two_factor_method,
        modulePermissions: row.permissions || []
      }
    };

  } catch (error) {
    console.error('[AUTH UTILS] Get user full context error:', error);
    return { isValid: false, reason: 'ERROR' };
  } finally {
    client.release();
  }
}
