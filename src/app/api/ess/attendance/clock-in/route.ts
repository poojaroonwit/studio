import { NextRequest, NextResponse } from 'next/server';

import { handleNativeAttendanceClock } from '@/lib/ess/mobile-attendance-clock';
import { resolveMobileEssIdentity } from '@/lib/ess/mobile-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const identity = await resolveMobileEssIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return handleNativeAttendanceClock(request, identity, 'in');
}
