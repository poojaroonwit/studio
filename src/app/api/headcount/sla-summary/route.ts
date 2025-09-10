import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';
import { checkSLAViolationForHeadcount } from '@/lib/slaUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to view SLA data
  if (!hasPermission(session.user, 'CANDIDATES_VIEW') &&
      !hasPermission(session.user, 'SLA_MONITORING_VIEW')) {
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to view SLA data' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const recruiterId = searchParams.get('recruiterId');

    const client = await getPool().connect();
    
    try {
      // Build query to get all headcounts with position and grade information
      let query = `
        SELECT 
          h.id as "headcountId",
          h."positionId",
          h.type as "headcountType",
          h.status as "headcountStatus",
          h."requestDate",
          h."onboardingDate",
          p.title as "positionTitle",
          p.department as "positionDepartment",
          p."recruiterId",
          u.name as "recruiterName",
          g.name as "gradeName",
          g."sla_days" as "slaDays",
          g.color as "gradeColor"
        FROM "Headcount" h
        LEFT JOIN "Position" p ON h."positionId" = p.id
        LEFT JOIN "User" u ON p."recruiterId" = u.id
        LEFT JOIN "Grade" g ON p."gradeId" = g.id
        WHERE p."gradeId" IS NOT NULL
          AND p."isOpen" = true
          AND h."requestDate" IS NOT NULL
      `;
      
      const params: any[] = [];
      if (recruiterId) {
        query += ` AND p."recruiterId" = $1`;
        params.push(recruiterId);
      }
      
      query += ` ORDER BY p.title, h."requestDate" ASC`;
      
      const result = await client.query(query, params);
      const headcounts = result.rows;
      
      // Group headcounts by position and calculate SLA status for each
      const positionMap = new Map();
      
      for (const row of headcounts) {
        const headcount = {
          id: row.headcountId,
          positionId: row.positionId,
          type: row.headcountType,
          status: row.headcountStatus,
          requestDate: row.requestDate,
          onboardingDate: row.onboardingDate,
          position: {
            id: row.positionId,
            title: row.positionTitle,
            department: row.positionDepartment,
            recruiterId: row.recruiterId,
            recruiterName: row.recruiterName,
            grade: {
              id: '',
              name: row.gradeName,
              slaDays: row.slaDays,
              color: row.gradeColor,
              isActive: true,
              sortOrder: 0,
              minLevel: 0,
              maxLevel: 0,
            },
          },
        };
        
        // Check SLA status for this headcount
        const slaResult = await checkSLAViolationForHeadcount(headcount);
        
        const headcountData = {
          id: headcount.id,
          positionId: headcount.positionId,
          positionTitle: headcount.position.title,
          department: headcount.position.department,
          requestDate: headcount.requestDate,
          status: headcount.status,
          slaStatus: 'on_track' as const,
          daysRemaining: 0,
          daysOverdue: 0,
          gradeName: row.gradeName,
          gradeColor: row.gradeColor,
          slaDays: row.slaDays,
          recruiterName: row.recruiterName,
        };
        
        if (slaResult) {
          if (slaResult.isViolated) {
            headcountData.daysOverdue = slaResult.daysOverdue;
            if (slaResult.daysOverdue <= 7) {
              headcountData.slaStatus = 'warning';
            } else if (slaResult.daysOverdue <= 30) {
              headcountData.slaStatus = 'critical';
            } else {
              headcountData.slaStatus = 'urgent';
            }
          } else {
            headcountData.daysRemaining = slaResult.daysRemaining;
            if (slaResult.daysRemaining <= 7) {
              headcountData.slaStatus = 'warning';
            } else {
              headcountData.slaStatus = 'on_track';
            }
          }
        }
        
        // Group by position
        if (!positionMap.has(headcount.positionId)) {
          positionMap.set(headcount.positionId, {
            positionId: headcount.positionId,
            positionTitle: headcount.position.title,
            department: headcount.position.department,
            totalHeadcount: 0,
            onTrackCount: 0,
            warningCount: 0,
            criticalCount: 0,
            urgentCount: 0,
            headcounts: [],
            recruiterName: row.recruiterName,
          });
        }
        
        const positionData = positionMap.get(headcount.positionId);
        positionData.totalHeadcount++;
        positionData.headcounts.push(headcountData);
        
        // Count by status
        switch (headcountData.slaStatus) {
          case 'on_track':
            positionData.onTrackCount++;
            break;
          case 'warning':
            positionData.warningCount++;
            break;
          case 'critical':
            positionData.criticalCount++;
            break;
          case 'urgent':
            positionData.urgentCount++;
            break;
        }
      }
      
      // Convert map to array and sort by position title
      const positions = Array.from(positionMap.values()).sort((a, b) => 
        a.positionTitle.localeCompare(b.positionTitle)
      );
      
      return NextResponse.json({
        positions,
        totalPositions: positions.length,
        totalHeadcounts: headcounts.length,
      });
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error('Error fetching headcount SLA summary:', error);
    return NextResponse.json({ 
      message: 'Error fetching headcount SLA summary', 
      error: error.message 
    }, { status: 500 });
  }
}
