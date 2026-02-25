import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { minioClient, MINIO_BUCKET } from '@/lib/minio';
import { MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { buildServerFileUrl } from '@/lib/fileUrls';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '@/lib/db';
import { broadcastApplicantUpdate } from '@/lib/simple-broadcaster';
import { dispatchWebhooks } from '@/lib/webhookDispatcher';
import { z } from 'zod';
import { hasAnyPermission, canAddComments } from '@/lib/permissions';
import { logAudit } from '@/lib/auditLog';


import { auth } from '@/auth';
export const dynamic = 'force-dynamic';


// Helper to get attachment info by IDs (legacy)
async function getAttachmentsByIds(ids: string[], applicantId?: string) {
  if (!ids || ids.length === 0) return [];
  const attachments = await prisma.attachment.findMany({
    where: { id: { in: ids } },
    include: { uploadedBy: { select: { id: true, name: true, email: true } } },
  });
  return Promise.all(
    attachments.map(async (a: typeof attachments[0]) => ({
      ...a,
      // Use 'preview' strategy for images displayed in <img> tags, include applicantId for proper authorization
      url: await buildServerFileUrl(a.filePath, { 
        strategy: 'preview',
        applicantId: applicantId || a.applicantId || undefined // a.applicantId is database field from Prisma result
      })
    }))
  );
}

// Optimized helper to get attachments as a Map for efficient lookups
async function getAttachmentsMap(ids: string[], applicantId?: string) {
  if (!ids || ids.length === 0) return new Map();
  const attachments = await prisma.attachment.findMany({
    where: { id: { in: ids } },
    include: { uploadedBy: { select: { id: true, name: true, email: true } } },
  });
  
  const attachmentMap = new Map();
  for (const a of attachments) {
    attachmentMap.set(a.id, {
      ...a,
      // Use 'preview' strategy for images displayed in <img> tags, include applicantId for proper authorization
      url: await buildServerFileUrl(a.filePath, { 
        strategy: 'preview',
        applicantId: applicantId || a.applicantId || undefined // a.applicantId is database field from Prisma result
      })
    });
  }
  
  return attachmentMap;
}

// GET: List comments for a Applicant (with attachments and pagination)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50 comments per request
  const offset = parseInt(searchParams.get('offset') || '0');
  
  // Validate Applicant ID format
  const uuidSchema = z.string().uuid();
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ message: 'Invalid Applicant ID format' }, { status: 400 });
  }
  
  const startTime = Date.now();
  // console.log(`[API] GET /api/applicants/${id}/comments started, limit: ${limit}, offset: ${offset}`);
  
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userPerms = session.user.modulePermissions || [];
    const isAdmin = session.user.role === 'Admin';
    const canViewAll = isAdmin || userPerms.includes('APPLICANTS_COMMENTS_VIEW');
    const canViewRemarks = userPerms.includes('APPLICANTS_COMMENTS_VIEW_REMARK_ONLY');

    if (!canViewAll && !canViewRemarks) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const whereClause: any = { applicantId: id }; // applicantId is Prisma model field name, not changing
    if (!canViewAll && canViewRemarks) {
      whereClause.type = 'remark';
    }

    // Use Promise.all to fetch Applicant existence, counts, and comments in parallel
    const [applicant, comments, counts] = await Promise.all([
      prisma.applicant.findUnique({ where: { id }, select: { id: true } }),
      prisma.applicantComment.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { author: { select: { id: true, name: true, email: true } } },
      }),
      Promise.all([
        prisma.applicantComment.count({ where: { applicantId: id } }), // applicantId is Prisma model field name
        prisma.applicantComment.count({ where: { applicantId: id, type: 'comment' } }), // applicantId is Prisma model field name
        prisma.applicantComment.count({ where: { applicantId: id, type: 'remark' } }) // applicantId is Prisma model field name
      ])
    ]);
    
    const [totalAllPermitted, totalCommentsOnly, totalRemarksOnly] = counts;
    
    if (!applicant) {
      // console.log(`[API] Applicant not found for comments request, ID: ${id}`);
      return NextResponse.json({ message: 'Applicant not found' }, { status: 404 });
    }
    
    // console.log(`[API] Found ${comments.length} comments for Applicant ID: ${id}`);
    
    // Batch fetch all attachments in one query instead of multiple queries
    const allAttachmentIds = comments.flatMap((c: any) => c.attachmentIds || []);
    // console.log(`[API] Processing ${allAttachmentIds.length} attachments for Applicant ID: ${id}`);
    
    const attachmentMap = allAttachmentIds.length > 0 
      ? await getAttachmentsMap(allAttachmentIds, id)
      : new Map();
    
    // Map attachments to comments efficiently
    const commentsWithAttachments = comments.map((comment: any) => ({
      ...comment,
      attachments: (comment.attachmentIds || []).map((id: string) => attachmentMap.get(id)).filter(Boolean)
    }));
    
    const queryTime = Date.now() - startTime;

    if (queryTime > 3000) {
      console.warn(`[PERF WARNING] Slow comments query: ${queryTime}ms for Applicant ${id}`);
    }
    
    return NextResponse.json({ 
      data: commentsWithAttachments,
      pagination: {
        limit,
        offset,
        total: totalAllPermitted,
        totalComments: totalCommentsOnly,
        totalRemarks: totalRemarksOnly,
        hasMore: offset + comments.length < totalAllPermitted
      }
    });
  } catch (err) {
    console.error(`[GET /api/applicants/${id}/comments] Error:`, err);
    
    return NextResponse.json({ 
      message: 'Internal server error', 
      error: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

// POST: Add a comment (with multiple file uploads)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Get Applicant data for ownership check
  let client;
  try {
    client = await getPool().connect();
    const applicantResult = await client.query('SELECT "recruiterId" FROM "Applicant" WHERE id = $1', [id]);
    if (applicantResult.rows.length === 0) {
      return NextResponse.json({ message: 'Applicant not found' }, { status: 404 });
    }
    
    const applicant = applicantResult.rows[0];
    
    // Check ownership-based permissions for adding comments
    const commentPermission = canAddComments(session.user, applicant.recruiterId, session.user.id);
    if (!commentPermission.canAdd) {
      await logAudit('WARN', `Forbidden attempt to add comment by ${session.user.name || session.user.email}: ${commentPermission.reason}`, 'API:Applicants:Comments:Add', session.user.id);
      return NextResponse.json({ message: `Forbidden: ${commentPermission.reason}` }, { status: 403 });
    }
  } catch (error) {
    console.error('Error checking Applicant ownership for comments:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
  
  // Support both JSON and multipart/form-data
  let content = '';
  let type = 'comment'; // Default type
  let files: File[] = [];
  let labels: string[] = [];
  if (req.headers.get('content-type')?.includes('multipart/form-data')) {
    const formData = await req.formData();
    content = formData.get('content') as string;
    type = (formData.get('type') as string) || 'comment';
    // Collect files and labels
    files = Array.from(formData.getAll('attachments')) as File[];
    labels = Array.from(formData.getAll('labels')) as string[];
  } else {
    const body = await req.json();
    content = body.content;
    type = body.type || 'comment';
    // For API clients: support base64 or URLs in future
    files = [];
    labels = [];
  }
  
  // Validate permission for the specific comment type
  const userPerms = session.user.modulePermissions || [];
  const isAdmin = session.user.role === 'Admin';
  const canPostAll = isAdmin || userPerms.includes('APPLICANTS_COMMENTS_VIEW');
  const canPostRemarks = userPerms.includes('APPLICANTS_COMMENTS_VIEW_REMARK_ONLY');

  if (!canPostAll) {
    if (canPostRemarks) {
      if (type !== 'remark') {
        return NextResponse.json({ message: 'Forbidden: You can only post Remarks to HM' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ message: 'Forbidden: No permission to add comments' }, { status: 403 });
    }
  }
  
  // Upload files and create attachments
  const attachmentIds: string[] = [];
  
  try {
    // Ensure MinIO bucket exists before uploading files
    const { ensureBucketExists } = await import('@/lib/minio');
    await ensureBucketExists();
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const label = labels[i] || 'other';
      const ext = (file.name || 'bin').split('.').pop();
      const objectName = `attachments/${id}/${uuidv4()}.${ext}`;
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        await minioClient.putObject(
          MINIO_BUCKET,
          objectName,
          Buffer.from(arrayBuffer),
          undefined,
          { 'Content-Type': file.type || 'application/octet-stream' }
        );
        
        const newAttachment = await prisma.attachment.create({
          data: {
            applicantId: id,
            uploadedById: session.user.id,
            filePath: objectName,
            fileName: file.name,
            label,
            isPrimary: false,
          },
        });
        attachmentIds.push(newAttachment.id);
      } catch (uploadError) {
        console.error(`Failed to upload file ${file.name}:`, uploadError);
        // Continue with other files even if one fails
      }
    }
    
    const newComment = await prisma.applicantComment.create({
      data: {
        applicantId: id, // applicantId is Prisma model field name
        authorId: session.user.id,
        content,
        type,
        attachmentIds,
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    // Broadcast SSE event for new comment
    broadcastApplicantUpdate({ id, comment: newComment, action: 'comment_added' }, session.user.id);
    
    // Dispatch webhook for comment creation
    try {
      const commentWithAuthor = {
        ...newComment,
        author_name: newComment.author.name || newComment.author.email,
      };
      await dispatchWebhooks.commentCreated(commentWithAuthor);
    } catch (webhookError) {
      console.error('Failed to dispatch comment creation webhook:', webhookError);
      // Don't fail the request if webhook fails
    }
    
    return NextResponse.json({ 
      data: { 
        ...newComment, 
        attachments: await getAttachmentsByIds(attachmentIds) 
      } 
    }, { status: 201 });
    
  } catch (err) {
    console.error('Error creating comment:', err);
    return NextResponse.json({ 
      message: 'Error creating comment', 
      error: String(err) 
    }, { status: 500 });
  }
}

// PUT: Edit a comment (with multiple file uploads)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  // Support both JSON and multipart/form-data
  let commentId = '';
  let content = '';
  let files: File[] = [];
  let labels: string[] = [];
  if (req.headers.get('content-type')?.includes('multipart/form-data')) {
    const formData = await req.formData();
    commentId = formData.get('commentId') as string;
    content = formData.get('content') as string;
    files = Array.from(formData.getAll('attachments')) as File[];
    labels = Array.from(formData.getAll('labels')) as string[];
  } else {
    const body = await req.json();
    commentId = body.commentId;
    content = body.content;
    files = [];
    labels = [];
  }
  
  // Upload files and create attachments
  const newAttachmentIds: string[] = [];
  
  try {
    // Ensure MinIO bucket exists before uploading files
    const { ensureBucketExists } = await import('@/lib/minio');
    await ensureBucketExists();
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const label = labels[i] || 'other';
      const ext = (file.name || 'bin').split('.').pop();
      const objectName = `attachments/${id}/${uuidv4()}.${ext}`;
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        await minioClient.putObject(
          MINIO_BUCKET,
          objectName,
          Buffer.from(arrayBuffer),
          undefined,
          { 'Content-Type': file.type || 'application/octet-stream' }
        );
        
        const newAttachment = await prisma.attachment.create({
          data: {
            applicantId: id,
            uploadedById: session.user.id,
            filePath: objectName,
            fileName: file.name,
            label,
            isPrimary: false,
          },
        });
        newAttachmentIds.push(newAttachment.id);
      } catch (uploadError) {
        console.error(`Failed to upload file ${file.name}:`, uploadError);
        // Continue with other files even if one fails
      }
    }
    
    // Fetch existing comment to merge attachmentIds
    const existing = await prisma.applicantComment.findUnique({ where: { id: commentId, applicantId: id } }); // applicantId is Prisma model field name
    if (!existing) return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
    if (existing.authorId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: Only the author can edit this comment.' }, { status: 403 });
    }
    
    const updatedComment = await prisma.applicantComment.update({
      where: { id: commentId, applicantId: id }, // applicantId is Prisma model field name
      data: {
        content,
        attachmentIds: [...(existing.attachmentIds || []), ...newAttachmentIds],
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    // Broadcast SSE event for updated comment
    broadcastApplicantUpdate({ id, comment: updatedComment, action: 'comment_updated' }, session.user.id);
    
    // Dispatch webhook for comment update
    try {
      const commentWithAuthor = {
        ...updatedComment,
        author_name: updatedComment.author.name || updatedComment.author.email,
      };
      await dispatchWebhooks.commentUpdated(commentWithAuthor);
    } catch (webhookError) {
      console.error('Failed to dispatch comment update webhook:', webhookError);
      // Don't fail the request if webhook fails
    }
    
    return NextResponse.json({ 
      data: { 
        ...updatedComment, 
        attachments: await getAttachmentsByIds(updatedComment.attachmentIds) 
      } 
    });
    
  } catch (err) {
    console.error('Error updating comment:', err);
    return NextResponse.json({ 
      message: 'Error updating comment', 
      error: String(err) 
    }, { status: 500 });
  }
}

// DELETE: Remove a comment (only author can delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { commentId } = await req.json();
  try {
    const comment = await prisma.applicantComment.findUnique({ where: { id: commentId, applicantId: id } }); // applicantId is Prisma model field name
    if (!comment) return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: Only the author can delete this comment.' }, { status: 403 });
    }
    await prisma.applicantComment.delete({ where: { id: commentId, applicantId: id } }); // applicantId is Prisma model field name
    // After successful deletion
    broadcastApplicantUpdate({ id, comment: { id: commentId }, action: 'comment_deleted' }, session.user.id);
    
    // Dispatch webhook for comment deletion
    try {
      const commentWithAuthor = {
        ...comment,
        author_name: 'Unknown', // Author info might not be available after deletion
      };
      await dispatchWebhooks.commentDeleted(commentWithAuthor);
    } catch (webhookError) {
      console.error('Failed to dispatch comment deletion webhook:', webhookError);
      // Don't fail the request if webhook fails
    }
    
    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    return NextResponse.json({ message: 'Error deleting comment', error: String(err) }, { status: 500 });
  }
} 