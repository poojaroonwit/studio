import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering to prevent static generation issues
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

  // Add filters
  if (filters.title) {
    conditions.push(`title ILIKE $${conditions.length + 1}`);
    params.push(`%${filters.title}%`);
  }

  if (filters.department) {
    conditions.push(`department = ANY($${conditions.length + 1}::text[])`);
    params.push(filters.department.split(','));
  }

  if (filters.isOpen === "true") {
    conditions.push(`"isOpen" = TRUE`);
  } else if (filters.isOpen === "false") {
    conditions.push(`"isOpen" = FALSE`);
  }

  if (filters.positionLevel) {
    conditions.push(`"positionLevel" ILIKE $${conditions.length + 1}`);
    params.push(`%${filters.positionLevel}%`);
  }

  // Add WHERE clause if conditions exist
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Add ORDER BY only - no pagination for "all" endpoint
  query += ' ORDER BY "createdAt" DESC';

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
  
  // For the positions/all endpoint, we'll be more lenient with session validation
  // since this is used for filtering and doesn't modify data
  if (!session?.user?.id) {
    // Return a default user for read-only operations
    return {
      userId: 'anonymous',
      userName: 'Anonymous User'
    };
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
  try {
    // Validate session
    const { userId, userName } = await validateSession();
    
    // Parse and validate filters
    const filters = parseFilters(new URL(request.url).searchParams);
   

    // Build query
    const { query, params } = buildQuery(filters);
   

    // Execute query
    const positions = await fetchPositionsFromDatabase(query, params);
 

    // Return success response
    return NextResponse.json({ 
      data: positions,
      meta: {
        count: positions.length
      }
    }, { status: 200 });

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