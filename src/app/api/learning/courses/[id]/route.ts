import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { employeeForUser, getCourseDetail, startCourse } from '@/lib/learning/learning-service';
import { hasAnyPermission } from '@/lib/permissions';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const employeeId = await employeeForUser(session.user.id, session.user.email);
  const canPreviewDraft = hasAnyPermission(session.user, ['HR_LEARNING_MANAGE']);
  const detail = await getCourseDetail((await params).id, employeeId, canPreviewDraft);
  if (!detail) return NextResponse.json({ message: 'Course not found' }, { status: 404 });
  return NextResponse.json({ data: { ...detail, canManage: canPreviewDraft } });
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const employeeId = await employeeForUser(session.user.id, session.user.email);
  if (!employeeId) return NextResponse.json({ message: 'No employee record is linked to this user.' }, { status: 404 });
  try {
    return NextResponse.json({ data: await startCourse((await params).id, employeeId) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to start course' }, { status: 400 });
  }
}
