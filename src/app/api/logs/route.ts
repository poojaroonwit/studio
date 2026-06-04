// src/app/api/logs/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import type { LogEntry, LogLevel } from '@/lib/types';
import { z } from 'zod';
import { getPool } from '../../../lib/db';
import { requireApiPermission } from '@/lib/api-route-guards';


export const dynamic = 'force-dynamic';


const logLevelValues: [LogLevel, ...LogLevel[]] = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'AUDIT'];

const createLogEntrySchema = z.object({
  level: z.enum(logLevelValues),
  message: z.string().min(1, { message: "Log message cannot be empty" }),
  source: z.string().optional(),
  timestamp: z.string().datetime({ message: "Invalid datetime string. Must be UTC ISO8601" }).optional(),
  actingUserId: z.string().uuid().nullable().optional(),
  details: z.record(z.any()).nullable().optional(),
});

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Failed to parse log request body:", error);
    return NextResponse.json({ message: "Error parsing request body", error: (error as Error).message }, { status: 400 });
  }

  const validationResult = createLogEntrySchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { message: "Invalid log entry data", errors: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const validatedData = validationResult.data;
  const level = validatedData.level;
  const message = validatedData.message;
  const source = validatedData.source;
  const timestamp = validatedData.timestamp;
  const actingUserId = validatedData.actingUserId;
  const details = validatedData.details;

  try {
    // Validate actingUserId exists; if not, null it to avoid FK violations
    let sanitizedActingUserId: string | null = actingUserId || null;
    if (sanitizedActingUserId) {
      try {
        const userCheck = await getPool().query('SELECT 1 FROM "User" WHERE id = $1 LIMIT 1', [sanitizedActingUserId]);
        if (userCheck.rowCount === 0) {
          sanitizedActingUserId = null;
        }
      } catch (_) {
        // On any error checking user existence, fall back to null to keep logging resilient
        sanitizedActingUserId = null;
      }
    }
    const insertQuery = `
      INSERT INTO "LogEntry" (timestamp, level, message, source, "actingUserId", details, "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;
    const values = [
      timestamp ? new Date(timestamp) : new Date(), 
      level,
      message,
      source,
      sanitizedActingUserId,
      details || null,
    ];
    const result = await getPool().query(insertQuery, values);
    const logEntry = result.rows[0];
    
    const logEntryData = {
      id: logEntry.id,
      timestamp: logEntry.timestamp,
      level: logEntry.level,
      message: logEntry.message,
      source: logEntry.source,
      actingUserId: logEntry.actingUserId,
      details: logEntry.details,
    };
    

    
    return NextResponse.json(logEntry, { status: 201 });
  } catch (error) {
    console.error("Failed to create log entry:", error);
    return NextResponse.json({ message: "Error creating log entry", error: (error as Error).message }, { status: 500 });
  }
}

/**
 * @openapi
 * /api/logs:
 *   get:
 *     summary: Get system logs
 *     description: Returns a paginated list of system and application logs. Requires authentication.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *         example: 20
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [INFO, WARN, ERROR, DEBUG, AUDIT]
 *         description: Filter by log level
 *         example: ERROR
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in message or source
 *         example: "database"
 *       - in: query
 *         name: actingUserId
 *         schema:
 *           type: string
 *         description: Filter by acting user ID
 *         example: "user-uuid"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs after this date
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs before this date
 *         example: "2024-01-31T23:59:59.999Z"
 *     responses:
 *       200:
 *         description: Paginated logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *             examples:
 *               success:
 *                 summary: Example response
 *                 value:
 *                   data:
 *                     - id: "uuid"
 *                       timestamp: "2024-01-01T12:00:00.000Z"
 *                       level: "ERROR"
 *                       message: "Database connection failed"
 *                       source: "API:Positions:GetAll"
 *                       actingUserId: "user-uuid"
 *                       actingUserName: "Alice"
 *                   pagination:
 *                     page: 1
 *                     limit: 20
 *                     total: 1
 *                     totalPages: 1
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
    const { response } = await requireApiPermission('LOGS_VIEW');
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;
    const level = searchParams.get('level') as LogLevel | null;
    const search = searchParams.get('search');
    const actingUserId = searchParams.get('actingUserId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let whereClauses: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (level) {
        whereClauses.push(`level = $${paramIndex++}`);
        queryParams.push(level);
    }

    if (search && search.trim()) {
        whereClauses.push(`(message ILIKE $${paramIndex} OR source ILIKE $${paramIndex})`);
        queryParams.push(`%${search.trim()}%`);
        paramIndex++;
    }

    if (actingUserId && actingUserId !== 'ALL') {
        whereClauses.push(`"actingUserId" = $${paramIndex++}`);
        queryParams.push(actingUserId);
    }

    if (startDate) {
        whereClauses.push(`timestamp >= $${paramIndex++}`);
        queryParams.push(new Date(startDate));
    }

    if (endDate) {
        whereClauses.push(`timestamp <= $${paramIndex++}`);
        queryParams.push(new Date(endDate));
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const client = await getPool().connect();
    try {
        const logsQuery = `
            SELECT l.*, u.name as "actingUserName"
            FROM "LogEntry" l
            LEFT JOIN "User" u ON l."actingUserId" = u.id
            ${whereString}
            ORDER BY l.timestamp DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
        `;
        const logsResult = await client.query(logsQuery, [...queryParams, limit, offset]);
        
        const totalQuery = `
            SELECT COUNT(*) 
            FROM "LogEntry" l
            LEFT JOIN "User" u ON l."actingUserId" = u.id
            ${whereString};
        `;
        const totalResult = await client.query(totalQuery, queryParams);
        const total = parseInt(totalResult.rows[0].count, 10);

        return NextResponse.json({
            data: logsResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });

    } catch (error: any) {
        console.error('Failed to fetch logs:', error);
        return NextResponse.json({ message: 'Error fetching logs', error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
