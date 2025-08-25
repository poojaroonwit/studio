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

// Helper function to download file from URL
async function downloadFileFromUrl(url: string): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Extract filename from URL or use default
    let fileName = 'downloaded-file';
    const urlPath = new URL(url).pathname;
    const pathParts = urlPath.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart.includes('.')) {
      fileName = lastPart;
    } else {
      // Try to get filename from content-disposition header
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          fileName = filenameMatch[1].replace(/['"]/g, '');
        }
      }
    }
    
    return { buffer, fileName, contentType };
  } catch (error) {
    throw new Error(`Failed to download file from URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// GET: List attachments for a candidate
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Check if this request is actually meant for attachments
  if (req.nextUrl.pathname.includes('/job-matches')) {
    return new Response(JSON.stringify({ error: 'Route mismatch - this should be handled by job-matches route' }), { 
      status: 404, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
  
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
  // Check if this request is actually meant for attachments
  if (req.nextUrl.pathname.includes('/job-matches')) {
    return new Response(JSON.stringify({ error: 'Route mismatch - this should be handled by job-matches route' }), { 
      status: 404, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
  
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

  // Check if this is actually a multipart/form-data request
  const contentType = req.headers.get('content-type');
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return handleApiError(req, createValidationError('Invalid content type', { 
      contentType: ['Expected multipart/form-data'] 
    }));
  }

  try {
    const formData = await req.formData();
    

    
    // Try both field names for compatibility
    let file = formData.get('attachment');
    if (!file || typeof file === 'string') {
      // Try plural form as fallback
      const files = formData.getAll('attachments');
      if (files.length > 0 && typeof files[0] !== 'string') {
        file = files[0];
      }
    }
    
    if (!file || typeof file === 'string') {
      const availableFields = Array.from(formData.keys());
      // console.log(`[ATTACHMENTS] No valid file found. Available fields:`, availableFields);
      
      // Check if there are any files at all
      const allFiles = formData.getAll('attachment').concat(formData.getAll('attachments'));
      const validFiles = allFiles.filter(f => f instanceof File && f.size > 0);
      
      if (validFiles.length === 0) {
       
        
        return handleApiError(req, createValidationError('Invalid input', { 
          attachment: [
            `No file uploaded. Available fields: ${availableFields.join(', ')}. ` +
            `Expected field name: "attachment" or "attachments". ` +
            `Found ${allFiles.length} total files, ${validFiles.length} valid files. ` +
            `This error typically occurs when a form field is created without an actual file.`
          ] 
        }));
      } else {
        // Use the first valid file found
        file = validFiles[0];
      }
    }
    
    // At this point, file should be a valid File object
    if (!file || !(file instanceof File)) {
      return handleApiError(req, createValidationError('Invalid input', { 
        attachment: ['No valid file found'] 
      }));
    }
    
    // Validate file size
    if (file.size === 0) {
      return handleApiError(req, createValidationError('Invalid input', { 
        attachment: ['File is empty (0 bytes)'] 
      }));
    }
    
    // Validate file name
    if (!file.name || file.name.trim() === '') {
      return handleApiError(req, createValidationError('Invalid input', { 
        attachment: ['File has no name'] 
      }));
    }
    
    const ext = (file.name || 'pdf').split('.').pop();
    const objectName = `attachments/${id}/${uuidv4()}.${ext}`;
    

    
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
    console.error(`[ATTACHMENTS] Error uploading attachment:`, err);
    return handleApiError(req, createInternalServerError('Error uploading attachment', { 
      originalError: String(err) 
    }));
  }
}

// PATCH: Upload an attachment from URL
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  
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

  let fileUrl: string;
  let label: string = 'resume';
  
  try {
    const body = await req.json();
    fileUrl = body.fileUrl;
    label = body.label || 'resume';
    
    if (!fileUrl) {
      return handleApiError(req, createValidationError('Invalid input', { 
        fileUrl: ['Missing fileUrl'] 
      }));
    }
    
    // Validate URL format
    try {
      new URL(fileUrl);
    } catch {
      return handleApiError(req, createValidationError('Invalid input', { 
        fileUrl: ['Invalid URL format'] 
      }));
    }
  } catch {
    return handleApiError(req, createValidationError('Invalid input', { 
      message: 'Invalid JSON body' 
    }));
  }

  try {
    // console.log(`[ATTACHMENTS] Downloading file from URL: ${fileUrl}`);
    
    // Download file from URL
    const { buffer, fileName, contentType } = await downloadFileFromUrl(fileUrl);
    
    // Validate file size
    if (buffer.length === 0) {
      return handleApiError(req, createValidationError('Invalid input', { 
        fileUrl: ['Downloaded file is empty (0 bytes)'] 
      }));
    }
    
    // Validate file name
    if (!fileName || fileName.trim() === '') {
      return handleApiError(req, createValidationError('Invalid input', { 
        fileUrl: ['Could not determine filename from URL'] 
      }));
    }
    
    const ext = fileName.split('.').pop() || 'bin';
    const objectName = `attachments/${id}/${uuidv4()}.${ext}`;
    

    
    // Upload to MinIO
    await minioClient.putObject(
      MINIO_BUCKET,
      objectName,
      buffer,
      undefined,
      { 'Content-Type': contentType }
    );
    
    // Check if this is the first attachment
    const count = await prisma.attachment.count({ where: { candidateId: id } });
    const isPrimary = count === 0;
    
    // Store in DB
    const newAttachment = await prisma.attachment.create({
      data: {
        candidateId: id,
        uploadedById: user.id,
        filePath: objectName,
        fileName: fileName,
        isPrimary,
        label: label,
      },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    

    
    return createSuccessResponse(req, { 
      ...newAttachment, 
      url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}` 
    }, 201);
  } catch (err) {
    console.error(`[ATTACHMENTS] Error uploading attachment from URL:`, err);
    return handleApiError(req, createInternalServerError('Error uploading attachment from URL', { 
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