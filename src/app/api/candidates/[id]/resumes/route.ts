import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { minioClient } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { broadcastCandidateResumeUpdate } from '@/lib/candidateSse';
import { z } from 'zod';

export const dynamic = 'force-dynamic';


// GET: List resumes for a candidate (with pagination and performance optimization)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100 attachments per request
  const offset = parseInt(searchParams.get('offset') || '0');
  
  // Validate candidate ID format
  const uuidSchema = z.string().uuid();
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ message: 'Invalid candidate ID format' }, { status: 400 });
  }
  
  const startTime = Date.now();
  
  try {
    // Use Promise.all to check candidate existence and fetch attachments in parallel
    const [candidate, attachments] = await Promise.all([
      prisma.candidate.findUnique({ where: { id }, select: { id: true } }),
      prisma.attachment.findMany({
        where: { candidateId: id },
        orderBy: { uploadedAt: 'desc' },
        take: limit,
        skip: offset,
        include: { uploadedBy: { select: { id: true, name: true, email: true } } },
      })
    ]);
    
    if (!candidate) {
      return NextResponse.json({ message: 'Candidate not found' }, { status: 404 });
    }
    
    // Add public URL
    const attachmentsWithUrl = attachments.map((a: typeof attachments[0]) => ({
      ...a,
      url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${a.filePath}`
    }));
    
    const queryTime = Date.now() - startTime;
    console.log(`[PERF] Resumes query completed in ${queryTime}ms (${attachments.length} attachments)`);
    
    if (queryTime > 3000) {
      console.warn(`[PERF WARNING] Slow resumes query: ${queryTime}ms for candidate ${id}`);
    }
    
    return NextResponse.json({ 
      data: attachmentsWithUrl,
      pagination: {
        limit,
        offset,
        total: attachments.length,
        hasMore: attachments.length === limit
      }
    });
  } catch (err) {
    console.error(`[GET /api/candidates/${id}/resumes] Error:`, err);
    

    
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Upload a resume (multipart/form-data) - supports single or multiple files
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  // Parse multipart form
  const formData = await req.formData();
  const files = formData.getAll('attachments');
  const label = formData.get('label') as string || 'resume';
  
  if (!files || files.length === 0) {
    return NextResponse.json({ message: 'No files uploaded' }, { status: 400 });
  }

  const results = [];
  const errors = [];

  // Get current attachment count to determine if first file should be primary
  const currentCount = await prisma.attachment.count({ where: { candidateId: id } });
  let isFirstFile = currentCount === 0;

  for (const file of files) {
    if (typeof file === 'string') {
      errors.push('Invalid file data');
      continue;
    }

    try {
      const ext = (file.name || 'pdf').split('.').pop();
      const objectName = `attachments/${id}/${uuidv4()}.${ext}`;
      
      // Upload to MinIO
      const arrayBuffer = await file.arrayBuffer();
      await minioClient.putObject(
        MINIO_BUCKET,
        objectName,
        Buffer.from(arrayBuffer),
        undefined,
        { 'Content-Type': file.type || 'application/pdf' }
      );

      // Store in DB
      const newAttachment = await prisma.attachment.create({
        data: {
          candidateId: id,
          uploadedById: session.user.id,
          filePath: objectName,
          fileName: file.name,
          isPrimary: isFirstFile,
          label: label,
        },
        include: { uploadedBy: { select: { id: true, name: true, email: true } } },
      });
      // Broadcast SSE event for new resume
      broadcastCandidateResumeUpdate({ candidateId: id, resume: newAttachment, action: 'added' });

      results.push({
        ...newAttachment,
        url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}`
      });

      // Only the first file in this batch should be primary if no attachments exist
      if (isFirstFile) {
        isFirstFile = false;
      }
    } catch (err) {
      errors.push(`Failed to upload ${file.name}: ${String(err)}`);
    }
  }

  if (results.length === 0) {
    return NextResponse.json({ 
      message: 'All uploads failed', 
      errors 
    }, { status: 500 });
  }

  return NextResponse.json({ 
    data: results,
    message: `Successfully uploaded ${results.length} file(s)`,
    errors: errors.length > 0 ? errors : undefined
  }, { status: 201 });
}

// PUT: Set a attachment as primary
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { attachmentId } = await req.json();
  try {
    // Unset all
    await prisma.attachment.updateMany({ where: { candidateId: id }, data: { isPrimary: false } });
    // Set one
    const updated = await prisma.attachment.update({ where: { id: attachmentId, candidateId: id }, data: { isPrimary: true } });
    // Broadcast SSE event for updated resume
    broadcastCandidateResumeUpdate({ candidateId: id, resume: updated, action: 'updated' });
    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ message: 'Error setting primary attachment', error: String(err) }, { status: 500 });
  }
}

// DELETE: Remove a attachment
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { attachmentId } = await req.json();
  try {
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId, candidateId: id } });
    if (!attachment) return NextResponse.json({ message: 'Attachment not found' }, { status: 404 });
    // Delete from MinIO
    await minioClient.removeObject(MINIO_BUCKET, attachment.filePath);
    // Delete from DB
    await prisma.attachment.delete({ where: { id: attachmentId, candidateId: id } });
    // Broadcast SSE event for deleted resume
    broadcastCandidateResumeUpdate({ candidateId: id, resume: { id: attachmentId }, action: 'deleted' });
    // If primary was deleted, set first as primary
    const remaining = await prisma.attachment.findMany({ where: { candidateId: id }, orderBy: { uploadedAt: 'desc' } });
    if (attachment.isPrimary && remaining.length > 0) {
      await prisma.attachment.update({ where: { id: remaining[0].id }, data: { isPrimary: true } });
    }
    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    return NextResponse.json({ message: 'Error deleting attachment', error: String(err) }, { status: 500 });
  }
} 