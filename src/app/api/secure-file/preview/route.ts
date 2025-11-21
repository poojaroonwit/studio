import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { minioClient, MINIO_BUCKET } from '@/lib/minio';
import prisma from '@/lib/prisma';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
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

export async function GET(request: NextRequest) {
  let session;
  try {
    // Try to get session - handle cases where cookies might not be sent properly
    // In Next.js App Router, getServerSession automatically reads cookies from headers
    session = await getServerSession(authOptions);
    
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
    const isSettingsImage = filePath.startsWith('settings/') || 
                          filePath.startsWith('candidate-source-logo/') ||
                          (filePath.startsWith('profile-images/') && !url.searchParams.get('candidateId'));
    
    // For settings images, allow any authenticated user
    // For other images, require view permissions
    if (!isSettingsImage) {
      const hasAnyViewPermission = 
        hasPermission(session.user, 'CANDIDATES_VIEW') || 
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
  const candidateId = url.searchParams.get('candidateId');
  const headcountId = url.searchParams.get('headcountId');
  const thumbnail = url.searchParams.get('thumbnail') === 'true';
  const width = url.searchParams.get('width') ? parseInt(url.searchParams.get('width') || '0', 10) : null;
  const height = url.searchParams.get('height') ? parseInt(url.searchParams.get('height') || '0', 10) : null;

  if (!filePath) {
    return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
  }

  // Re-check if this is a settings image (already checked above, but need it here for contextual auth)
  const isSettingsImage = filePath.startsWith('settings/') || 
                          filePath.startsWith('candidate-source-logo/') ||
                          (filePath.startsWith('profile-images/') && !candidateId);
  
  // Skip contextual authorization for settings images - they're public to all authenticated users
  if (!isSettingsImage) {
    // Contextual authorization for candidate/headcount specific files
    try {
      if (candidateId) {
        const candidate = await prisma.candidate.findUnique({ 
        where: { id: candidateId }, 
        select: { id: true, recruiterId: true } 
      });
      if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      const hasGlobalEdit = session.user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC') || 
                           session.user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE');
      const hasOwnEdit = session.user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC_OWN') || 
                        session.user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE_OWN');
      if (session.user.role !== 'Admin' && !hasGlobalEdit && !hasOwnEdit) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (session.user.role !== 'Admin' && !hasGlobalEdit && candidate.recruiterId !== session.user.id) {
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
  const shouldResize = isImage && (thumbnail || width || height);

  try {
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
        resizeWidth 200;
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
      
      const headers = new Headers();
      headers.set('Content-Type', outputFormat === 'png' ? 'image/png' : 'image/jpeg');
      headers.set('Content-Length', String(resizedBuffer.length));
      headers.set('Cache-Control', 'public, max-age=31536000, immutable'); // Cache thumbnails for 1 year
      // Allow embedding in iframes and images
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
      headers.set('X-Frame-Options', 'SAMEORIGIN');
      // CORS headers to ensure cookies are sent with image requests
      headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
      headers.set('Access-Control-Allow-Credentials', 'true');
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
      headers.set('Content-Disposition', `inline; filename="${(fileName || objectName).split('/').pop()}"`);
      
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
        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Content-Length', String(chunkSize));
        headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
        headers.set('Accept-Ranges', 'bytes');
        // Allow embedding in iframes and images
        headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
        headers.set('X-Frame-Options', 'SAMEORIGIN');
        // CORS headers to ensure cookies are sent with image requests
        headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
        headers.set('Access-Control-Allow-Credentials', 'true');
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
        headers.set('Content-Disposition', `inline; filename="${(fileName || objectName).split('/').pop()}"`);
        return new NextResponse(stream as unknown as ReadableStream, { status: 206, headers });
      }
    }

    // Full object
    const stream = await minioClient.getObject(MINIO_BUCKET, objectName);
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    if (size !== undefined) {
      headers.set('Content-Length', String(size));
      headers.set('Accept-Ranges', 'bytes');
    }
    // Allow embedding in iframes and images
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    // CORS headers to ensure cookies are sent with image requests
    headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    headers.set('Content-Disposition', `inline; filename="${(fileName || objectName).split('/').pop()}"`);
    return new NextResponse(stream as unknown as ReadableStream, { status: 200, headers });
  } catch (err) {
    console.error('[SECURE-PREVIEW] Error streaming object:', err);
    return NextResponse.json({ error: 'Failed to stream file' }, { status: 500 });
  }
}
