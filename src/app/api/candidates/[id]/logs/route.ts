import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Fetch transition records for the candidate
  const transitions = await prisma.transitionRecord.findMany({
    where: { candidateId: params.id },
    orderBy: { date: 'desc' },
    include: { actingUser: true },
  });

  // Map to activity log format
  const logs = transitions.map(tr => ({
    id: tr.id,
    action: 'Stage changed',
    user: tr.actingUser?.name || 'System',
    time: tr.date,
    note: tr.notes || `Moved to ${tr.stage} stage.`,
    stage: tr.stage,
  }));

  return new Response(JSON.stringify({ data: logs }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
} 