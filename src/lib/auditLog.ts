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
    const query = `
      INSERT INTO "LogEntry" (id, timestamp, level, message, source, "actingUserId", details, "createdAt")
      VALUES ($1, NOW(), $2, $3, $4, $5, $6, NOW());
    `;
    await client.query(query, [uuidv4(), level, message, source, actingUserId, details]);
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
    const query = `
      INSERT INTO "LogEntry" (id, timestamp, level, message, source, "actingUserId", details, "createdAt")
      VALUES ($1, NOW(), $2, $3, $4, $5, $6, NOW());
    `;
    // Map action/entity/entityId to message/source
    const message = `${action} on ${entity} (${entityId})`;
    const source = `logAuditEvent:${entity}`;
    await client.query(query, [uuidv4(), 'AUDIT', message, source, userId, details]);
  } finally {
    client.release();
  }
}