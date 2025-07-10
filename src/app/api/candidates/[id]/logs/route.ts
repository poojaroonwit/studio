import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
// Type imports removed due to linter errors

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Fetch transition records for the candidate
  const transitions = await prisma.transitionRecord.findMany({
    where: { candidateId: params.id },
    orderBy: { date: 'desc' },
    include: { actingUser: true },
  });

  // Fetch comments for the candidate
  const comments = await prisma.candidateComment.findMany({
    where: { candidateId: params.id },
    orderBy: { createdAt: 'desc' },
    include: { author: true },
  });

  // Fetch resume uploads for the candidate (attachments with label 'resume')
  const resumes = await prisma.attachment.findMany({
    where: { candidateId: params.id, label: 'resume' },
    orderBy: { uploadedAt: 'desc' },
    include: { uploadedBy: true },
  });

  // Map to activity log format
  const logs = [
    ...transitions.map((tr: any) => ({
      id: tr.id,
      action: 'Stage changed',
      user: tr.actingUser?.name || 'System',
      time: tr.date,
      note: tr.notes || `Moved to ${tr.stage} stage.`,
      stage: tr.stage,
    })),
    ...comments.map((c: any) => ({
      id: c.id,
      action: 'Comment',
      user: c.author?.name || 'Unknown',
      time: c.createdAt,
      note: c.content,
    })),
    ...resumes.map((r: any) => ({
      id: r.id,
      action: 'Resume uploaded',
      user: r.uploadedBy?.name || 'Unknown',
      time: r.uploadedAt,
      note: r.fileName,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return new Response(JSON.stringify({ data: logs }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
} 