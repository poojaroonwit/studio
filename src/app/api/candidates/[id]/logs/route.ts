import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastCandidateTransitionUpdate } from '@/lib/candidateSse';
import { z } from 'zod';
// Type imports removed due to linter errors

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Validate candidate ID format
    const uuidSchema = z.string().uuid();
    if (!uuidSchema.safeParse(id).success) {
      return new Response(JSON.stringify({ message: 'Invalid candidate ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if candidate exists
    const candidate = await prisma.candidate.findUnique({ where: { id: id } });
    if (!candidate) {
      return new Response(JSON.stringify({ message: 'Candidate not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch transition records for the candidate
    const transitions = await prisma.transitionRecord.findMany({
      where: { candidateId: id },
      orderBy: { date: 'desc' },
      include: { actingUser: true },
    });

    // Fetch comments for the candidate
    const comments = await prisma.candidateComment.findMany({
      where: { candidateId: id },
      orderBy: { createdAt: 'desc' },
      include: { author: true },
    });

    // Fetch resume uploads for the candidate (attachments with label 'resume')
    const resumes = await prisma.attachment.findMany({
      where: { candidateId: id, label: 'resume' },
      orderBy: { uploadedAt: 'desc' },
      include: { uploadedBy: true },
    });

    // Map to activity log format
    // Show simplified stage change messages without redundant details
    const transitionsWithPrev = transitions.map((tr: any, idx: number, arr: any[]) => {
      const prevStage = arr[idx + 1]?.stage;
      let moveNote = '';
      if (prevStage && prevStage !== tr.stage) {
        moveNote = `Moved from ${prevStage} to ${tr.stage} stage.`;
      } else {
        moveNote = `Entered ${tr.stage} stage.`;
      }
      // Only include custom notes if they exist
      if (tr.notes && tr.notes.trim().length > 0) {
        moveNote = `${moveNote} Note: ${tr.notes.trim()}`;
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
  } catch (err) {
    console.error(`[GET /api/candidates/${id}/logs] Error:`, err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 