import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { minioClient, MINIO_BUCKET } from '@/lib/minio';
import { MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { v4 as uuidv4 } from 'uuid';
import { broadcastCandidateCommentUpdate } from '@/lib/candidateSse';
import { dispatchWebhooks } from '@/lib/webhookDispatcher';

// Helper to get attachment info by IDs
async function getAttachmentsByIds(ids: string[]) {
  if (!ids || ids.length === 0) return [];
  const attachments = await prisma.attachment.findMany({
    where: { id: { in: ids } },
    include: { uploadedBy: { select: { id: true, name: true, email: true } } },
  });
  return attachments.map((a: typeof attachments[0]) => ({
    ...a,
    url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${a.filePath}`
  }));
}

// GET: List comments for a candidate (with attachments)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const comments = await prisma.candidateComment.findMany({
      where: { candidateId: id },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    // Attachments for each comment
    const commentsWithAttachments = await Promise.all(comments.map(async (c: typeof comments[0]) => ({
      ...c,
      attachments: await getAttachmentsByIds(c.attachmentIds || [])
    })));
    return NextResponse.json({ data: commentsWithAttachments });
  } catch (err) {
    return NextResponse.json({ message: 'Error fetching comments', error: String(err) }, { status: 500 });
  }
}

// POST: Add a comment (with multiple file uploads)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check permissions
  const canManageComments = session.user.role === 'Admin' || 
    session.user.modulePermissions?.includes('CANDIDATES_COMMENTS');
  
  if (!canManageComments) {
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to manage candidate comments' }, { status: 403 });
  }
  
  // Support both JSON and multipart/form-data
  let content = '';
  let files: File[] = [];
  let labels: string[] = [];
  if (req.headers.get('content-type')?.includes('multipart/form-data')) {
    const formData = await req.formData();
    content = formData.get('content') as string;
    // Collect files and labels
    files = Array.from(formData.getAll('attachments')) as File[];
    labels = Array.from(formData.getAll('labels')) as string[];
  } else {
    const body = await req.json();
    content = body.content;
    // For API clients: support base64 or URLs in future
    files = [];
    labels = [];
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
            candidateId: id,
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
    
    const newComment = await prisma.candidateComment.create({
      data: {
        candidateId: id,
        authorId: session.user.id,
        content,
        attachmentIds,
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    // Broadcast SSE event for new comment
    broadcastCandidateCommentUpdate({ candidateId: id, comment: newComment, action: 'added' });
    
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
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
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
            candidateId: id,
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
    const existing = await prisma.candidateComment.findUnique({ where: { id: commentId, candidateId: id } });
    if (!existing) return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
    if (existing.authorId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: Only the author can edit this comment.' }, { status: 403 });
    }
    
    const updatedComment = await prisma.candidateComment.update({
      where: { id: commentId, candidateId: id },
      data: {
        content,
        attachmentIds: [...(existing.attachmentIds || []), ...newAttachmentIds],
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    // Broadcast SSE event for updated comment
    broadcastCandidateCommentUpdate({ candidateId: id, comment: updatedComment, action: 'updated' });
    
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
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { commentId } = await req.json();
  try {
    const comment = await prisma.candidateComment.findUnique({ where: { id: commentId, candidateId: id } });
    if (!comment) return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: Only the author can delete this comment.' }, { status: 403 });
    }
    await prisma.candidateComment.delete({ where: { id: commentId, candidateId: id } });
    // After successful deletion
    broadcastCandidateCommentUpdate({ candidateId: id, comment: { id: commentId }, action: 'deleted' });
    
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