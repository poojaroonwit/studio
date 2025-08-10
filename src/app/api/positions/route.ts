/**
 * @openapi
 * /api/positions:
 *   get:
 *     summary: Get all positions
 *     description: Returns a list of all positions.
 *     responses:
 *       200:
 *         description: List of positions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Position'
 *   post:
 *     summary: Create a new position
 *     description: Creates a new position.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Position'
 *     responses:
 *       201:
 *         description: Position created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Position'
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '@/lib/db';
import { handleCors } from '@/lib/cors';
import { dispatchWebhooks } from '@/lib/webhookDispatcher';
import { getDefaultMatchCriteria } from '@/lib/systemSettings';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Publicly viewable, but actions (POST, PUT, DELETE) might be restricted
  // if (!session?.user) {
  //   return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  // }

  try {
    const { searchParams } = new URL(request.url);
    const titleFilter = searchParams.get('title');
    const departmentFilter = searchParams.get('department'); // Expects comma-separated strings
    const isOpenFilter = searchParams.get('isOpen');
    const positionLevelFilter = searchParams.get('positionLevel');
    const recruiterIdFilter = searchParams.get('recruiterId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeCandidateStats = searchParams.get('includeCandidateStats') === 'true';

    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is not set");
      return NextResponse.json({ 
        message: "Database configuration error", 
        error: "DATABASE_URL environment variable is not set" 
      }, { status: 500, headers: handleCors(request) });
    }

    // Build database query with proper filtering
    try {
      // Build WHERE conditions and parameters
      const conditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (titleFilter) {
        conditions.push(`p.title ILIKE $${paramIndex++}`);
        queryParams.push(`%${titleFilter}%`);
      }

      if (departmentFilter) {
        conditions.push(`p.department = $${paramIndex++}`);
        queryParams.push(departmentFilter);
      }

      if (isOpenFilter === 'true') {
        conditions.push(`p."isOpen" = TRUE`);
      } else if (isOpenFilter === 'false') {
        conditions.push(`p."isOpen" = FALSE`);
      }

      if (positionLevelFilter) {
        conditions.push(`p."positionLevel" ILIKE $${paramIndex++}`);
        queryParams.push(`%${positionLevelFilter}%`);
      }

      if (recruiterIdFilter) {
        if (recruiterIdFilter === 'null' || recruiterIdFilter === 'unassigned') {
          conditions.push(`p."recruiterId" IS NULL`);
        } else {
          conditions.push(`p."recruiterId" = $${paramIndex++}`);
          queryParams.push(recruiterIdFilter);
        }
      }

      const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

      // Build the main query with filtering
      const mainQuery = `
        SELECT 
          p.id, 
          p.title, 
          p.department, 
          p.description, 
          p."matchCriteria", 
          p."isOpen", 
          p."positionLevel", 
          p."recruiterId", 
          p."customAttributes", 
          p."createdAt", 
          p."updatedAt",
          u.name as "recruiterName"
        FROM "Position" p 
        LEFT JOIN "User" u ON p."recruiterId" = u.id
        ${whereClause}
        ORDER BY p."createdAt" DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      // Add limit and offset to params
      queryParams.push(limit, offset);
      
      const countQuery = `SELECT COUNT(*) as count FROM "Position" p ${whereClause}`;
      
      const pool = getPool();
      
      // Execute queries with parameters
      const result = await pool.query(mainQuery, queryParams);
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset for count
      const total = parseInt(countResult.rows[0].count, 10);
      
      let positions = result.rows.map(row => ({
          ...row,
          custom_attributes: row.customAttributes || {},
      }));
      


      // Include candidate statistics for each position if requested
      if (includeCandidateStats && positions.length > 0) {
        const positionIds = positions.map(p => p.id);
        
        // Get candidate statistics for all positions
        const candidateStatsQuery = `
          WITH position_applied AS (
            SELECT 
              p.id as position_id,
              COUNT(c.id) as total_applied,
              COUNT(c.id) as applied_status_count
            FROM "Position" p
            LEFT JOIN "Candidate" c ON p.id = c."positionId"
            WHERE p.id = ANY($1::uuid[])
            GROUP BY p.id
          ),
          position_matching AS (
            SELECT 
              p.id as position_id,
              COUNT(DISTINCT jm."candidateId") as total_matching
            FROM "Position" p
            LEFT JOIN "JobMatch" jm ON p.id = jm."jobId"
            WHERE p.id = ANY($1::uuid[])
            GROUP BY p.id
          )
          SELECT 
            pa.position_id,
            COALESCE(pa.total_applied, 0) as total_applied,
            COALESCE(pa.applied_status_count, 0) as applied_status_count,
            COALESCE(pm.total_matching, 0) as total_matching
          FROM position_applied pa
          LEFT JOIN position_matching pm ON pa.position_id = pm.position_id
        `;
        
        let statsResult;
        try {
          statsResult = await getPool().query(candidateStatsQuery, [positionIds]);
        } catch (statsError) {
          console.error("Error fetching candidate statistics:", statsError);
          // Continue without statistics rather than failing the entire request
          statsResult = { rows: [] };
        }
        
        const statsMap = new Map();
        statsResult.rows.forEach(row => {
          statsMap.set(row.position_id, {
            totalApplied: parseInt(row.total_applied, 10),
            appliedStatusCount: parseInt(row.applied_status_count, 10),
            totalMatching: parseInt(row.total_matching, 10)
          });
        });
        
        // Add candidate statistics to each position
        positions = positions.map(position => ({
          ...position,
          candidateStats: statsMap.get(position.id) || {
            totalApplied: 0,
            appliedStatusCount: 0,
            totalMatching: 0
          }
        }));
      }

      // Include statistics if requested
      let statistics = null;
      if (includeStats) {
        // Statistics query with same filtering as main query
        const statsQuery = `
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN p."isOpen" = TRUE THEN 1 END) as open,
            COUNT(CASE WHEN p."isOpen" = FALSE THEN 1 END) as closed
          FROM "Position" p
          ${whereClause}
        `;
        
        let statsResult;
        try {
          // Use the same filter parameters but exclude limit and offset
          const statsParams = queryParams.slice(0, -2);
          statsResult = await getPool().query(statsQuery, statsParams);
          const stats = statsResult.rows[0];
          
          statistics = { 
            total: parseInt(stats.total, 10), 
            open: parseInt(stats.open, 10), 
            closed: parseInt(stats.closed, 10) 
          };
        } catch (statsError) {
          console.error("Error fetching position statistics:", statsError);
          // Continue without statistics rather than failing the entire request
          statistics = { total: 0, open: 0, closed: 0 };
        }
      }
      
      const response: { data: any[]; total: number; statistics?: any } = { data: positions, total };
      if (statistics) {
        response.statistics = statistics;
      }
      
      return NextResponse.json(response, { status: 200, headers: handleCors(request) });
         } catch (dbError) {
       console.error("Database error:", dbError);
       return NextResponse.json({ 
         message: "Database error", 
         error: (dbError as Error).message 
       }, { status: 500, headers: handleCors(request) });
     }
  } catch (error) {
    console.error("Failed to fetch positions:", error);
    await logAudit('ERROR', `Failed to fetch positions. Error: ${(error as Error).message}`, 'API:Positions:GetAll', session?.user?.id);
    return NextResponse.json({ message: "Error fetching positions", error: (error as Error).message }, { status: 500, headers: handleCors(request) });
  }
}

const createPositionSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  department: z.string().min(1, { message: "Department is required" }),
  description: z.string().optional().nullable(),
  matchCriteria: z.string().optional().nullable(),
  isOpen: z.boolean({ required_error: "isOpen status is required" }),
  positionLevel: z.string().optional().nullable(),
  recruiterId: z.string().uuid().optional().nullable(),
  custom_attributes: z.record(z.any()).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id || null;
  const actingUserName = session?.user?.name || session?.user?.email || 'System (API Create)';

  if (!session?.user || (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('POSITIONS_MANAGE'))) {
    await logAudit('WARN', `Forbidden attempt to create position by ${actingUserName}.`, 'API:Positions:Create', actingUserId);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403, headers: handleCors(request) });
  }

  // Get default match criteria from system settings
  const defaultMatchCriteria = await getDefaultMatchCriteria();

  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Error parsing request body for new position:", error);
    return NextResponse.json({ message: "Error parsing request body", error: (error as Error).message }, { status: 400, headers: handleCors(request) });
  }

  const validationResult = createPositionSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { message: "Invalid input", errors: validationResult.error.flatten().fieldErrors },
      { status: 400, headers: handleCors(request) }
    );
  }
  
  const validatedData = validationResult.data;

  try {
    const newPositionId = uuidv4();
    const insertQuery = `
      INSERT INTO "Position" (id, title, department, description, "matchCriteria", "isOpen", "positionLevel", "recruiterId", "customAttributes", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *;
    `;
    const values = [
      newPositionId,
      validatedData.title,
      validatedData.department,
      validatedData.description || null,
      (validatedData.matchCriteria && validatedData.matchCriteria.trim() !== '') ? validatedData.matchCriteria : defaultMatchCriteria,
      validatedData.isOpen,
      validatedData.positionLevel || null,
      validatedData.recruiterId || null,
      validatedData.custom_attributes || {},
    ];
    const result = await getPool().query(insertQuery, values);
    const newPosition = {
        ...result.rows[0],
        custom_attributes: result.rows[0].customAttributes || {},
    };

    // Invalidate cache
    // Remove all dynamic imports and usages of getRedisClient, CACHE_KEY_POSITIONS, and redisClient. Use SSE or direct DB queries only.
    
    await logAudit('AUDIT', `Position '${newPosition.title}' (ID: ${newPosition.id}) created by ${actingUserName}.`, 'API:Positions:Create', actingUserId, { targetPositionId: newPosition.id, title: newPosition.title, department: newPosition.department, positionLevel: newPosition.positionLevel });
    
    // Dispatch webhook for position creation
    try {
      await dispatchWebhooks.positionCreated(newPosition);
    } catch (webhookError) {
      console.error('Failed to dispatch position creation webhook:', webhookError);
      // Don't fail the request if webhook fails
    }
    
    return NextResponse.json(newPosition, { status: 201, headers: handleCors(request) });
  } catch (error) {
    console.error("Failed to create position:", error);
    await logAudit('ERROR', `Failed to create position '${validatedData.title}' by ${actingUserName}. Error: ${(error as Error).message}`, 'API:Positions:Create', actingUserId, { title: validatedData.title });
    return NextResponse.json({ message: "Error creating position", error: (error as Error).message }, { status: 500, headers: handleCors(request) });
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new NextResponse(null, { status: 200, headers });
}
