// Optimized API endpoint specifically for taskboard performance
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Performance constants for taskboard
const TASKBOARD_PAGE_SIZE = 200; // Larger page size for taskboard
const QUERY_TIMEOUT = 8000; // 8 seconds timeout for taskboard

// Helper for session and permission checks
async function requireSessionAndPermission(requiredPermission: string, request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }
  if (!hasPermission(session.user, requiredPermission as any)) {
    return { error: NextResponse.json({ message: `Forbidden: Insufficient permissions to ${requiredPermission.toLowerCase().replace('_', ' ')}` }, { status: 403 }) };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let client: any = null;
  
  try {
    const { session, error } = await requireSessionAndPermission('CANDIDATES_VIEW', request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(TASKBOARD_PAGE_SIZE, parseInt(searchParams.get('limit') || TASKBOARD_PAGE_SIZE.toString(), 10)));
    const offset = (page - 1) * limit;

    // Set query timeout for faster response
    client = await getPool().connect();
    await client.query(`SET statement_timeout = '${QUERY_TIMEOUT}ms'`);

    // Build filters
    const filters = {
      name: searchParams.get('name'),
      positionId: searchParams.get('positionId'),
      status: searchParams.get('status'),
      recruiterId: searchParams.get('recruiterId'),
    };

    // Build WHERE clauses and parameters
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Handle name filter
    if (filters.name) {
      whereClauses.push(`c.name ILIKE $${paramIndex++}`);
      queryParams.push(`%${filters.name}%`);
    }

    // Handle status filter
    if (filters.status) {
      const statuses = filters.status.split(',').map(s => s.trim()).filter(s => s !== '');
      if (statuses.length > 0) {
        // Check if these look like UUIDs or status names
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        
        const uuidStatuses = statuses.filter(s => isUUID(s));
        const nameStatuses = statuses.filter(s => !isUUID(s));
        
        if (uuidStatuses.length > 0 && nameStatuses.length > 0) {
          // Mixed UUIDs and names - need to look up names
          const nameStatusIds = await client.query(
            'SELECT id FROM "RecruitmentStage" WHERE name = ANY($1)',
            [nameStatuses]
          );
          
          const allStatusIds = [
            ...uuidStatuses,
            ...nameStatusIds.rows.map((row: { id: string }) => row.id)
          ];
          
          whereClauses.push(`c."statusId" = ANY($${paramIndex++})`);
          queryParams.push(allStatusIds);
        } else if (uuidStatuses.length > 0) {
          // Only UUIDs
          whereClauses.push(`c."statusId" = ANY($${paramIndex++})`);
          queryParams.push(uuidStatuses);
        } else if (nameStatuses.length > 0) {
          // Only names - need to look up IDs
          const result = await client.query(
            'SELECT id FROM "RecruitmentStage" WHERE name = ANY($1)',
            [nameStatuses]
          );
          
          const statusIds = result.rows.map((row: { id: string }) => row.id);
          if (statusIds.length > 0) {
            whereClauses.push(`c."statusId" = ANY($${paramIndex++})`);
            queryParams.push(statusIds);
          }
        }
      }
    }

    // Handle position filter
    if (filters.positionId) {
      const positionIds = filters.positionId.split(',').map(id => id.trim()).filter(id => id !== '');
      if (positionIds.length > 0) {
        if (positionIds.length === 1) {
          whereClauses.push(`c."positionId" = $${paramIndex++}`);
          queryParams.push(positionIds[0]);
        } else {
          whereClauses.push(`c."positionId" = ANY($${paramIndex++})`);
          queryParams.push(positionIds);
        }
      }
    }

    // Handle recruiter filter
    if (filters.recruiterId) {
      const recruiterIds = filters.recruiterId.split(',').map(id => id.trim());
      if (recruiterIds.length > 0 && !recruiterIds.includes('select-all')) {
        if (recruiterIds.length === 1 && recruiterIds[0] === 'unassigned') {
          whereClauses.push(`c."recruiterId" IS NULL`);
        } else {
          const assignedIds = recruiterIds.filter(id => id !== 'unassigned');
          const hasUnassigned = recruiterIds.includes('unassigned');
          
          if (assignedIds.length > 0 && hasUnassigned) {
            whereClauses.push(`(c."recruiterId" IS NULL OR c."recruiterId" = ANY($${paramIndex++}))`);
            queryParams.push(assignedIds);
          } else if (assignedIds.length > 0) {
            whereClauses.push(`c."recruiterId" = ANY($${paramIndex++})`);
            queryParams.push(assignedIds);
          } else if (hasUnassigned) {
            whereClauses.push(`c."recruiterId" IS NULL`);
          }
        }
      }
    }

    // Auto-filter for recruiters
    const isRecruiterViewRestricted = !hasPermission(session.user, 'CANDIDATES_VIEW');
    if (isRecruiterViewRestricted && !filters.recruiterId && !filters.positionId) {
      whereClauses.push(`c."recruiterId" = $${paramIndex++}`);
      queryParams.push(session.user.id);
    }

    // Build the WHERE clause
    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Optimized query for taskboard - only essential fields
    const dataQuery = `
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c."fitScore",
        c."statusId",
        rs.name as "status",
        c."applicationDate",
        c."updatedAt",
        c."positionId",
        c."recruiterId",
        c."parsedData",
        c."avatarUrl",
        p.title as "positionTitle",
        u.name as "recruiterName"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
      ${whereClause}
      ORDER BY c."applicationDate" DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    // Execute query
    const dataResult = await client.query(dataQuery, [...queryParams, limit, offset]);

    // Optimize data transformation - only essential fields for taskboard
    const candidates = dataResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      fitScore: row.fitScore,
      status: row.status,
      statusId: row.statusId,
      applicationDate: row.applicationDate,
      updatedAt: row.updatedAt,
      positionId: row.positionId,
      recruiterId: row.recruiterId,
      parsedData: row.parsedData,
      avatarUrl: row.avatarUrl,
      position: row.positionTitle ? { title: row.positionTitle } : null,
      recruiter: row.recruiterName ? { name: row.recruiterName } : null,
    }));

    const responseTime = Date.now() - startTime;
    
    // Add performance headers
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Response-Time': `${responseTime}ms`,
      'X-Page-Size': limit.toString(),
    };

    return NextResponse.json({
      data: candidates,
      pagination: {
        page,
        limit,
        hasNext: candidates.length === limit,
        hasPrev: page > 1
      }
    }, { headers });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({ 
      message: 'Error fetching taskboard candidates', 
      error: error.message,
      responseTime: `${responseTime}ms`
    }, { status: 500 });
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing database client:', releaseError);
      }
    }
  }
}
