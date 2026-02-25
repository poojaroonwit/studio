import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { minioClient, MINIO_BUCKET } from '@/lib/minio';
import prisma from '@/lib/prisma';
import sharp from 'sharp';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const { getAllowedOrigin } = await import('@/lib/cors');
  const allowedOrigin = getAllowedOrigin(request);

  if (!allowedOrigin) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function inferContentType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

// Simple headers for Edge iframe compatibility
async function getSimpleHeaders(contentType: string, fileName: string, request: NextRequest): Promise<Headers> {
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Content-Disposition', `inline; filename="${fileName}"`);

  // Use proper CORS validation instead of wildcard
  const { getAllowedOrigin } = await import('@/lib/cors');
  const allowedOrigin = getAllowedOrigin(request);
  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Only essential header for Edge iframe embedding
  headers.set('Content-Security-Policy', "frame-ancestors 'self'");
  return headers;
}

export async function GET(request: NextRequest) {
  let session;
  try {
    // Try to get session - handle cases where cookies might not be sent properly
    // In Next.js App Router, auth() automatically reads cookies from headers
    session = await auth();

    // For image requests, we need to be more lenient with authentication
    // Images loaded via <img> tags should work if user has a valid session
    if (!session?.user?.id) {
      console.error('[SECURE-PREVIEW] No session found for image request', {
        url: request.url,
        cookies: request.headers.get('cookie') ? 'present' : 'missing',
        referer: request.headers.get('referer')
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if this is a settings/logo image that should be accessible to all authenticated users
    const url = new URL(request.url);
    const filePath = url.searchParams.get('filePath') || '';
    const applicantIdParam = url.searchParams.get('applicantId');
    const isSettingsImage = filePath.startsWith('settings/') ||
      filePath.startsWith('Applicant-source-logo/') ||
      (filePath.startsWith('profile-images/') && !applicantIdParam);

    // For settings images, allow any authenticated user
    // For other images, require view permissions
    if (!isSettingsImage) {
      const hasAnyViewPermission =
        hasPermission(session.user, 'applicantS_VIEW') ||
        hasPermission(session.user, 'POSITIONS_VIEW') ||
        session.user.role === 'Admin';

      if (!hasAnyViewPermission) {
        console.error('[SECURE-PREVIEW] User lacks required permissions:', session.user.id);
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  } catch (sessionError) {
    console.error('[SECURE-PREVIEW] Error reading session:', sessionError);
    return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
  }

  // Ensure session is available for rest of function
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const filePath = url.searchParams.get('filePath') || '';
  const fileName = url.searchParams.get('fileName') || undefined;
  const applicantId = url.searchParams.get('applicantId');
  const headcountId = url.searchParams.get('headcountId');
  const thumbnail = url.searchParams.get('thumbnail') === 'true';
  const width = url.searchParams.get('width') ? parseInt(url.searchParams.get('width') || '0', 10) : null;
  const height = url.searchParams.get('height') ? parseInt(url.searchParams.get('height') || '0', 10) : null;

  if (!filePath) {
    return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
  }

  // Re-check if this is a settings image (already checked above, but need it here for contextual auth)
  const isSettingsImage = filePath.startsWith('settings/') ||
    filePath.startsWith('Applicant-source-logo/') ||
    (filePath.startsWith('profile-images/') && !applicantId);

  // Skip contextual authorization for settings images - they're public to all authenticated users
  if (!isSettingsImage) {
      // Contextual authorization for Applicant/headcount specific files
      try {
        if (applicantId) {
          const applicant = await prisma.applicant.findUnique({
            where: { id: applicantId },
            select: { id: true, recruiterId: true }
          });
        if (!applicant) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
        const hasGlobalEdit = session.user.modulePermissions?.includes('applicantS_EDIT_BASIC') ||
          session.user.modulePermissions?.includes('applicantS_EDIT_SENSITIVE');
        const hasOwnEdit = session.user.modulePermissions?.includes('applicantS_EDIT_BASIC_OWN') ||
          session.user.modulePermissions?.includes('applicantS_EDIT_SENSITIVE_OWN');
        if (session.user.role !== 'Admin' && !hasGlobalEdit && !hasOwnEdit) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (session.user.role !== 'Admin' && !hasGlobalEdit && applicant.recruiterId !== session.user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } else if (headcountId) {
        const headcount = await prisma.headcount.findUnique({
          where: { id: headcountId },
          select: { id: true, position: { select: { recruiterId: true } } }
        });
        if (!headcount) return NextResponse.json({ error: 'Headcount not found' }, { status: 404 });
        const hasGlobalEdit = session.user.modulePermissions?.includes('POSITIONS_EDIT_BASIC') ||
          session.user.modulePermissions?.includes('POSITIONS_EDIT_SENSITIVE');
        const hasOwnEdit = session.user.modulePermissions?.includes('POSITIONS_EDIT_BASIC_OWN') ||
          session.user.modulePermissions?.includes('POSITIONS_EDIT_SENSITIVE_OWN');
        if (session.user.role !== 'Admin' && !hasGlobalEdit && !hasOwnEdit) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (session.user.role !== 'Admin' && !hasGlobalEdit && headcount.position?.recruiterId !== session.user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    } catch (authErr) {
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }
  }

  // Range support for large files (skip for thumbnails)
  const range = request.headers.get('range');
  const contentType = inferContentType(filePath);
  const objectName = filePath;
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filePath);
  const isPdf = /\.pdf$/i.test(filePath);
  const shouldResize = isImage && (thumbnail || width || height);

  // Determine if request is same-origin for proper CORP header
  const requestOrigin = request.headers.get('origin');
  const requestHost = request.headers.get('host');
  const referer = request.headers.get('referer');
  const isSameOrigin = !requestOrigin ||
    (referer && new URL(referer).origin === new URL(request.url).origin) ||
    (requestOrigin && new URL(requestOrigin).host === requestHost);

  try {
    // Log the file path being requested for debugging
    console.log('[SECURE-PREVIEW] Attempting to access file:', {
      objectName,
      bucket: MINIO_BUCKET,
      filePath,
      applicantId: applicantId || 'none',
      headcountId: headcountId || 'none',
      thumbnail,
      requestedBy: session.user.id
    });

    // Get object size for range handling
    const stat = await minioClient.statObject(MINIO_BUCKET, objectName);
    const size = stat.size ?? undefined;

    // Handle image resizing for thumbnails
    if (shouldResize) {
      const stream = await minioClient.getObject(MINIO_BUCKET, objectName);
      const chunks: Buffer[] = [];

      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const imageBuffer = Buffer.concat(chunks);

      // Determine resize dimensions
      let resizeWidth: number | null = null;
      let resizeHeight: number | null = null;

      if (thumbnail) {
        // Default thumbnail size: 150x150 (maintains aspect ratio) - reduced for smaller file size
        resizeWidth = 200;
        resizeHeight = 200;
      } else {
        resizeWidth = width;
        resizeHeight = height;
      }

      // Resize image using sharp
      let sharpInstance = sharp(imageBuffer);

      if (resizeWidth && resizeHeight) {
        sharpInstance = sharpInstance.resize(resizeWidth, resizeHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      } else if (resizeWidth) {
        sharpInstance = sharpInstance.resize(resizeWidth, null, {
          withoutEnlargement: true
        });
      } else if (resizeHeight) {
        sharpInstance = sharpInstance.resize(null, resizeHeight, {
          withoutEnlargement: true
        });
      }

      // Convert to JPEG/PNG with reduced quality for smaller file size
      const outputFormat = filePath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
      const formatOptions: any = {
        quality: thumbnail ? 60 : 85, // Lower quality for thumbnails (reduced from 75 to 60 for smaller file size)
      };

      // Only add mozjpeg option for JPEG format
      if (outputFormat === 'jpeg') {
        formatOptions.mozjpeg = true;
      }

      const resizedBuffer = await sharpInstance
        .toFormat(outputFormat, formatOptions)
        .toBuffer();

      const headers = await getSimpleHeaders(
        outputFormat === 'png' ? 'image/png' : 'image/jpeg',
        (fileName || objectName).split('/').pop() || 'file',
        request
      );
      headers.set('Content-Length', String(resizedBuffer.length));
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');

      return new NextResponse(new Uint8Array(resizedBuffer), { status: 200, headers });
    }

    if (range && size !== undefined && !shouldResize) {
      // Parse bytes=START-END
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : size - 1;
        const chunkSize = end - start + 1;
        const stream = await minioClient.getPartialObject(MINIO_BUCKET, objectName, start, chunkSize);
        const headers = await getSimpleHeaders(
          contentType,
          (fileName || objectName).split('/').pop() || 'file',
          request
        );
        headers.set('Content-Length', String(chunkSize));
        headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
        headers.set('Accept-Ranges', 'bytes');
        return new NextResponse(stream as unknown as ReadableStream, { status: 206, headers });
      }
    }

    // Full object
    const stream = await minioClient.getObject(MINIO_BUCKET, objectName);
    const headers = await getSimpleHeaders(
      contentType,
      (fileName || objectName).split('/').pop() || 'file',
      request
    );
    if (size !== undefined) {
      headers.set('Content-Length', String(size));
      headers.set('Accept-Ranges', 'bytes');
    }
    return new NextResponse(stream as unknown as ReadableStream, { status: 200, headers });
  } catch (err: unknown) {
    // Type-safe error handling
    const error = err as { code?: string; message?: string };
    const errorCode = error?.code || 'Unknown';
    const errorMessage = error?.message || 'Unknown error';

    // Log detailed error information for debugging
    console.error('[SECURE-PREVIEW] Error streaming object:', {
      errorCode,
      errorMessage,
      objectName,
      bucket: MINIO_BUCKET,
      filePath,
      applicantId: applicantId || 'none',
      headcountId: headcountId || 'none',
      requestedBy: session?.user?.id || 'unknown',
      fullError: err
    });

    // Return appropriate status code based on error type
    if (errorCode === 'NotFound') {
      // For image requests (including CSS background images), return a transparent 1x1 PNG
      // This prevents broken images in CSS backgrounds and img tags
      if (isImage) {
        // Create a transparent 1x1 PNG buffer
        const transparentPng = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        );
        
        const headers = await getSimpleHeaders(
          'image/png',
          (fileName || objectName).split('/').pop() || 'file',
          request
        );
        headers.set('Content-Length', String(transparentPng.length));
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        headers.set('X-File-Status', 'not-found'); // Custom header to indicate file was missing
        
        return new NextResponse(transparentPng, { status: 200, headers });
      }
      
      // For non-image files, return JSON error
      return NextResponse.json({
        error: 'File not found',
        details: `The file "${objectName}" does not exist in storage`,
        code: 'FILE_NOT_FOUND'
      }, { status: 404 });
    }

    // For other errors, return 500
    return NextResponse.json({
      error: 'Failed to stream file',
      details: errorMessage,
      code: errorCode
    }, { status: 500 });
  }
}

