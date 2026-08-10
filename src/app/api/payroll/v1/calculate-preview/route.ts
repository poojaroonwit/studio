import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { hasAnyPermission } from '@/lib/permissions';
import { calculateThaiPayroll, thaiPayrollInputSchema } from '@/lib/payroll/thailand-engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'User session required.' } }, { status: 401 });
  }
  if (!hasAnyPermission(session.user, ['HR_PAYROLL_VIEW', 'HR_PAYROLL_MANAGE'])) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Payroll permission required.' } }, { status: 403 });
  }
  const parsed = thaiPayrollInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      error: { code: 'VALIDATION_FAILED', message: 'Invalid payroll input.', details: parsed.error.flatten() },
    }, { status: 422 });
  }
  return NextResponse.json({ data: calculateThaiPayroll(parsed.data) });
}
