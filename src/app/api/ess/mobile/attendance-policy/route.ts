import { NextRequest, NextResponse } from 'next/server';

import { resolveMobileEssIdentity } from '@/lib/ess/mobile-auth';
import { loadMobileAttendancePolicy } from '@/lib/ess/mobile-attendance-policy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const identity = await resolveMobileEssIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await loadMobileAttendancePolicy());
}
