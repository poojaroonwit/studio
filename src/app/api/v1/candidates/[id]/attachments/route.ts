import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { minioClient } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { SimpleErrorHandler,
  createUnauthorizedError,
  createForbiddenError,
  createValidationError,
  createNotFoundError,
  createInternalServerError
} from '@/lib/errors';;
import { canEditApplicant, canUploadResumes } from '@/lib/permissions';

const ENDPOINT = '/api/v1/applicants/[id]/attachments';

// Helper function to infer content type from file path
function inferContentType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'application/octet-stream';
}

// Helper function to download file from URL
async function downloadFileFromUrl(url: string, headers?: Record<string, string>): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
  try {
    const parsedUrl = new URL(url);
    
    // SECURITY: Prevent SSRF by blocking private/internal IP addresses and localhost
    const hostname = parsedUrl.hostname.toLowerCase();
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '[::1]',
      '169.254.169.254', // AWS metadata service
      'metadata.google.internal', // GCP metadata service
    ];
    
    // Check for blocked hostnames
    if (blockedHosts.includes(hostname)) {
      console.error('[SECURITY] Blocked SSRF attempt to internal host:', hostname);
      throw new Error('Invalid URL: Access to internal services is not allowed');
    }
    
    // Block private IP ranges (RFC 1918)
    const privateIpPatterns = [
      /^10\./,           // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
      /^192\.168\./,     // 192.168.0.0/16
      /^127\./,          // 127.0.0.0/8 (localhost)
      /^169\.254\./,     // 169.254.0.0/16 (link-local)
      /^::1$/,           // IPv6 localhost
      /^fc00:/,          // IPv6 private
      /^fe80:/,          // IPv6 link-local
    ];
    
    for (const pattern of privateIpPatterns) {
      if (pattern.test(hostname)) {
        console.error('[SECURITY] Blocked SSRF attempt to private IP:', hostname);
        throw new Error('Invalid URL: Access to private networks is not allowed');
      }
    }
    
    // Only allow HTTP and HTTPS protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      console.error('[SECURITY] Blocked SSRF attempt with invalid protocol:', parsedUrl.protocol);
      throw new Error('Invalid URL: Only HTTP and HTTPS protocols are allowed');
    }
    
    // SECURITY: Always allow *.qsncc.com subdomains for SSRF protection
    const isQsnccDomain = hostname === 'qsncc.com' || hostname.endsWith('.qsncc.com');
    if (!isQsnccDomain) {
      // For non-qsncc.com domains, check if they're from allowed domains or same origin
      const allowedDomains = process.env.ALLOWED_DOWNLOAD_DOMAINS?.split(',').map(d => d.trim()) || [];
      const currentOrigin = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : '';
      const isSameOrigin = hostname === currentOrigin || hostname.endsWith('.' + currentOrigin);
      const isAllowedDomain = allowedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
      
      if (!isSameOrigin && !isAllowedDomain && allowedDomains.length > 0) {
        console.error('[SECURITY] Blocked SSRF attempt to unauthorized domain:', hostname);
        throw new Error('Invalid URL: Domain not in allowed list');
      }
      
      // If no allowed domains configured, only allow same origin
      if (allowedDomains.length === 0 && !isSameOrigin) {
        console.error('[SECURITY] Blocked SSRF attempt to unauthorized domain:', hostname);
        throw new Error('Invalid URL: Domain not in allowed list');
      }
    }
    
    // Check if this is a secure-file/stream URL from our system (same or related domain)
    // This handles URLs like: https://uat-ncc-cv-screening.qsncc.com/api/secure-file/stream?filePath=...
    const isSecureFileStream = parsedUrl.pathname.includes('/api/secure-file/stream');
    
    if (isSecureFileStream) {
      // Extract filePath from query parameters
      const filePath = parsedUrl.searchParams.get('filePath');
      const fileNameParam = parsedUrl.searchParams.get('fileName');
      
      if (filePath) {
        try {
          // Download directly from MinIO instead of making HTTP request
          // This avoids authentication issues since we have direct access to MinIO
          // console.log(`[ATTACHMENTS] Detected secure-file/stream URL, downloading directly from MinIO: ${filePath}`);
          
          // First check if the object exists in MinIO
          try {
            await minioClient.statObject(MINIO_BUCKET, filePath);
          } catch (statError: any) {
            // If file doesn't exist in MinIO, check if URL is from different environment
            const isDifferentEnvironment = parsedUrl.hostname !== (process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : '');
            
            if (statError?.code === 'NotFound' || statError?.code === 'NoSuchKey') {
              console.warn(`[ATTACHMENTS] File not found in MinIO: ${filePath}. URL is from ${parsedUrl.hostname}, current system: ${process.env.NEXTAUTH_URL || 'unknown'}`);
              
              // If it's from a different environment, we cannot use HTTP fetch because
              // secure-file/stream endpoint only supports session cookies, not Bearer tokens
              if (isDifferentEnvironment) {
                throw new Error(`Failed to download file: The file is from a different environment (${parsedUrl.hostname}) and does not exist in the current MinIO storage. Cross-environment file access requires the file to be available in both MinIO instances, or you must use a direct file URL that supports Bearer token authentication. The secure-file/stream endpoint only supports session-based authentication (cookies), not Bearer tokens.`);
              } else {
                // Same environment but file doesn't exist
                throw new Error(`Failed to download file: File not found in storage. The file path '${filePath}' does not exist in the current MinIO bucket.`);
              }
            } else {
              throw statError;
            }
          }
          
          // File exists, proceed with download
          const stream = await minioClient.getObject(MINIO_BUCKET, filePath);
          const chunks: Buffer[] = [];
          
          // Convert stream to buffer
          for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
          }
          
          const buffer = Buffer.concat(chunks);
          
          // Determine filename
          let fileName = fileNameParam || 'downloaded-file';
          if (!fileNameParam || fileNameParam === 'downloaded-file') {
            // Extract from filePath if not provided
            const pathParts = filePath.split('/');
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart && lastPart.includes('.')) {
              fileName = lastPart;
            }
          }
          
          const contentType = inferContentType(filePath);
          
          return { buffer, fileName, contentType };
        } catch (minioError) {
          // If MinIO download fails, check if we should fall back to HTTP
          const errorMessage = minioError instanceof Error ? minioError.message : String(minioError);
          
          // If it's a "not found" error and we're not from different environment, don't fall back
          if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
            throw minioError;
          }
          
          // For other errors, fall through to HTTP fetch as fallback
          console.warn(`[ATTACHMENTS] MinIO direct download failed, falling back to HTTP: ${errorMessage}`);
        }
      }
    }
    
    // For non-secure-file URLs or if MinIO download failed, use HTTP fetch
    const fetchHeaders: HeadersInit = {
      'User-Agent': 'Studio-Attachment-Downloader/1.0',
      ...headers
    };
    
    // Log before attempting HTTP fetch
    const urlHost = parsedUrl.hostname;
    const currentHost = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : 'unknown';
    const isDifferentEnvironment = urlHost !== currentHost;
    const isSecureFileUrl = parsedUrl.pathname.includes('/api/secure-file/stream');
    
    // Check if cookies are provided (for secure-file URLs that need session auth)
    const hasCookie = headers && (headers['Cookie'] || headers['cookie'] || Object.keys(headers).some(k => k.toLowerCase() === 'cookie'));
    const cookiePreview = hasCookie ? (headers?.['Cookie'] || headers?.['cookie'] || Object.entries(headers || {}).find(([k]) => k.toLowerCase() === 'cookie')?.[1] || '').substring(0, 50) + '...' : 'none';
    
    // console.log(`[ATTACHMENTS] Attempting HTTP fetch. URL host: ${urlHost}, Current host: ${currentHost}, Is different env: ${isDifferentEnvironment}, Is secure-file URL: ${isSecureFileUrl}, Has auth headers: ${!!headers && Object.keys(headers).length > 0}, Has cookie: ${hasCookie}, Cookie preview: ${cookiePreview}`);
    
    const response = await fetch(url, {
      headers: fetchHeaders
    });
    
    if (!response.ok) {
      // Provide more specific error messages for authentication issues
      if (response.status === 401) {
        const hasAuth = headers && (headers['Authorization'] || headers['authorization'] || Object.keys(headers).some(k => k.toLowerCase() === 'authorization'));
        const hasCookie = headers && (headers['Cookie'] || headers['cookie'] || Object.keys(headers).some(k => k.toLowerCase() === 'cookie'));
        
        if (isSecureFileUrl) {
          // For secure-file URLs, we need cookies, not Bearer tokens
          if (!hasCookie) {
            throw new Error(`Failed to download file: ${response.status} ${response.statusText}. The secure-file/stream endpoint requires session-based authentication (cookies). Please provide a 'Cookie' header in the request body's 'headers' object. Example: { "headers": { "Cookie": "next-auth.session-token=your-session-token" } }. Bearer tokens are not supported for this endpoint.`);
          } else {
            throw new Error(`Failed to download file: ${response.status} ${response.statusText}. The secure-file/stream endpoint returned 401 even with cookies provided. The cookie may be expired, invalid, or from a different session. Please verify: (1) the cookie is from the same environment as the URL, (2) the cookie is not expired, (3) the session is still valid.`);
          }
        } else if (!hasAuth) {
          throw new Error(`Failed to download file: ${response.status} ${response.statusText}. The URL requires authentication. Please provide authentication headers in the request body (use 'headers' object or 'authToken' field).`);
        } else {
          // Get the auth header value (masked for security)
          const authHeader = headers?.['Authorization'] || headers?.['authorization'] || 
            Object.entries(headers || {}).find(([k]) => k.toLowerCase() === 'authorization')?.[1];
          const authPreview = authHeader ? (authHeader.length > 20 ? `${authHeader.substring(0, 20)}...` : authHeader) : 'not provided';
          throw new Error(`Failed to download file: ${response.status} ${response.statusText}. The provided authentication credentials are invalid or expired. Please verify that the Authorization token in the 'headers' object is valid and not expired. Token preview: ${authPreview}. If using a time-limited token, ensure it's refreshed before making the request.`);
        }
      } else if (response.status === 403) {
        const hasCookie = headers && (headers['Cookie'] || headers['cookie'] || Object.keys(headers).some(k => k.toLowerCase() === 'cookie'));
        let errorMsg = `Failed to download file: ${response.status} ${response.statusText}. Access forbidden`;
        
        if (isSecureFileUrl && isDifferentEnvironment) {
          if (hasCookie) {
            errorMsg += ` - The secure-file/stream endpoint from ${urlHost} returned 403 even with cookies provided. The cookie may be expired, invalid, or from a different session. Please verify: (1) the cookie is from the same environment (${urlHost}), (2) the cookie is not expired, (3) the session has the required permissions. Alternatively, ensure the file exists in both MinIO instances for direct access.`;
          } else {
            errorMsg += ` - The secure-file/stream endpoint from ${urlHost} only supports session-based authentication (cookies), not Bearer tokens. Please provide a 'Cookie' header in the request body's 'headers' object with a valid session cookie (e.g., "Cookie": "next-auth.session-token=..."). Cross-environment file access requires either: (1) the file to exist in both MinIO instances, (2) using cookies for authentication, or (3) using a direct file URL that supports Bearer token authentication.`;
          }
        } else if (isSecureFileUrl) {
          if (hasCookie) {
            errorMsg += ` - The secure-file/stream endpoint returned 403 even with cookies. The cookie may be expired or invalid, or the session may lack required permissions. The file may also not exist in the storage system.`;
          } else {
            errorMsg += ` - The secure-file/stream endpoint requires session-based authentication (cookies), not Bearer tokens. Please provide a 'Cookie' header. If this is from a different environment (${urlHost}), the file must exist in both MinIO instances, or you need to use cookies for authentication.`;
          }
        } else if (isDifferentEnvironment) {
          errorMsg += ` - The URL is from a different environment (${urlHost}) and the provided authentication token may not have access to this file, or the token may be expired. Please ensure the token is valid and has the necessary permissions for the target environment.`;
        } else {
          errorMsg += ` - The URL may require different permissions or the file may not be accessible.`;
        }
        
        console.error(`[ATTACHMENTS] 403 Error details - URL: ${url.substring(0, 100)}..., Host: ${urlHost}, Current: ${currentHost}, Secure-file: ${isSecureFileUrl}, Different env: ${isDifferentEnvironment}, Has cookie: ${hasCookie}`);
        
        throw new Error(errorMsg);
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
    const urlPath = parsedUrl.pathname;
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

// GET: List attachments for a Applicant
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
    // Get Applicant data for ownership check
    const applicant = await prisma.candidate.findUnique({
      where: { id },
      select: { id: true, recruiterId: true }
    });
    
    if (!applicant) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Applicant not found'));
    }
    
    // Check ownership-based permissions for viewing attachments
    const hasGlobalEditPermission = user.modulePermissions?.includes('APPLICANTS_EDIT_BASIC') || user.modulePermissions?.includes('APPLICANTS_EDIT_SENSITIVE');
    const hasOwnEditPermission = user.modulePermissions?.includes('APPLICANTS_EDIT_BASIC_OWN') || user.modulePermissions?.includes('APPLICANTS_EDIT_SENSITIVE_OWN');
    
    if (user.role !== 'Admin' && !hasGlobalEditPermission && !hasOwnEditPermission) {
      return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to view attachments'));
    }
    
    if (user.role !== 'Admin' && !hasGlobalEditPermission) {
      const editPermission = canEditApplicant(user, applicant.recruiterId, user.id);
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

  // Initial permission check - we'll do detailed ownership check after retrieving Applicant data
  const hasGlobalResumePermission = user.modulePermissions?.includes('APPLICANTS_RESUMES_UPLOAD');
  const hasOwnResumePermission = user.modulePermissions?.includes('APPLICANTS_RESUMES_UPLOAD_OWN');
  
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
    
    // Get Applicant data for ownership check
    const applicant = await prisma.candidate.findUnique({
      where: { id },
      select: { id: true, recruiterId: true }
    });
    
    if (!applicant) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Applicant not found'));
    }
    
    // Check ownership-based permissions for uploading attachments
    if (user.role !== 'Admin' && !hasGlobalResumePermission) {
      const resumePermission = canUploadResumes(user, applicant.recruiterId, user.id);
      if (!resumePermission.canUpload) {
        return SimpleErrorHandler.handleApiError(req, createForbiddenError(`Forbidden: ${resumePermission.reason}`));
      }
    }
    
    // Get label from form data (optional, defaults to 'resume')
    const label = (formData.get('label') as string) || 'resume';
    
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
        label: label,
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

  // Initial permission check - we'll do detailed ownership check after retrieving Applicant data
  const hasGlobalResumePermission = user.modulePermissions?.includes('APPLICANTS_RESUMES_UPLOAD');
  const hasOwnResumePermission = user.modulePermissions?.includes('APPLICANTS_RESUMES_UPLOAD_OWN');
  
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
      
      // Log what headers we received (for debugging)
      const headerKeys = Object.keys(downloadHeaders);
      const hasCookie = headerKeys.some(k => k.toLowerCase() === 'cookie');
      const hasAuth = headerKeys.some(k => k.toLowerCase() === 'authorization');
      // console.log(`[ATTACHMENTS] Received download headers. Keys: ${headerKeys.join(', ')}, Has Cookie: ${hasCookie}, Has Authorization: ${hasAuth}`);
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
    // console.log(`[ATTACHMENTS] Downloading file from URL: ${urlForLogging} (has auth: ${hasAuthHeaders})`);
    
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

  // Initial permission check - we'll do detailed ownership check after retrieving Applicant data
  const hasGlobalEditPermission = user.modulePermissions?.includes('APPLICANTS_EDIT_BASIC') || user.modulePermissions?.includes('APPLICANTS_EDIT_SENSITIVE');
  const hasOwnEditPermission = user.modulePermissions?.includes('APPLICANTS_EDIT_BASIC_OWN') || user.modulePermissions?.includes('APPLICANTS_EDIT_SENSITIVE_OWN');
  
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
    // Get Applicant data for ownership check
    const applicant = await prisma.candidate.findUnique({
      where: { id },
      select: { id: true, recruiterId: true }
    });
    
    if (!applicant) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Applicant not found'));
    }
    
    // Check ownership-based permissions for managing attachments
    if (user.role !== 'Admin' && !hasGlobalEditPermission) {
      const editPermission = canEditApplicant(user, applicant.recruiterId, user.id);
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

  // Initial permission check - we'll do detailed ownership check after retrieving Applicant data
  const hasGlobalEditPermission = user.modulePermissions?.includes('APPLICANTS_EDIT_BASIC') || user.modulePermissions?.includes('APPLICANTS_EDIT_SENSITIVE');
  const hasOwnEditPermission = user.modulePermissions?.includes('APPLICANTS_EDIT_BASIC_OWN') || user.modulePermissions?.includes('APPLICANTS_EDIT_SENSITIVE_OWN');
  
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
    // Get Applicant data for ownership check
    const applicant = await prisma.candidate.findUnique({
      where: { id },
      select: { id: true, recruiterId: true }
    });
    
    if (!applicant) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Applicant not found'));
    }
    
    // Check ownership-based permissions for deleting attachments
    if (user.role !== 'Admin' && !hasGlobalEditPermission) {
      const editPermission = canEditApplicant(user, applicant.recruiterId, user.id);
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