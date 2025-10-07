import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getSignedUrl } from '@/lib/minio';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to access files
  if (!hasPermission(session.user, 'CANDIDATES_VIEW')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to access files' }, { status: 403 });
  }

  const url = new URL(request.url);
  const filePath = url.searchParams.get('filePath');
  const candidateId = url.searchParams.get('candidateId');
  const headcountId = url.searchParams.get('headcountId');
  const expiresIn = parseInt(url.searchParams.get('expiresIn') || '3600', 10); // Default 1 hour

  if (!filePath) {
    return NextResponse.json({ error: 'File path is required' }, { status: 400 });
  }

  try {
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
        select: { id: true, recruiterId: true }
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
        // Check ownership
        if (headcount.recruiterId !== session.user.id) {
          return NextResponse.json({ error: 'Access denied: You can only access files for your own headcounts' }, { status: 403 });
        }
      }
    }

    // Generate signed URL for secure file access
    const signedUrl = await getSignedUrl(filePath, expiresIn);

    return NextResponse.json({
      success: true,
      signedUrl,
      expiresIn,
      message: 'Secure file access URL generated'
    });

  } catch (error) {
    console.error('[SECURE-FILE] Error generating signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate secure file access URL' },
      { status: 500 }
    );
  }
}
