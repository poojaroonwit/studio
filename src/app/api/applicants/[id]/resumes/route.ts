import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { minioClient } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { v4 as uuidv4 } from 'uuid';
import { broadcastApplicantUpdate } from '@/lib/simple-broadcaster';
import { z } from 'zod';
import { canEditApplicant } from '@/lib/permissions';
import { permissionMatches } from '@/lib/permission-aliases';


import { auth } from '@/auth';
export const dynamic = 'force-dynamic';


// GET: List resumes for a Applicant (with pagination and performance optimization)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100 attachments per request
  const offset = parseInt(searchParams.get('offset') || '0');
  
  // Validate Applicant ID format
  const uuidSchema = z.string().uuid();
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ message: 'Invalid Applicant ID format' }, { status: 400 });
  }
  
  const startTime = Date.now();
  // console.log(`[API] GET /api/applicants/${id}/resumes started, limit: ${limit}, offset: ${offset}`);
  
  try {
    // Use Promise.all to check Applicant existence and fetch attachments in parallel
    // console.log(`[API] Fetching resumes for Applicant ID: ${id}`);
    const [applicant, attachments] = await Promise.all([
      prisma.applicant.findUnique({ where: { id }, select: { id: true } }),
      prisma.attachment.findMany({
        where: { applicantId: id },
        orderBy: { uploadedAt: 'desc' },
        take: limit,
        skip: offset,
        include: { uploadedBy: { select: { id: true, name: true, email: true } } },
      })
    ]);
    
    if (!applicant) {
      // console.log(`[API] Applicant not found for resumes request, ID: ${id}`);
      return NextResponse.json({ message: 'Applicant not found' }, { status: 404 });
    }
    
    // console.log(`[API] Found ${attachments.length} resumes for Applicant ID: ${id}`);
    
    // Add public URL
    const { buildServerFileUrl } = await import('@/lib/fileUrls');
    const attachmentsWithUrl = await Promise.all(
      attachments.map(async (a: typeof attachments[0]) => ({
        ...a,
        url: await buildServerFileUrl(a.filePath, { strategy: 'stream' })
      }))
    );
    
    const queryTime = Date.now() - startTime;

    if (queryTime > 3000) {
      console.warn(`[PERF WARNING] Slow resumes query: ${queryTime}ms for Applicant ${id}`);
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
    console.error(`[GET /api/applicants/${id}/resumes] Error:`, err);
    
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Upload a resume (multipart/form-data) - supports single or multiple files
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
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
  const currentCount = await prisma.attachment.count({ where: { applicantId: id } });
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
          applicantId: id,
          uploadedById: session.user.id,
          filePath: objectName,
          fileName: file.name,
          isPrimary: isFirstFile,
          label: label,
        },
        include: { uploadedBy: { select: { id: true, name: true, email: true } } },
      });
      // Broadcast SSE event for new resume
      broadcastApplicantUpdate({ applicantId: id, resume: newAttachment, action: 'added' }, session.user.id);

      results.push({
        ...newAttachment,
        url: await (await import('@/lib/fileUrls')).buildServerFileUrl(objectName, { strategy: 'stream' })
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
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { attachmentId } = await req.json();
  try {
    // Unset all
    await prisma.attachment.updateMany({ where: { applicantId: id }, data: { isPrimary: false } });
    // Set one
    const updated = await prisma.attachment.update({ where: { id: attachmentId, applicantId: id }, data: { isPrimary: true } });
    // Broadcast SSE event for updated resume
    broadcastApplicantUpdate({ applicantId: id, resume: updated, action: 'updated' }, session.user.id);
    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ message: 'Error setting primary attachment', error: String(err) }, { status: 500 });
  }
}

// DELETE: Remove a attachment
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  const { attachmentId } = await req.json();
  if (!attachmentId) {
    return NextResponse.json({ message: 'Attachment ID is required' }, { status: 400 });
  }
  
  try {
    // Get Applicant data for ownership check
    const applicant = await prisma.applicant.findUnique({
      where: { id },
      select: { id: true, recruiterId: true }
    });
    
    if (!applicant) {
      return NextResponse.json({ message: 'Applicant not found' }, { status: 404 });
    }
    
    // Check ownership-based permissions for deleting attachments
    const hasGlobalEditPermission = permissionMatches(session.user.modulePermissions, 'APPLICANTS_EDIT_BASIC') || permissionMatches(session.user.modulePermissions, 'APPLICANTS_EDIT_SENSITIVE');
    const hasOwnEditPermission = permissionMatches(session.user.modulePermissions, 'APPLICANTS_EDIT_BASIC_OWN') || permissionMatches(session.user.modulePermissions, 'APPLICANTS_EDIT_SENSITIVE_OWN');
    
    if (session.user.role !== 'Admin' && !hasGlobalEditPermission && !hasOwnEditPermission) {
      return NextResponse.json({ message: 'Insufficient permissions to delete attachments' }, { status: 403 });
    }
    
    if (session.user.role !== 'Admin' && !hasGlobalEditPermission) {
      const editPermission = canEditApplicant(session.user, applicant.recruiterId, session.user.id);
      if (!editPermission.canEdit) {
        return NextResponse.json({ message: `Forbidden: ${editPermission.reason}` }, { status: 403 });
      }
    }
    
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId, applicantId: id } });
    if (!attachment) {
      return NextResponse.json({ message: 'Attachment not found' }, { status: 404 });
    }
    
    // Delete from MinIO
    await minioClient.removeObject(MINIO_BUCKET, attachment.filePath);
    // Delete from DB
    await prisma.attachment.delete({ where: { id: attachmentId, applicantId: id } });
    // Broadcast SSE event for deleted resume
    broadcastApplicantUpdate({ applicantId: id, resume: { id: attachmentId }, action: 'deleted' }, session.user.id);
    // If primary was deleted, set first as primary
    const remaining = await prisma.attachment.findMany({ where: { applicantId: id }, orderBy: { uploadedAt: 'desc' } });
    if (attachment.isPrimary && remaining.length > 0) {
      await prisma.attachment.update({ where: { id: remaining[0].id }, data: { isPrimary: true } });
    }
    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    return NextResponse.json({ message: 'Error deleting attachment', error: String(err) }, { status: 500 });
  }
} 
