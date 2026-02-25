import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { getSignedUrl } from '@/lib/minio';
import prisma from '@/lib/prisma';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to access files
  if (!hasPermission(session.user, 'applicantS_VIEW')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to access files' }, { status: 403 });
  }

  const url = new URL(request.url);
  const filePath = url.searchParams.get('filePath');
  const applicantId = url.searchParams.get('applicantId');
  const headcountId = url.searchParams.get('headcountId');
  const expiresIn = parseInt(url.searchParams.get('expiresIn') || '3600', 10); // Default 1 hour

  if (!filePath) {
    return NextResponse.json({ error: 'File path is required' }, { status: 400 });
  }

  try {
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

