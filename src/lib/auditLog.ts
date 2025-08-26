// src/lib/auditLog.ts
import { getSafeDbClient } from './db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Writes an audit log entry to the database.
 */
export async function logAudit(
  level: 'INFO' | 'WARN' | 'ERROR' | 'AUDIT',
  message: string,
  source: string,
  actingUserId: string | null = null,
  details: Record<string, any> | null = null
) {
  const client = await getSafeDbClient();
  try {
    // Ensure actingUserId refers to an existing user; otherwise set to null to avoid FK errors
    let sanitizedActingUserId: string | null = actingUserId;
    if (sanitizedActingUserId) {
      try {
        const check = await client.query('SELECT 1 FROM "User" WHERE id = $1 LIMIT 1', [sanitizedActingUserId]);
        if (check.rowCount === 0) {
          sanitizedActingUserId = null;
        }
      } catch (_) {
        sanitizedActingUserId = null;
      }
    }
    const query = `
      INSERT INTO "LogEntry" (id, timestamp, level, message, source, "actingUserId", details, "createdAt")
      VALUES ($1, NOW(), $2, $3, $4, $5, $6, NOW());
    `;
    await client.query(query, [uuidv4(), level, message, source, sanitizedActingUserId, details]);
  } catch (error) {
    // If the log itself fails, we log to the console as a fallback.
    // This is critical to ensure logging failures don't crash the application.
    console.error('CRITICAL: Failed to write to LogEntry table:', error);
    console.error('Fallback Log:', { level, message, source, actingUserId, details });
  } finally {
    client.release();
  }
}

export async function logAuditEvent(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  details: Record<string, any> | null = null
) {
  const client = await getSafeDbClient();
  try {
    // Validate userId
    let sanitizedUserId: string | null = userId;
    try {
      const check = await client.query('SELECT 1 FROM "User" WHERE id = $1 LIMIT 1', [sanitizedUserId]);
      if (check.rowCount === 0) {
        sanitizedUserId = null;
      }
    } catch (_) {
      sanitizedUserId = null;
    }
    const query = `
      INSERT INTO "LogEntry" (id, timestamp, level, message, source, "actingUserId", details, "createdAt")
      VALUES ($1, NOW(), $2, $3, $4, $5, $6, NOW());
    `;
    // Map action/entity/entityId to message/source
    const message = `${action} on ${entity} (${entityId})`;
    const source = `logAuditEvent:${entity}`;
    await client.query(query, [uuidv4(), 'AUDIT', message, source, sanitizedUserId, details]);
  } finally {
    client.release();
  }
}