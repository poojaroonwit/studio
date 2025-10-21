import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { minioClient, MINIO_BUCKET } from '@/lib/minio';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Basic permission gate
  if (!hasPermission(session.user, 'CANDIDATES_VIEW') && !hasPermission(session.user, 'POSITIONS_VIEW')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const filePath = url.searchParams.get('filePath') || '';
  const fileName = url.searchParams.get('fileName') || undefined;
  const candidateId = url.searchParams.get('candidateId');
  const headcountId = url.searchParams.get('headcountId');

  if (!filePath) {
    return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
  }

  // Contextual authorization
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

  // Range support for large files
  const range = request.headers.get('range');
  const contentType = inferContentType(filePath);
  const objectName = filePath;

  try {
    // Get object size for range handling
    const stat = await minioClient.statObject(MINIO_BUCKET, objectName);
    const size = stat.size ?? undefined;

    if (range && size !== undefined) {
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
    headers.set('Content-Disposition', `inline; filename="${(fileName || objectName).split('/').pop()}"`);
    return new NextResponse(stream as unknown as ReadableStream, { status: 200, headers });
  } catch (err) {
    console.error('[SECURE-PREVIEW] Error streaming object:', err);
    return NextResponse.json({ error: 'Failed to stream file' }, { status: 500 });
  }
}
