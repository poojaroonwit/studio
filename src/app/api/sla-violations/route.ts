import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAndNotifySLAViolations, getSLAViolationsForRecruiter } from '@/lib/slaNotificationService';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const recruiterId = searchParams.get('recruiterId');

    let violations;
    if (recruiterId) {
      violations = await getSLAViolationsForRecruiter(recruiterId);
    } else {
      violations = await checkAndNotifySLAViolations();
    }

    return NextResponse.json({
      violations,
      count: violations.length,
    });
  } catch (error: any) {
    console.error('Error checking SLA violations:', error);
    return NextResponse.json({ 
      message: 'Error checking SLA violations', 
      error: error.message 
    }, { status: 500 });
  }
}
