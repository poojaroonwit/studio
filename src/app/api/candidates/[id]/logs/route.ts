export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastCandidateUpdate } from '@/lib/simple-broadcaster';
import { z } from 'zod';
// Type imports removed due to linter errors

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { searchParams } = new URL(req.url);
    
    // Parse pagination parameters
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
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

    // Fetch recruitment stages to map stage IDs to names
    const recruitmentStages = await prisma.recruitmentStage.findMany({
      select: { id: true, name: true }
    });
    
    // Create a map of stage ID to stage name
    const stageIdToName = new Map(recruitmentStages.map(stage => [stage.id, stage.name]));

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
      const currentStageName = stageIdToName.get(tr.stage) || tr.stage; // Use stage name or fallback to ID
      const prevStageName = prevStage ? (stageIdToName.get(prevStage) || prevStage) : null;
      
      let moveNote = '';
      if (prevStage && prevStage !== tr.stage) {
        moveNote = `Moved from ${prevStageName} to ${currentStageName} stage.`;
      } else {
        moveNote = `Entered ${currentStageName} stage.`;
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
    ].sort((a, b) => {
      const dateA = new Date(a.time);
      const dateB = new Date(b.time);
      // Check if dates are valid before calling getTime()
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return 0; // If either date is invalid, treat as equal
      }
      return dateB.getTime() - dateA.getTime();
    });

    // Apply pagination
    const paginatedLogs = logs.slice(offset, offset + limit);
    const hasMore = offset + limit < logs.length;
    
    return new Response(JSON.stringify({ 
      data: paginatedLogs,
      pagination: {
        limit,
        offset,
        hasMore,
        total: logs.length
      }
    }), {
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