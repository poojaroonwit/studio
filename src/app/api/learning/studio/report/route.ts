import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasAnyPermission } from '@/lib/permissions';
import { learningReport } from '@/lib/learning/learning-service';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (!hasAnyPermission(session.user, ['HR_LEARNING_VIEW','HR_LEARNING_MANAGE'])) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ data: await learningReport() });
}
