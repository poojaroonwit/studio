import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { broadcastApplicantUpdate } from '@/lib/simple-broadcaster';

export const dynamic = 'force-dynamic';

const reminderSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  reminderDate: z.string().datetime(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const reminders = await prisma.applicantReminder.findMany({
      where: { applicantId: id },
      orderBy: { reminderDate: 'asc' },
    });

    return NextResponse.json({ data: reminders });
  } catch (err) {
    console.error(`[GET /api/applicants/${id}/reminders] Error:`, err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = reminderSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid request data', errors: validation.error.errors }, { status: 400 });
    }

    const { title, content, reminderDate } = validation.data;

    const reminder = await prisma.applicantReminder.create({
      data: {
        applicantId: id,
        userId: session.user.id,
        title,
        content,
        reminderDate: new Date(reminderDate),
      },
    });

    // Broadcast update to applicant detail view
    broadcastApplicantUpdate({ id, action: 'reminder_added', reminder }, session.user.id);

    return NextResponse.json({ data: reminder }, { status: 201 });
  } catch (err) {
    console.error(`[POST /api/applicants/${id}/reminders] Error:`, err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
