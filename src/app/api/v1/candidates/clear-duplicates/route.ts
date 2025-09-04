import { NextRequest, NextResponse } from 'next/server';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { logAudit } from '@/lib/auditLog';
import prisma from '@/lib/prisma';
import { isValidDate } from '@/lib/utils';

export const runtime = 'nodejs';

interface ClearDuplicatesRequest {
  dryRun?: boolean;
  positionId?: string | null;
}

interface DuplicateGroup {
  email: string;
  positionId: string | null;
  candidates: Array<{
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
    console.log('[Clear Duplicates] Starting request processing');

    // Verify API token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const user = token ? await verifyApiToken(token) : null;

    if (!user) {
      console.log('[Clear Duplicates] Authentication failed - no valid token');
      return NextResponse.json({
        success: false,
        error: 'Invalid API token'
      }, { status: 401, headers });
    }

    console.log('[Clear Duplicates] User authenticated:', user.id, user.role);

    // Check permissions
    if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_DELETE')) {
      console.log('[Clear Duplicates] Permission denied for user:', user.id);
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions to manage candidates'
      }, { status: 403, headers });
    }

    const body: ClearDuplicatesRequest = await req.json();
    const { dryRun = false, positionId } = body;

    console.log('[Clear Duplicates] Request parameters:', { dryRun, positionId });

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

    console.log('[Clear Duplicates] Database query where clause:', whereClause);

    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('[Clear Duplicates] Database connection test successful');
    } catch (dbTestError) {
      console.error('[Clear Duplicates] Database connection test failed:', dbTestError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 500, headers });
    }

    // Fetch all candidates
    console.log('[Clear Duplicates] Fetching candidates from database...');
    const candidates = await prisma.candidate.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        positionId: true,
        fitScore: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log('[Clear Duplicates] Found candidates:', candidates.length);

    if (!candidates || candidates.length === 0) {
      console.log('[Clear Duplicates] No candidates found');
      try {
        await logAudit('AUDIT', `Clear duplicates completed - no candidates found`, 'API:V1:Candidates:ClearDuplicates', user.id, {
          dryRun,
          positionId,
          candidatesFound: 0
        });
      } catch (auditError) {
        console.error('[Clear Duplicates] Audit logging failed:', auditError);
        // Continue execution even if audit logging fails
      }

      return NextResponse.json({
        success: true,
        data: {
          message: 'No candidates found',
          duplicatesFound: 0,
          candidatesToDelete: 0,
          dryRun
        }
      }, { headers });
    }

    // Group candidates by email and positionId
    console.log('[Clear Duplicates] Grouping candidates...');
    const candidateGroups = new Map<string, DuplicateGroup>();
    
    candidates.forEach((candidate: any) => {
      const key = `${candidate.email.toLowerCase()}-${candidate.positionId || 'null'}`;
      
      if (!candidateGroups.has(key)) {
        candidateGroups.set(key, {
          email: candidate.email,
          positionId: candidate.positionId,
          candidates: []
        });
      }
      
      candidateGroups.get(key)!.candidates.push(candidate);
    });

    // Find duplicate groups (groups with more than one candidate)
    const duplicateGroups = Array.from(candidateGroups.values())
      .filter(group => group.candidates.length > 1);

    console.log('[Clear Duplicates] Found duplicate groups:', duplicateGroups.length);

    if (duplicateGroups.length === 0) {
      console.log('[Clear Duplicates] No duplicates found');
      try {
        await logAudit('AUDIT', `Clear duplicates dry run completed - no duplicates found`, 'API:V1:Candidates:ClearDuplicates', user.id, {
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
          message: 'No duplicate candidates found',
          duplicatesFound: 0,
          candidatesToDelete: 0,
          dryRun
        }
      }, { headers });
    }

    // Process each duplicate group
    const keptCandidates: any[] = [];
    const candidatesToDelete: any[] = [];
    let totalToDelete = 0;

    for (const group of duplicateGroups) {
      // Sort by creation date (earliest first) and keep the first one
      const sortedCandidates = group.candidates.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        // Use safe date comparison to prevent getTime errors
        if (!isValidDate(dateA) || !isValidDate(dateB)) return 0;
        return dateA.getTime() - dateB.getTime();
      });
      
      const keptCandidate = sortedCandidates[0];
      const toDelete = sortedCandidates.slice(1);
      
      keptCandidates.push(keptCandidate);
      candidatesToDelete.push(...toDelete);
      totalToDelete += toDelete.length;
    }

    console.log('[Clear Duplicates] Processing complete. Total to delete:', totalToDelete);

    if (dryRun) {
      console.log('[Clear Duplicates] Dry run mode - no actual deletion');
      try {
        await logAudit('AUDIT', `Clear duplicates dry run completed`, 'API:V1:Candidates:ClearDuplicates', user.id, {
          dryRun,
          positionId,
          duplicatesFound: duplicateGroups.length,
          candidatesToDelete: totalToDelete
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
          candidatesToDelete: totalToDelete,
          keptCandidates,
          candidatesToDeleteDetails: candidatesToDelete,
          dryRun
        }
      }, { headers });
    }

    // Actually delete the duplicates
    console.log('[Clear Duplicates] Starting actual deletion...');
    const candidateIdsToDelete = candidatesToDelete.map(c => c.id);
    
    if (candidateIdsToDelete.length > 0) {
      try {
        console.log('[Clear Duplicates] Deleting candidates with IDs:', candidateIdsToDelete);
        const deleteResult = await prisma.candidate.deleteMany({
          where: {
            id: {
              in: candidateIdsToDelete
            }
          }
        });
        console.log('[Clear Duplicates] Delete operation completed:', deleteResult);
      } catch (deleteError) {
        console.error('[Clear Duplicates] Error deleting candidates:', deleteError);
        try {
          await logAudit('ERROR', `Failed to delete duplicate candidates`, 'API:V1:Candidates:ClearDuplicates', user.id, {
            dryRun,
            positionId,
            candidatesToDelete: candidateIdsToDelete,
            error: (deleteError as Error).message
          });
        } catch (auditError) {
          console.error('[Clear Duplicates] Audit logging failed:', auditError);
        }

        return NextResponse.json({
          success: false,
          error: 'Failed to delete duplicate candidates'
        }, { status: 500, headers });
      }
    }

    console.log('[Clear Duplicates] Successfully completed deletion');
    try {
      await logAudit('AUDIT', `Successfully cleared ${totalToDelete} duplicate candidates`, 'API:V1:Candidates:ClearDuplicates', user.id, {
        dryRun,
        positionId,
        duplicatesFound: duplicateGroups.length,
        candidatesDeleted: totalToDelete
      });
    } catch (auditError) {
      console.error('[Clear Duplicates] Audit logging failed:', auditError);
      // Continue execution even if audit logging fails
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `Successfully cleared ${totalToDelete} duplicate candidates`,
        duplicatesFound: duplicateGroups.length,
        candidatesDeleted: totalToDelete,
        keptCandidates,
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
      await logAudit('ERROR', `Failed to clear duplicate candidates`, 'API:V1:Candidates:ClearDuplicates', userId, {
        error: (error as Error).message
      });
    } catch (auditError) {
      console.error('[Clear Duplicates] Audit logging failed:', auditError);
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to clear duplicate candidates'
    }, { status: 500, headers });
  }
}
