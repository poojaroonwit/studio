import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Types
interface PositionFilters {
  title?: string;
  department?: string;
  isOpen?: string;
  positionLevel?: string;
  limit: number;
  offset: number;
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
}

// Constants
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;
const MAX_LIMIT = 100;

// Helper functions
function parseFilters(searchParams: URLSearchParams): PositionFilters {
  return {
    title: searchParams.get('title') || undefined,
    department: searchParams.get('department') || undefined,
    isOpen: searchParams.get('isOpen') || undefined,
    positionLevel: searchParams.get('positionLevel') || undefined,
    limit: Math.min(parseInt(searchParams.get('limit') || DEFAULT_LIMIT.toString(), 10), MAX_LIMIT),
    offset: parseInt(searchParams.get('offset') || DEFAULT_OFFSET.toString(), 10)
  };
}

function buildQuery(filters: PositionFilters): { query: string; params: any[] } {
  let query = `
    SELECT 
      id, 
      title, 
      department, 
      description, 
      "isOpen", 
      "positionLevel", 
      "customAttributes", 
      "createdAt", 
      "updatedAt" 
    FROM "Position"
  `;
  
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Add filters
  if (filters.title) {
    conditions.push(`title ILIKE $${paramIndex++}`);
    params.push(`%${filters.title}%`);
  }

  if (filters.department) {
    conditions.push(`department = ANY($${paramIndex++}::text[])`);
    params.push(filters.department.split(','));
  }

  if (filters.isOpen === "true") {
    conditions.push(`"isOpen" = TRUE`);
  } else if (filters.isOpen === "false") {
    conditions.push(`"isOpen" = FALSE`);
  }

      if (filters.positionLevel) {
      conditions.push(`"positionLevel" ILIKE $${paramIndex++}`);
      params.push(`%${filters.positionLevel}%`);
    }

  // Add WHERE clause if conditions exist
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Add ORDER BY and LIMIT/OFFSET
  query += ' ORDER BY "createdAt" DESC';
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(filters.limit, filters.offset);

  return { query, params };
}

function mapPositionRow(row: any): Position {
  return {
    ...row,
    customAttributes: row.customAttributes || {},
  };
}

async function validateSession(): Promise<{ userId: string; userName: string }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized - no valid session');
  }

  return {
    userId: session.user.id,
    userName: session.user.name || session.user.email || 'Unknown'
  };
}

async function fetchPositionsFromDatabase(query: string, params: any[]): Promise<Position[]> {
  const pool = getPool();
  const result = await pool.query(query, params);
  return result.rows.map(mapPositionRow);
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
  console.log('[POSITIONS/ALL] Request started');

  try {
    // Validate session
    const { userId, userName } = await validateSession();
    console.log(`[POSITIONS/ALL] Authenticated user: ${userName} (${userId})`);

    // Parse and validate filters
    const filters = parseFilters(new URL(request.url).searchParams);
    console.log('[POSITIONS/ALL] Filters:', filters);

    // Build query
    const { query, params } = buildQuery(filters);
    console.log('[POSITIONS/ALL] Params:', params);

    // Execute query
    const positions = await fetchPositionsFromDatabase(query, params);
    console.log(`[POSITIONS/ALL] Retrieved ${positions.length} positions`);

    // Return success response
    return NextResponse.json({ 
      data: positions,
      meta: {
        count: positions.length,
        limit: filters.limit,
        offset: filters.offset
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[POSITIONS/ALL] Error:', error);
    
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