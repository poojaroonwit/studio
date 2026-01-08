import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

import { auth } from '@/auth';
// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';

// Types
interface PositionFilters {
  title?: string;
  department?: string;
  isOpen?: string;
  positionLevel?: string;
  limit?: number; // Optional since we don't use pagination
  offset?: number; // Optional since we don't use pagination
}

interface Position {
  id: string;
  title: string;
  department: string;
  description?: string;
  isOpen: boolean;
  positionLevel?: string;
  customAttributes?: any;
  createdAt: string;
  updatedAt: string;
  gradeId?: string; // Added for linking to Grade
  grade?: { // Added for nested grade data
    id: string;
    name: string;
    label: string;
    color: string;
    slaDays: number;
    createdAt: string;
    updatedAt: string;
  };
}

// Constants
const DEFAULT_LIMIT = 1000; // Much higher limit for "all" endpoint
const DEFAULT_OFFSET = 0;
const MAX_LIMIT = 10000; // Very high max limit for "all" endpoint

// Helper functions
function parseFilters(searchParams: URLSearchParams): PositionFilters {
  return {
    title: searchParams.get('title') || undefined,
    department: searchParams.get('department') || undefined,
    isOpen: searchParams.get('isOpen') || undefined,
    positionLevel: searchParams.get('positionLevel') || undefined,
    limit: 0, // Not used for "all" endpoint
    offset: 0  // Not used for "all" endpoint
  };
}

function buildQuery(filters: PositionFilters, userRole?: string, userId?: string, shouldRestrict?: boolean, hasViewAllPermission?: boolean): { query: string; params: any[] } {
  let query = `
    SELECT 
      p.id, 
      p.title, 
      p.department, 
      p.description, 
      p."isOpen", 
      p."positionLevel", 
      p."customAttributes", 
      p."createdAt", 
      p."updatedAt",
      p."gradeId",
      g.id as "grade.id",
      g.name as "grade.name",
      g.label as "grade.label",
      g.color as "grade.color",
      g."sla_days" as "grade.slaDays",
      g."createdAt" as "grade.createdAt",
      g."updatedAt" as "grade.updatedAt"
    FROM "Position" p
    LEFT JOIN "Grade" g ON p."gradeId" = g.id
  `;

  const conditions: string[] = [];
  const params: any[] = [];
  let interviewerJoinClause = '';

  // Filter for hiring managers: only show positions where they are assigned as interviewers
  const isHiringManager = userRole === 'Hiring Manager';
  if (isHiringManager && userId && shouldRestrict !== false && !hasViewAllPermission) {
    conditions.push(`pi."userId" = $${conditions.length + 1}`);
    params.push(userId);
    interviewerJoinClause = `INNER JOIN "PositionInterviewer" pi ON p.id = pi."positionId"`;
    query += ` ${interviewerJoinClause}`;
  }

  // Add filters
  if (filters.title) {
    conditions.push(`p.title ILIKE $${conditions.length + 1}`);
    params.push(`%${filters.title}%`);
  }

  if (filters.department) {
    conditions.push(`p.department = ANY($${conditions.length + 1}::text[])`);
    params.push(filters.department.split(',').map(d => d.trim()));
  }

  if (filters.isOpen === "true") {
    conditions.push(`p."isOpen" = TRUE`);
  } else if (filters.isOpen === "false") {
    conditions.push(`p."isOpen" = FALSE`);
  }

  if (filters.positionLevel) {
    conditions.push(`p."positionLevel" ILIKE $${conditions.length + 1}`);
    params.push(`%${filters.positionLevel}%`);
  }

  // Add WHERE clause if conditions exist
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Add ORDER BY only - no pagination for "all" endpoint
  query += ' ORDER BY p."createdAt" DESC';

  return { query, params };
}

function mapPositionRow(row: any): Position {
  // Extract grade data if it exists
  const grade = row['grade.id'] ? {
    id: row['grade.id'],
    name: row['grade.name'],
    label: row['grade.label'],
    color: row['grade.color'],
    slaDays: row['grade.slaDays'],
    createdAt: row['grade.createdAt'],
    updatedAt: row['grade.updatedAt']
  } : undefined;

  return {
    id: row.id,
    title: row.title,
    department: row.department,
    description: row.description,
    isOpen: row.isOpen,
    positionLevel: row.positionLevel,
    customAttributes: row.customAttributes || {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    gradeId: row.gradeId,
    grade: grade
  };
}

async function validateSession(): Promise<{ userId: string; userName: string; userRole?: string }> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Check if user has permission to view positions
  if (!hasPermission(session.user, 'POSITIONS_VIEW')) {
    throw new Error('Forbidden: Insufficient permissions to view positions');
  }

  return {
    userId: session.user.id,
    userName: session.user.name || session.user.email || 'Unknown',
    userRole: session.user.role
  };
}

async function fetchPositionsFromDatabase(query: string, params: any[]): Promise<Position[]> {
  const pool = getPool();

  try {
    const result = await pool.query(query, params);
    return result.rows.map(mapPositionRow);
  } catch (error) {
    console.error('[Positions API] Database query failed:', error);
    throw error;
  }
}

/**
 * @openapi
 * /api/positions/all:
 *   get:
 *     summary: Get all positions (no pagination)
 *     description: Returns all positions, optionally filtered by isOpen (enabled/disabled). No pagination.
 *     parameters:
 *       - in: query
 *         name: isOpen
 *         schema:
 *           type: boolean
 *         description: Filter by enabled (open) or disabled (closed) positions
 *         example: true
 *     responses:
 *       200:
 *         description: List of positions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Position'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Validate session
    const { userId, userName, userRole } = await validateSession();

    // Parse and validate filters
    const filters = parseFilters(new URL(request.url).searchParams);

    // Check if user has permission to view all positions (overrides system setting)
    // Get session again for permission check (validateSession doesn't return full session object)
    const session = await auth();
    const hasViewAllPermission = session?.user ? hasPermission(session.user, 'POSITIONS_VIEW_ALL') : false;

    // Check system setting for hiring manager restriction
    const { getSystemSetting } = await import('@/lib/systemSettings');
    const restrictSetting = await getSystemSetting('hiringManagerRestrictToAssignedPositions');
    const shouldRestrict = restrictSetting !== 'false'; // Default to true (restrict) if not set

    // Build query
    const { query, params } = buildQuery(filters, userRole, userId, shouldRestrict, hasViewAllPermission);

    // Execute query - always fetch fresh data from database
    const positions = await fetchPositionsFromDatabase(query, params);

    // Return success response with no-cache headers
    const headers = new Headers({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    return NextResponse.json({
      data: positions,
      meta: {
        count: positions.length,
        cached: false
      }
    }, { status: 200, headers });

  } catch (error) {
    console.error('Error in GET /api/positions/all:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({
          message: 'Unauthorized',
          error: 'Authentication required'
        }, { status: 401 });
      }
    }

    // Generic error response
    return NextResponse.json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
