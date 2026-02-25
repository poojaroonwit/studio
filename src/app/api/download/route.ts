import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { getSignedUrl, minioClient, MINIO_BUCKET } from '@/lib/minio';
import prisma from '@/lib/prisma';
import dns from 'node:dns/promises';
import isIP from 'validator/lib/isIP';
import { Readable } from 'node:stream';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to download files
  // Users should be able to download files if they can view Applicants (basic access)
  if (!hasPermission(session.user, 'applicantS_VIEW')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to download files' }, { status: 403 });
  }

  const url = new URL(request.url);
  const fileUrl = url.searchParams.get('url');
  const fileName = url.searchParams.get('fileName');
  const filePath = url.searchParams.get('filePath');
  const applicantId = url.searchParams.get('applicantId');
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
      if (applicantId) {
        // Check if user can access this Applicant's files
        const applicant = await prisma.applicant.findUnique({
          where: { id: applicantId },
          select: { id: true, recruiterId: true }
        });

        if (!applicant) {
          return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
        }

        // Check ownership-based permissions
        const hasGlobalEditPermission = session.user.modulePermissions?.includes('applicantS_EDIT_BASIC') ||
          session.user.modulePermissions?.includes('applicantS_EDIT_SENSITIVE');
        const hasOwnEditPermission = session.user.modulePermissions?.includes('applicantS_EDIT_BASIC_OWN') ||
          session.user.modulePermissions?.includes('applicantS_EDIT_SENSITIVE_OWN');

        if (session.user.role !== 'Admin' && !hasGlobalEditPermission && !hasOwnEditPermission) {
          return NextResponse.json({ error: 'Insufficient permissions to access Applicant files' }, { status: 403 });
        }

        if (session.user.role !== 'Admin' && !hasGlobalEditPermission) {
          // Check ownership
          if (applicant.recruiterId !== session.user.id) {
            return NextResponse.json({ error: 'Access denied: You can only access files for your own Applicants' }, { status: 403 });
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

      // SECURITY FIX: Instead of generating a signed URL and then fetching it (SSRF risk),
      // use the MinIO client directly to get the object stream.
      try {
        const stream = await minioClient.getObject(MINIO_BUCKET, filePath);

        // Convert MinIO stream to arrayBuffer for the existing response construction logic
        const chunks: any[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        buffer = Buffer.concat(chunks).buffer as ArrayBuffer;

        // Get file metadata
        const stat = await minioClient.statObject(MINIO_BUCKET, filePath);

        // Mock a response-like headers object
        response = {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({
            'content-type': stat.metaData?.['content-type'] || 'application/octet-stream',
            'content-length': stat.size.toString(),
          })
        } as unknown as Response;

      } catch (minioError) {
        console.error('[MINIO] Error fetching object directly:', minioError);
        return NextResponse.json({ error: 'Failed to access file in storage' }, { status: 500 });
      }
    } else {
      // SECURITY: Block all external URL downloads to prevent SSRF
      return NextResponse.json({ error: 'Legacy URL-based access is no longer supported for security reasons' }, { status: 400 });
    }

    // Clear timeout on successful response or if buffer is already populated
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (!response.ok) {
      return NextResponse.json({
        error: `Failed to fetch file: ${response.status} ${response.statusText}`
      }, { status: response.status });
    }

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
        'Content-Disposition': `attachment; filename = "${finalFileName}"`,
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

