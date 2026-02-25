import { NextRequest, NextResponse } from 'next/server';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { logAudit } from '@/lib/auditLog';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ClearDuplicatesRequest {
  dryRun?: boolean;
  positionId?: string | null;
}

interface DuplicateGroup {
  email: string;
  positionId: string | null;
  applicants: Array<{
    id: string;
    name: string;
    email: string;
    positionId: string | null;
    fitScore: number;
    createdAt: Date;
  }>;
}

export async function POST(req: NextRequest) {
  // Handle CORS
  const headers = handleCors(req);
  
  try {
    // console.log('[Clear Duplicates] Starting request processing');

    // Verify API token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const user = token ? await verifyApiToken(token) : null;

    if (!user) {
      // console.log('[Clear Duplicates] Authentication failed - no valid token');
      return NextResponse.json({
        success: false,
        error: 'Invalid API token'
      }, { status: 401, headers });
    }

    // console.log('[Clear Duplicates] User authenticated:', user.id, user.role);

    // Check permissions
    if (user.role !== 'Admin' && !user.modulePermissions?.includes('applicantS_DELETE')) {
      // console.log('[Clear Duplicates] Permission denied for user:', user.id);
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions to manage Applicants'
      }, { status: 403, headers });
    }

    const body: ClearDuplicatesRequest = await req.json();
    const { dryRun = false, positionId } = body;

    // console.log('[Clear Duplicates] Request parameters:', { dryRun, positionId });

    // Validate positionId if provided
    if (positionId && typeof positionId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid positionId format'
      }, { status: 400, headers });
    }

    // Validate dryRun parameter
    if (typeof dryRun !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'Invalid dryRun format - must be boolean'
      }, { status: 400, headers });
    }

    // Build where clause
    const whereClause: any = {};
    if (positionId) {
      whereClause.positionId = positionId;
    }

    // console.log('[Clear Duplicates] Database query where clause:', whereClause);

    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
      // console.log('[Clear Duplicates] Database connection test successful');
    } catch (dbTestError) {
      console.error('[Clear Duplicates] Database connection test failed:', dbTestError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 500, headers });
    }

    // Fetch all applicants
    // console.log('[Clear Duplicates] Fetching applicants from database...');
    const applicants = await prisma.applicant.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        positionId: true, // Assuming applicant also has positionId for filtering
        fitScore: true, // Assuming applicant also has fitScore
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // console.log('[Clear Duplicates] Found applicants:', applicants.length);

    if (!applicants || applicants.length === 0) {
      // console.log('[Clear Duplicates] No applicants found');
      try {
        await logAudit('AUDIT', `Clear duplicates completed - no applicants found`, 'API:V1:Applicants:ClearDuplicates', user.id, {
          dryRun,
          positionId,
          applicantsFound: 0
        });
      } catch (auditError) {
        console.error('[Clear Duplicates] Audit logging failed:', auditError);
        // Continue execution even if audit logging fails
      }

      return NextResponse.json({
        success: true,
        data: {
          message: 'No Applicants found',
          duplicatesFound: 0,
          applicantsToDelete: 0,
          dryRun
        }
      }, { headers });
    }

    // Group applicants by email and positionId
    // console.log('[Clear Duplicates] Grouping applicants...');
    const applicantGroups = new Map<string, DuplicateGroup>();
    
    applicants.forEach((applicant: any) => {
      const key = `${applicant.email.toLowerCase()}-${applicant.positionId || 'null'}`;
      
      if (!applicantGroups.has(key)) {
        applicantGroups.set(key, {
          email: applicant.email,
          positionId: applicant.positionId,
          applicants: []
        });
      }
      
      applicantGroups.get(key)!.applicants.push(applicant);
    });

    // Find duplicate groups (groups with more than one applicant)
    const duplicateGroups = Array.from(applicantGroups.values())
      .filter(group => group.applicants.length > 1);

    // console.log('[Clear Duplicates] Found duplicate groups:', duplicateGroups.length);

    if (duplicateGroups.length === 0) {
      // console.log('[Clear Duplicates] No duplicates found');
      try {
        await logAudit('AUDIT', `Clear duplicates dry run completed - no duplicates found`, 'API:V1:Applicants:ClearDuplicates', user.id, {
          dryRun,
          positionId,
          duplicatesFound: 0
        });
      } catch (auditError) {
        console.error('[Clear Duplicates] Audit logging failed:', auditError);
        // Continue execution even if audit logging fails
      }

      return NextResponse.json({
        success: true,
        data: {
          message: 'No duplicate Applicants found',
          duplicatesFound: 0,
          applicantsToDelete: 0,
          dryRun
        }
      }, { headers });
    }

    // Process each duplicate group
    const keptApplicants: any[] = [];
    const applicantsToDelete: any[] = [];
    let totalToDelete = 0;

    for (const group of duplicateGroups) {
      // Sort by creation date (earliest first) and keep the first one
      const sortedApplicants = group.applicants.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        // Check if dates are valid before calling getTime()
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
          return 0; // If either date is invalid, treat as equal
        }
        return dateA.getTime() - dateB.getTime();
      });
      
      const keptApplicant = sortedApplicants[0];
      const toDelete = sortedApplicants.slice(1);
      
      keptApplicants.push(keptApplicant);
      applicantsToDelete.push(...toDelete);
      totalToDelete += toDelete.length;
    }

    // console.log('[Clear Duplicates] Processing complete. Total to delete:', totalToDelete);

    if (dryRun) {
      // console.log('[Clear Duplicates] Dry run mode - no actual deletion');
      try {
        await logAudit('AUDIT', `Clear duplicates dry run completed`, 'API:V1:Applicants:ClearDuplicates', user.id, {
          dryRun,
          positionId,
          duplicatesFound: duplicateGroups.length,
          applicantsToDelete: totalToDelete
        });
      } catch (auditError) {
        console.error('[Clear Duplicates] Audit logging failed:', auditError);
        // Continue execution even if audit logging fails
      }

      return NextResponse.json({
        success: true,
        data: {
          message: 'Dry run completed - no changes made',
          duplicatesFound: duplicateGroups.length,
          applicantsToDelete: totalToDelete,
          keptApplicants,
          applicantsToDeleteDetails: applicantsToDelete,
          dryRun
        }
      }, { headers });
    }

    // Actually delete the duplicates
    // console.log('[Clear Duplicates] Starting actual deletion...');
    const applicantIdsToDelete = applicantsToDelete.map(c => c.id);
    
    if (applicantIdsToDelete.length > 0) {
      try {
        // console.log('[Clear Duplicates] Deleting Applicants with IDs:', applicantIdsToDelete);
        const deleteResult = await prisma.applicant.deleteMany({
          where: {
            id: {
              in: applicantIdsToDelete
            }
          }
        });
        // console.log('[Clear Duplicates] Delete operation completed:', deleteResult);
      } catch (deleteError) {
        console.error('[Clear Duplicates] Error deleting Applicants:', deleteError);
        try {
          await logAudit('ERROR', `Failed to delete duplicate Applicants`, 'API:V1:Applicants:ClearDuplicates', user.id, {
            dryRun,
            positionId,
            applicantsToDelete: applicantIdsToDelete,
            error: (deleteError as Error).message
          });
        } catch (auditError) {
          console.error('[Clear Duplicates] Audit logging failed:', auditError);
        }

        return NextResponse.json({
          success: false,
          error: 'Failed to delete duplicate Applicants'
        }, { status: 500, headers });
      }
    }

    // console.log('[Clear Duplicates] Successfully completed deletion');
    try {
      await logAudit('AUDIT', `Successfully cleared ${totalToDelete} duplicate Applicants`, 'API:V1:Applicants:ClearDuplicates', user.id, {
        dryRun,
        positionId,
        duplicatesFound: duplicateGroups.length,
        applicantsDeleted: totalToDelete
      });
    } catch (auditError) {
      console.error('[Clear Duplicates] Audit logging failed:', auditError);
      // Continue execution even if audit logging fails
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `Successfully cleared ${totalToDelete} duplicate Applicants`,
        duplicatesFound: duplicateGroups.length,
        applicantsDeleted: totalToDelete,
        keptApplicants,
        dryRun
      }
    }, { headers });

  } catch (error) {
    console.error('[Clear Duplicates] Unexpected error:', error);
    
    // Safely get userId without potentially causing another error
    let userId = 'unknown';
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        const user = await verifyApiToken(token);
        userId = user?.id || 'unknown';
      }
    } catch (authError) {
      console.error('[Clear Duplicates] Error getting user ID for audit log:', authError);
    }
    
    try {
      await logAudit('ERROR', `Failed to clear duplicate Applicants`, 'API:V1:Applicants:ClearDuplicates', userId, {
        error: (error as Error).message
      });
    } catch (auditError) {
      console.error('[Clear Duplicates] Audit logging failed:', auditError);
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to clear duplicate Applicants'
    }, { status: 500, headers });
  }
}

