import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { minioClient } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { SimpleErrorHandler,
  createUnauthorizedError,
  createForbiddenError,
  createValidationError,
  createNotFoundError,
  createInternalServerError
} from '@/lib/errors';;
import { canEditCandidate, canUploadResumes } from '@/lib/permissions';

const ENDPOINT = '/api/v1/candidates/[id]/attachments';

// Helper function to download file from URL
async function downloadFileFromUrl(url: string, headers?: Record<string, string>): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
  try {
    const fetchHeaders: HeadersInit = {
      'User-Agent': 'Studio-Attachment-Downloader/1.0',
      ...headers
    };
    
    const response = await fetch(url, {
      headers: fetchHeaders
    });
    
    if (!response.ok) {
      // Provide more specific error messages for authentication issues
      if (response.status === 401) {
        const hasAuth = headers && (headers['Authorization'] || headers['authorization'] || Object.keys(headers).some(k => k.toLowerCase() === 'authorization'));
        if (!hasAuth) {
          throw new Error(`Failed to download file: ${response.status} ${response.statusText}. The URL requires authentication. Please provide authentication headers in the request body (use 'headers' object or 'authToken' field).`);
        } else {
          // Get the auth header value (masked for security)
          const authHeader = headers?.['Authorization'] || headers?.['authorization'] || 
            Object.entries(headers || {}).find(([k]) => k.toLowerCase() === 'authorization')?.[1];
          const authPreview = authHeader ? (authHeader.length > 20 ? `${authHeader.substring(0, 20)}...` : authHeader) : 'not provided';
          throw new Error(`Failed to download file: ${response.status} ${response.statusText}. The provided authentication credentials are invalid or expired. Please verify that the Authorization token in the 'headers' object is valid and not expired. Token preview: ${authPreview}. If using a time-limited token, ensure it's refreshed before making the request.`);
        }
      } else if (response.status === 403) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}. Access forbidden - the URL may require different permissions or the file may not be accessible.`);
      } else if (response.status === 404) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}. The file was not found at the provided URL.`);
      } else {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
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
    // Re-throw if it's already our formatted error, otherwise wrap it
    if (error instanceof Error && error.message.includes('Failed to download file:')) {
      throw error;
    }
    throw new Error(`Failed to download file from URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// GET: List attachments for a candidate
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Check if this request is actually meant for attachments
  if (req.nextUrl.pathname.includes('/job-matches')) {
    return new Response(JSON.stringify({ error: 'Route mismatch - this should be handled by job-matches route' }), { 
      status: 404, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
  
  const { id } = await params;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  try {
    // Get candidate data for ownership check
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      select: { id: true, recruiterId: true }
    });
    
    if (!candidate) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Candidate not found'));
    }
    
    // Check ownership-based permissions for viewing attachments
    const hasGlobalEditPermission = user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC') || user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE');
    const hasOwnEditPermission = user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC_OWN') || user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE_OWN');
    
    if (user.role !== 'Admin' && !hasGlobalEditPermission && !hasOwnEditPermission) {
      return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to view attachments'));
    }
    
    if (user.role !== 'Admin' && !hasGlobalEditPermission) {
      const editPermission = canEditCandidate(user, candidate.recruiterId, user.id);
      if (!editPermission.canEdit) {
        return SimpleErrorHandler.handleApiError(req, createForbiddenError(`Forbidden: ${editPermission.reason}`));
      }
    }
    
    const attachments = await prisma.attachment.findMany({
      where: { candidateId: id },
      orderBy: { uploadedAt: 'desc' },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    const { buildServerFileUrl } = await import('@/lib/fileUrls');
    const attachmentsWithUrl = await Promise.all(
      attachments.map(async (a: typeof attachments[0]) => ({
        ...a,
        url: await buildServerFileUrl(a.filePath, { strategy: 'stream' })
      }))
    );
    return SimpleErrorHandler.createSuccessResponse(req, attachmentsWithUrl);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error fetching attachments: ${errorMessage}`));
  }
}

// POST: Upload an attachment (multipart/form-data)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Check if this request is actually meant for attachments
  if (req.nextUrl.pathname.includes('/job-matches')) {
    return new Response(JSON.stringify({ error: 'Route mismatch - this should be handled by job-matches route' }), { 
      status: 404, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
  
  const { id } = await params;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  // Initial permission check - we'll do detailed ownership check after retrieving candidate data
  const hasGlobalResumePermission = user.modulePermissions?.includes('CANDIDATES_RESUMES_UPLOAD');
  const hasOwnResumePermission = user.modulePermissions?.includes('CANDIDATES_RESUMES_UPLOAD_OWN');
  
  if (user.role !== 'Admin' && !hasGlobalResumePermission && !hasOwnResumePermission) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to upload attachments'));
  }

  // Check if this is actually a multipart/form-data request
  const contentType = req.headers.get('content-type');
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid content type: Expected multipart/form-data'));
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
       
        
        const errorMsg = `No file uploaded. Available fields: ${availableFields.join(', ')}. Expected field name: "attachment" or "attachments". Found ${allFiles.length} total files, ${validFiles.length} valid files. This error typically occurs when a form field is created without an actual file.`;
        return SimpleErrorHandler.handleApiError(req, createValidationError(`Invalid input - attachment: ${errorMsg}`));
      } else {
        // Use the first valid file found
        file = validFiles[0];
      }
    }
    
    // At this point, file should be a valid File object
    if (!file || !(file instanceof File)) {
      return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid input - attachment: No valid file found'));
    }
    
    // Validate file size
    if (file.size === 0) {
      return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid input - attachment: File is empty (0 bytes)'));
    }
    
    // Validate file name
    if (!file.name || file.name.trim() === '') {
      return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid input - attachment: File has no name'));
    }
    
    const ext = (file.name || 'pdf').split('.').pop();
    const objectName = `attachments/${id}/${uuidv4()}.${ext}`;
    
    // Get candidate data for ownership check
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      select: { id: true, recruiterId: true }
    });
    
    if (!candidate) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Candidate not found'));
    }
    
    // Check ownership-based permissions for uploading attachments
    if (user.role !== 'Admin' && !hasGlobalResumePermission) {
      const resumePermission = canUploadResumes(user, candidate.recruiterId, user.id);
      if (!resumePermission.canUpload) {
        return SimpleErrorHandler.handleApiError(req, createForbiddenError(`Forbidden: ${resumePermission.reason}`));
      }
    }
    
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
    

    
    return SimpleErrorHandler.createSuccessResponse(req, { 
      ...newAttachment, 
      url: await (await import('@/lib/fileUrls')).buildServerFileUrl(objectName, { strategy: 'stream' }) 
    }, 201);
  } catch (err) {
    console.error(`[ATTACHMENTS] Error uploading attachment:`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error uploading attachment: ${errorMessage}`));
  }
}

// PATCH: Upload an attachment from URL
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  
  const { id } = await params;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  // Initial permission check - we'll do detailed ownership check after retrieving candidate data
  const hasGlobalResumePermission = user.modulePermissions?.includes('CANDIDATES_RESUMES_UPLOAD');
  const hasOwnResumePermission = user.modulePermissions?.includes('CANDIDATES_RESUMES_UPLOAD_OWN');
  
  if (user.role !== 'Admin' && !hasGlobalResumePermission && !hasOwnResumePermission) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to upload attachments'));
  }

  let fileUrl: string;
  let label: string = 'resume';
  let downloadHeaders: Record<string, string> | undefined;
  
  try {
    const body = await req.json();
    fileUrl = body.fileUrl;
    label = body.label || 'resume';
    
    // Support optional headers for authenticated downloads
    if (body.headers && typeof body.headers === 'object') {
      // Validate that all header values are strings
      downloadHeaders = {};
      for (const [key, value] of Object.entries(body.headers)) {
        if (typeof value !== 'string') {
          return SimpleErrorHandler.handleApiError(req, createValidationError(`Invalid input - headers: Header "${key}" must be a string value. Received ${typeof value}. If you're passing an Authorization token, make sure it's quoted: "Authorization": "Bearer <token>"`));
        }
        downloadHeaders[key] = value;
      }
    } else if (body.authToken) {
      // Support simple authToken field for convenience
      if (typeof body.authToken !== 'string') {
        return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid input - authToken: Must be a string value'));
      }
      downloadHeaders = {
        'Authorization': body.authToken.startsWith('Bearer ') ? body.authToken : `Bearer ${body.authToken}`
      };
    }
    
    if (!fileUrl) {
      return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid input - fileUrl: Missing fileUrl'));
    }
    
    // Validate URL format
    try {
      new URL(fileUrl);
    } catch {
      return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid input - fileUrl: Invalid URL format'));
    }
  } catch (error) {
    // Provide more specific error message for JSON parsing errors
    if (error instanceof SyntaxError || (error instanceof Error && error.message.includes('JSON'))) {
      return SimpleErrorHandler.handleApiError(req, createValidationError(`Invalid input: Invalid JSON body. ${error instanceof Error ? error.message : 'JSON parsing failed'}. Make sure all string values in the JSON are properly quoted, especially in the "headers" object (e.g., "Authorization": "Bearer <token>" not "Authorization": Bearer <token>).`));
    }
    return SimpleErrorHandler.handleApiError(req, createValidationError(`Invalid input: Invalid JSON body. ${error instanceof Error ? error.message : 'Unknown error'}`));
  }

  try {
    // Log the download attempt (without exposing full auth token)
    const urlForLogging = fileUrl.length > 100 ? `${fileUrl.substring(0, 100)}...` : fileUrl;
    const hasAuthHeaders = downloadHeaders && Object.keys(downloadHeaders).length > 0;
    console.log(`[ATTACHMENTS] Downloading file from URL: ${urlForLogging} (has auth: ${hasAuthHeaders})`);
    
    // Download file from URL with optional authentication headers
    const { buffer, fileName, contentType } = await downloadFileFromUrl(fileUrl, downloadHeaders);
    
    // Validate file size
    if (buffer.length === 0) {
      return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid input - fileUrl: Downloaded file is empty (0 bytes)'));
    }
    
    // Validate file name
    if (!fileName || fileName.trim() === '') {
      return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid input - fileUrl: Could not determine filename from URL'));
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
    

    
    return SimpleErrorHandler.createSuccessResponse(req, { 
      ...newAttachment, 
      url: await (await import('@/lib/fileUrls')).buildServerFileUrl(objectName, { strategy: 'stream' }) 
    }, 201);
  } catch (err) {
    console.error(`[ATTACHMENTS] Error uploading attachment from URL:`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    // Provide more context for authentication errors
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('invalid or expired')) {
      const urlForError = fileUrl.length > 150 ? `${fileUrl.substring(0, 150)}...` : fileUrl;
      return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error uploading attachment from URL: ${errorMessage}. URL: ${urlForError}. Please ensure the Authorization token in the request body is valid and not expired.`));
    }
    
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error uploading attachment from URL: ${errorMessage}`));
  }
}

// PUT: Set an attachment as primary
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  // Initial permission check - we'll do detailed ownership check after retrieving candidate data
  const hasGlobalEditPermission = user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC') || user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE');
  const hasOwnEditPermission = user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC_OWN') || user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE_OWN');
  
  if (user.role !== 'Admin' && !hasGlobalEditPermission && !hasOwnEditPermission) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to manage attachments'));
  }

  let attachmentId;
  try {
    const body = await req.json();
    attachmentId = body.attachmentId;
    if (!attachmentId) {
      return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid input - attachmentId: Missing attachmentId'));
    }
  } catch {
    return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid input: Invalid JSON body'));
  }
  
  try {
    // Get candidate data for ownership check
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      select: { id: true, recruiterId: true }
    });
    
    if (!candidate) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Candidate not found'));
    }
    
    // Check ownership-based permissions for managing attachments
    if (user.role !== 'Admin' && !hasGlobalEditPermission) {
      const editPermission = canEditCandidate(user, candidate.recruiterId, user.id);
      if (!editPermission.canEdit) {
        return SimpleErrorHandler.handleApiError(req, createForbiddenError(`Forbidden: ${editPermission.reason}`));
      }
    }
    
    await prisma.attachment.updateMany({ where: { candidateId: id }, data: { isPrimary: false } });
    const updated = await prisma.attachment.update({ where: { id: attachmentId, candidateId: id }, data: { isPrimary: true } });
    return SimpleErrorHandler.createSuccessResponse(req, updated);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error setting primary attachment: ${errorMessage}`));
  }
}

// DELETE: Remove an attachment
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  // Initial permission check - we'll do detailed ownership check after retrieving candidate data
  const hasGlobalEditPermission = user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC') || user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE');
  const hasOwnEditPermission = user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC_OWN') || user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE_OWN');
  
  if (user.role !== 'Admin' && !hasGlobalEditPermission && !hasOwnEditPermission) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to delete attachments'));
  }

  let attachmentId;
  try {
    const body = await req.json();
    attachmentId = body.attachmentId;
    if (!attachmentId) {
      return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid input - attachmentId: Missing attachmentId'));
    }
  } catch {
    return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid input: Invalid JSON body'));
  }
  
  try {
    // Get candidate data for ownership check
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      select: { id: true, recruiterId: true }
    });
    
    if (!candidate) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Candidate not found'));
    }
    
    // Check ownership-based permissions for deleting attachments
    if (user.role !== 'Admin' && !hasGlobalEditPermission) {
      const editPermission = canEditCandidate(user, candidate.recruiterId, user.id);
      if (!editPermission.canEdit) {
        return SimpleErrorHandler.handleApiError(req, createForbiddenError(`Forbidden: ${editPermission.reason}`));
      }
    }
    
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId, candidateId: id } });
    if (!attachment) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Attachment not found'));
    }
    
    await minioClient.removeObject(MINIO_BUCKET, attachment.filePath);
    await prisma.attachment.delete({ where: { id: attachmentId, candidateId: id } });
    const remaining = await prisma.attachment.findMany({ where: { candidateId: id }, orderBy: { uploadedAt: 'desc' } });
    if (attachment.isPrimary && remaining.length > 0) {
      await prisma.attachment.update({ where: { id: remaining[0].id }, data: { isPrimary: true } });
    }
    return SimpleErrorHandler.createSuccessResponse(req, { message: 'Deleted' });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error deleting attachment: ${errorMessage}`));
  }
} 