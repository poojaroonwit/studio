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
  details: Record<string, any> | null = null,
  impersonatorId: string | null = null
) {
  const client = await getSafeDbClient();
  try {
    console.log('[AUDIT LOG] Starting audit log for:', { level, message, source, actingUserId });
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
    const enrichedDetails = impersonatorId ? { ...details, impersonatorId } : details;
    await client.query(query, [logId, level, message, source, sanitizedActingUserId, enrichedDetails]);
    
    const logEntry = {
      id: logId,
      timestamp: new Date(),
      level,
      message,
      source,
      actingUserId: sanitizedActingUserId,
      details: enrichedDetails,
    };
    

    

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
  details: Record<string, any> | null = null,
  impersonatorId: string | null = null
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
    const logId = uuidv4();
    const query = `
      INSERT INTO "LogEntry" (id, timestamp, level, message, source, "actingUserId", details, "createdAt")
      VALUES ($1, NOW(), $2, $3, $4, $5, $6, NOW());
    `;
    // Map action/entity/entityId to message/source
    const message = `${action} on ${entity} (${entityId})`;
    const source = `logAuditEvent:${entity}`;
    const enrichedDetails = impersonatorId ? { ...details, impersonatorId } : details;
    await client.query(query, [logId, 'AUDIT', message, source, sanitizedUserId, enrichedDetails]);
    
    const logEntry = {
      id: logId,
      timestamp: new Date(),
      level: 'AUDIT',
      message,
      source,
      actingUserId: sanitizedUserId,
      details: enrichedDetails,
    };
    

  } catch (error) {
    // If the log itself fails, we log to the console as a fallback.
    console.error('CRITICAL: Failed to write to LogEntry table:', error);
    console.error('Fallback Log:', { userId, action, entity, entityId, details });
  } finally {
    client.release();
  }
}
