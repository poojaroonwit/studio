import type { Session } from "next-auth";

import { getPool } from "@/lib/db";

const USER_VALIDATION_CACHE_TTL_MS = 5 * 60 * 1000;
const userValidationCache = new Map<string, { exists: boolean; timestamp: number }>();

export async function validateUserExists(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const cached = userValidationCache.get(userId);
  if (cached && Date.now() - cached.timestamp < USER_VALIDATION_CACHE_TTL_MS) {
    return cached.exists;
  }

  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT id FROM "User" WHERE id = $1 AND "is_active" = true', [userId]);
    const exists = result.rows.length > 0;
    userValidationCache.set(userId, { exists, timestamp: Date.now() });
    return exists;
  } catch {
    return false;
  } finally {
    client.release();
  }
}

export function clearUserValidationCache(userId?: string) {
  if (userId) {
    userValidationCache.delete(userId);
  } else {
    userValidationCache.clear();
  }
}

async function getInactiveUserSessionError(userId: string) {
  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT "is_active" FROM "User" WHERE id = $1', [userId]);
    if (result.rows.length > 0 && !result.rows[0].is_active) {
      return "Your account has been disabled. Please contact your administrator.";
    }
  } catch (error) {
    console.error("[VALIDATE USER SESSION] Error checking user status:", error);
  } finally {
    client.release();
  }

  return "Invalid user session. Please sign in again.";
}

export async function validateUserSession(session: Session | null): Promise<{
  isValid: boolean;
  userId?: string;
  userName?: string;
  error?: string;
}> {
  if (!session?.user?.id) {
    return { isValid: false, error: "No user session found" };
  }

  const userId = session.user.id;
  const userName = session.user.name || session.user.email || "System";
  const userExists = await validateUserExists(userId);

  if (!userExists) {
    return {
      isValid: false,
      error: await getInactiveUserSessionError(userId),
      userId,
      userName,
    };
  }

  return { isValid: true, userId, userName };
}
