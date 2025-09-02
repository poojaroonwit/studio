import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  checkAndNotifySLAViolations, 
  getSLAViolationsForRecruiter,
  getAllSLAPositions,
  getSLAStatistics
} from '@/lib/slaNotificationService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to view SLA violations
  // Users should be able to view SLA data if they can view candidates or have SLA-specific permissions
  if (session.user.role !== 'Admin' && 
      !session.user.modulePermissions?.includes('CANDIDATES_VIEW') &&
      !session.user.modulePermissions?.includes('SLA_MONITORING_VIEW')) {
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to view SLA violations' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const recruiterId = searchParams.get('recruiterId');
    const includeAll = searchParams.get('includeAll') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';

    let violations;
    let allPositions;
    let statistics;

    if (recruiterId) {
      violations = await getSLAViolationsForRecruiter(recruiterId);
      if (includeAll) {
        allPositions = await getAllSLAPositions(recruiterId);
      }
      if (includeStats) {
        statistics = await getSLAStatistics(recruiterId);
      }
    } else {
      violations = await checkAndNotifySLAViolations();
      if (includeAll) {
        allPositions = await getAllSLAPositions();
      }
      if (includeStats) {
        statistics = await getSLAStatistics();
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

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error checking SLA violations:', error);
    return NextResponse.json({ 
      message: 'Error checking SLA violations', 
      error: error.message 
    }, { status: 500 });
  }
}
