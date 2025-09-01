import { NextRequest, NextResponse } from 'next/server';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { logAudit } from '@/lib/auditLog';
import prisma from '@/lib/prisma';

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

    // Verify API token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const user = token ? await verifyApiToken(token) : null;

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API token'
      }, { status: 401, headers });
    }

    // Check permissions
    if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions to manage candidates'
      }, { status: 403, headers });
    }

    const body: ClearDuplicatesRequest = await req.json();
    const { dryRun = false, positionId } = body;

    // Build where clause
    const whereClause: any = {};
    if (positionId) {
      whereClause.positionId = positionId;
    }

    // Fetch all candidates
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

    // Group candidates by email and positionId
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

    if (duplicateGroups.length === 0) {
      await logAudit('AUDIT', `Clear duplicates dry run completed - no duplicates found`, 'API:V1:Candidates:ClearDuplicates', user.id, {
        dryRun,
        positionId,
        duplicatesFound: 0
      });

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
      const sortedCandidates = group.candidates.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      const keptCandidate = sortedCandidates[0];
      const toDelete = sortedCandidates.slice(1);
      
      keptCandidates.push(keptCandidate);
      candidatesToDelete.push(...toDelete);
      totalToDelete += toDelete.length;
    }

    if (dryRun) {
      await logAudit('AUDIT', `Clear duplicates dry run completed`, 'API:V1:Candidates:ClearDuplicates', user.id, {
        dryRun,
        positionId,
        duplicatesFound: duplicateGroups.length,
        candidatesToDelete: totalToDelete
      });

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
    const candidateIdsToDelete = candidatesToDelete.map(c => c.id);
    
    await prisma.candidate.deleteMany({
      where: {
        id: {
          in: candidateIdsToDelete
        }
      }
    });

    await logAudit('AUDIT', `Successfully cleared ${totalToDelete} duplicate candidates`, 'API:V1:Candidates:ClearDuplicates', user.id, {
      dryRun,
      positionId,
      duplicatesFound: duplicateGroups.length,
      candidatesDeleted: totalToDelete
    });

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
    console.error('Error clearing duplicate candidates:', error);
    
    const userId = req.headers.get('authorization') ? 
      (await verifyApiToken(req.headers.get('authorization')!.split(' ')[1]))?.id : 
      'unknown';
    
    await logAudit('ERROR', `Failed to clear duplicate candidates`, 'API:V1:Candidates:ClearDuplicates', userId, {
      error: (error as Error).message
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to clear duplicate candidates'
    }, { status: 500, headers });
  }
}
