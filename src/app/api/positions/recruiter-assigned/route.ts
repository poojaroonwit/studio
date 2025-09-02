import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recruiterId = searchParams.get('recruiterId');

    if (!recruiterId) {
      return NextResponse.json({ error: 'Recruiter ID is required' }, { status: 400 });
    }

    // Allow any authenticated user to view assigned positions for the specified recruiter

    const client = await getPool().connect();
    
    try {
      // Query to get open positions assigned to the recruiter with headcount information
      const query = `
        SELECT 
          p.id,
          p.title,
          p.department,
          p.description,
          p."positionLevel",
          p."isOpen",
          p."createdAt",
          p."updatedAt",
          g.name as "gradeName",
          g.color as "gradeColor",
          COUNT(h.id) as "totalHeadcount",
          COUNT(CASE WHEN h.status = 'vacant' OR h."candidateId" IS NULL THEN 1 END) as "vacantHeadcount",
          COUNT(CASE WHEN h.status != 'vacant' AND h."candidateId" IS NOT NULL THEN 1 END) as "filledHeadcount"
        FROM "Position" p
        LEFT JOIN "Grade" g ON p."gradeId" = g.id
        LEFT JOIN "Headcount" h ON p.id = h."positionId"
        WHERE p."recruiterId" = $1 
          AND p."isOpen" = true
        GROUP BY p.id, p.title, p.department, p.description, p."positionLevel", p."isOpen", p."createdAt", p."updatedAt", g.name, g.color
        ORDER BY p."createdAt" DESC
      `;

      const result = await client.query(query, [recruiterId]);
      
      const positions = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        department: row.department,
        description: row.description,
        positionLevel: row.positionLevel,
        isOpen: row.isOpen,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        grade: row.gradeName ? {
          name: row.gradeName,
          color: row.gradeColor
        } : null,
        headcount: {
          total: parseInt(row.totalHeadcount) || 0,
          vacant: parseInt(row.vacantHeadcount) || 0,
          filled: parseInt(row.filledHeadcount) || 0
        }
      }));

      return NextResponse.json({ 
        data: positions,
        total: positions.length
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching recruiter assigned positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}
