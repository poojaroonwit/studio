import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastCandidateTransitionUpdate } from '@/lib/candidateSse';
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
  // To show 'Moved from ... to ...' for all transitions, we need to infer previous stage
  const transitionsWithPrev = transitions.map((tr: any, idx: number, arr: any[]) => {
    const prevStage = arr[idx + 1]?.stage;
    let moveNote = '';
    if (prevStage && prevStage !== tr.stage) {
      moveNote = `Moved from ${prevStage} to ${tr.stage} stage.`;
    } else {
      moveNote = `Entered ${tr.stage} stage.`;
    }
    // Remove redundant 'status change from ...' in notes
    let cleanedNote = tr.notes && tr.notes.replace(/status change from .+ to .+/i, '').trim();
    if (cleanedNote) {
      moveNote = `${moveNote} Note: ${cleanedNote}`;
    }
    return {
      id: tr.id,
      action: 'Stage changed',
      user: tr.actingUser?.name || 'System',
      time: tr.date,
      note: moveNote,
      stage: tr.stage,
    };
  });

  const logs = [
    ...transitionsWithPrev,
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