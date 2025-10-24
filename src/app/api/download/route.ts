import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getSignedUrl } from '@/lib/minio';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to download files
  // Users should be able to download files if they can view candidates (basic access)
  if (!hasPermission(session.user, 'CANDIDATES_VIEW')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to download files' }, { status: 403 });
  }

  const url = new URL(request.url);
  const fileUrl = url.searchParams.get('url');
  const fileName = url.searchParams.get('fileName');
  const filePath = url.searchParams.get('filePath');
  const candidateId = url.searchParams.get('candidateId');
  const headcountId = url.searchParams.get('headcountId');

  // Support both old URL-based and new filePath-based access
  if (!fileUrl && !filePath) {
    return NextResponse.json({ error: 'File URL or file path is required' }, { status: 400 });
  }

  let timeoutId: NodeJS.Timeout | null = null;

  try {
    let response: Response;
    let buffer: ArrayBuffer;

    if (filePath) {
      // New secure file access using filePath
      // Validate file access permissions based on context
      if (candidateId) {
        // Check if user can access this candidate's files
        const candidate = await prisma.candidate.findUnique({
          where: { id: candidateId },
          select: { id: true, recruiterId: true }
        });

        if (!candidate) {
          return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
        }

        // Check ownership-based permissions
        const hasGlobalEditPermission = session.user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC') || 
                                      session.user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE');
        const hasOwnEditPermission = session.user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC_OWN') || 
                                   session.user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE_OWN');

        if (session.user.role !== 'Admin' && !hasGlobalEditPermission && !hasOwnEditPermission) {
          return NextResponse.json({ error: 'Insufficient permissions to access candidate files' }, { status: 403 });
        }

        if (session.user.role !== 'Admin' && !hasGlobalEditPermission) {
          // Check ownership
          if (candidate.recruiterId !== session.user.id) {
            return NextResponse.json({ error: 'Access denied: You can only access files for your own candidates' }, { status: 403 });
          }
        }
      } else if (headcountId) {
        // Check if user can access headcount files
        const headcount = await prisma.headcount.findUnique({
          where: { id: headcountId },
          select: { id: true, position: { select: { recruiterId: true } } }
        });

        if (!headcount) {
          return NextResponse.json({ error: 'Headcount not found' }, { status: 404 });
        }

        // Check permissions for headcount access
        const hasGlobalEditPermission = session.user.modulePermissions?.includes('POSITIONS_EDIT_BASIC') || 
                                      session.user.modulePermissions?.includes('POSITIONS_EDIT_SENSITIVE');
        const hasOwnEditPermission = session.user.modulePermissions?.includes('POSITIONS_EDIT_BASIC_OWN') || 
                                   session.user.modulePermissions?.includes('POSITIONS_EDIT_SENSITIVE_OWN');

        if (session.user.role !== 'Admin' && !hasGlobalEditPermission && !hasOwnEditPermission) {
          return NextResponse.json({ error: 'Insufficient permissions to access headcount files' }, { status: 403 });
        }

        if (session.user.role !== 'Admin' && !hasGlobalEditPermission) {
          // Check ownership via position's recruiter
          if (headcount.position?.recruiterId !== session.user.id) {
            return NextResponse.json({ error: 'Access denied: You can only access files for your own headcounts' }, { status: 403 });
          }
        }
      }

      // Generate signed URL for secure file access
      const signedUrl = await getSignedUrl(filePath, 3600); // 1 hour expiration
      
      // Fetch the file using signed URL
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for signed URLs

      response = await fetch(signedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Studio-Download-API/1.0'
        }
      });
    } else {
      // Legacy URL-based access (for backward compatibility)
      // Validate URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(fileUrl!);
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }

      // Fetch the file from the URL with timeout
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      response = await fetch(fileUrl!, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Studio-Download-API/1.0'
        }
      });
    }
    
    // Clear timeout on successful response
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch file: ${response.status} ${response.statusText}` 
      }, { status: response.status });
    }

    // Get the file content as a buffer
    buffer = await response.arrayBuffer();
    
    if (buffer.byteLength === 0) {
      return NextResponse.json({ 
        error: 'Downloaded file is empty' 
      }, { status: 400 });
    }
    
    // Determine the filename
    let finalFileName = fileName || 'downloaded-file';
    
    // If no filename provided, try to extract from URL or content-disposition header
    if (!fileName) {
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          finalFileName = filenameMatch[1].replace(/['"]/g, '');
        }
      } else if (filePath) {
        // Extract from filePath
        const pathParts = filePath.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          finalFileName = lastPart;
        }
      } else if (fileUrl) {
        // Extract from URL path (legacy)
        const parsedUrl = new URL(fileUrl);
        const urlPath = parsedUrl.pathname;
        const pathParts = urlPath.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          finalFileName = lastPart;
        }
      }
    }

    // Sanitize filename for security
    finalFileName = finalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Get content type from response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Create response with proper headers for download
    const downloadResponse = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${finalFileName}"`,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
        'X-Download-Source': 'Studio-Download-API'
      },
    });

    return downloadResponse;
  } catch (error) {
    // Clear timeout on error
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    console.error('Download error:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ 
        error: 'Download timeout - file is too large or server is slow' 
      }, { status: 408 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to download file' 
    }, { status: 500 });
  }
} 
