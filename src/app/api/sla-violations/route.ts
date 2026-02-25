import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { auth } from '@/auth';
import { 
  checkAndNotifySLAViolations, 
  getSLAViolationsForRecruiter,
  getAllSLAPositions,
  getSLAStatistics,
  getAllSLAHeadcounts,
  getPositionsWithoutSLA
} from '@/lib/slaNotificationService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to view SLA violations
  // Users should be able to view SLA data if they can view Applicants or have SLA-specific permissions
  if (!hasPermission(session.user, 'applicantS_VIEW') &&
      !hasPermission(session.user, 'SLA_MONITORING_VIEW')) {
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to view SLA violations' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const recruiterId = searchParams.get('recruiterId');
    const includeAll = searchParams.get('includeAll') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeHeadcounts = searchParams.get('includeHeadcounts') === 'true';
    const includeWithoutSLA = searchParams.get('includeWithoutSLA') === 'true';

    let violations;
    let allPositions;
    let statistics;
    let headcounts;
    let positionsWithoutSLA;

    if (recruiterId) {
      violations = await getSLAViolationsForRecruiter(recruiterId);
      if (includeAll) {
        allPositions = await getAllSLAPositions(recruiterId);
      }
      if (includeStats) {
        statistics = await getSLAStatistics(recruiterId);
      }
      if (includeHeadcounts) {
        headcounts = await getAllSLAHeadcounts(recruiterId);
      }
      if (includeWithoutSLA) {
        positionsWithoutSLA = await getPositionsWithoutSLA(recruiterId);
      }
    } else {
      violations = await checkAndNotifySLAViolations();
      if (includeAll) {
        allPositions = await getAllSLAPositions();
      }
      if (includeStats) {
        statistics = await getSLAStatistics();
      }
      if (includeHeadcounts) {
        headcounts = await getAllSLAHeadcounts();
      }
      if (includeWithoutSLA) {
        positionsWithoutSLA = await getPositionsWithoutSLA();
      }
    }

    const response: any = {
      violations,
      count: violations.length,
    };

    if (includeAll && allPositions) {
      response.allPositions = allPositions;
      response.totalPositions = allPositions.length;
    }

    if (includeStats && statistics) {
      response.statistics = statistics;
    }

    if (includeHeadcounts && headcounts) {
      response.headcounts = headcounts;
    }

    if (includeWithoutSLA && positionsWithoutSLA) {
      response.positionsWithoutSLA = positionsWithoutSLA;
      response.positionsWithoutSLACount = positionsWithoutSLA.length;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error checking SLA violations:', error);
    return NextResponse.json({ 
      message: 'Error checking SLA violations', 
      error: error.message 
    }, { status: 500 });
  }
}

