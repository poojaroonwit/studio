import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { minioClient } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { 
  createSuccessResponse, 
  handleApiError, 
  createUnauthorizedError, 
  createForbiddenError, 
  createValidationError, 
  createNotFoundError, 
  createInternalServerError 
} from '@/lib/apiErrorHandler';

const ENDPOINT = '/api/v1/candidates/[id]/attachments';

// GET: List attachments for a candidate
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  try {
    const attachments = await prisma.attachment.findMany({
      where: { candidateId: id },
      orderBy: { uploadedAt: 'desc' },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    const attachmentsWithUrl = attachments.map((a: typeof attachments[0]) => ({
      ...a,
      url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${a.filePath}`
    }));
    return createSuccessResponse(req, attachmentsWithUrl);
  } catch (err) {
    return handleApiError(req, createInternalServerError('Error fetching attachments', { 
      originalError: String(err) 
    }));
  }
}

// POST: Upload an attachment (multipart/form-data)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return handleApiError(req, createForbiddenError('Insufficient permissions to upload attachments'));
  }

  const formData = await req.formData();
  const file = formData.get('attachment');
  if (!file || typeof file === 'string') {
    return handleApiError(req, createValidationError('Invalid input', { 
      attachment: ['No file uploaded'] 
    }));
  }
  
  const ext = (file.name || 'pdf').split('.').pop();
  const objectName = `attachments/${id}/${uuidv4()}.${ext}`;
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    await minioClient.putObject(
      MINIO_BUCKET,
      objectName,
      Buffer.from(arrayBuffer),
      undefined,
      { 'Content-Type': file.type || 'application/pdf' }
    );
    const count = await prisma.attachment.count({ where: { candidateId: id } });
    const isPrimary = count === 0;
    const newAttachment = await prisma.attachment.create({
      data: {
        candidateId: id,
        uploadedById: user.id,
        filePath: objectName,
        fileName: file.name,
        isPrimary,
        label: 'resume',
      },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    return createSuccessResponse(req, { 
      ...newAttachment, 
      url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}` 
    }, 201);
  } catch (err) {
    return handleApiError(req, createInternalServerError('Error uploading attachment', { 
      originalError: String(err) 
    }));
  }
}

// PUT: Set an attachment as primary
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return handleApiError(req, createForbiddenError('Insufficient permissions to manage attachments'));
  }

  let attachmentId;
  try {
    const body = await req.json();
    attachmentId = body.attachmentId;
    if (!attachmentId) {
      return handleApiError(req, createValidationError('Invalid input', { 
        attachmentId: ['Missing attachmentId'] 
      }));
    }
  } catch {
    return handleApiError(req, createValidationError('Invalid input', { 
      message: 'Invalid JSON body' 
    }));
  }
  
  try {
    await prisma.attachment.updateMany({ where: { candidateId: id }, data: { isPrimary: false } });
    const updated = await prisma.attachment.update({ where: { id: attachmentId, candidateId: id }, data: { isPrimary: true } });
    return createSuccessResponse(req, updated);
  } catch (err) {
    return handleApiError(req, createInternalServerError('Error setting primary attachment', { 
      originalError: String(err) 
    }));
  }
}

// DELETE: Remove an attachment
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return handleApiError(req, createForbiddenError('Insufficient permissions to delete attachments'));
  }

  let attachmentId;
  try {
    const body = await req.json();
    attachmentId = body.attachmentId;
    if (!attachmentId) {
      return handleApiError(req, createValidationError('Invalid input', { 
        attachmentId: ['Missing attachmentId'] 
      }));
    }
  } catch {
    return handleApiError(req, createValidationError('Invalid input', { 
      message: 'Invalid JSON body' 
    }));
  }
  
  try {
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId, candidateId: id } });
    if (!attachment) {
      return handleApiError(req, createNotFoundError('Attachment not found'));
    }
    
    await minioClient.removeObject(MINIO_BUCKET, attachment.filePath);
    await prisma.attachment.delete({ where: { id: attachmentId, candidateId: id } });
    const remaining = await prisma.attachment.findMany({ where: { candidateId: id }, orderBy: { uploadedAt: 'desc' } });
    if (attachment.isPrimary && remaining.length > 0) {
      await prisma.attachment.update({ where: { id: remaining[0].id }, data: { isPrimary: true } });
    }
    return createSuccessResponse(req, { message: 'Deleted' });
  } catch (err) {
    return handleApiError(req, createInternalServerError('Error deleting attachment', { 
      originalError: String(err) 
    }));
  }
} 