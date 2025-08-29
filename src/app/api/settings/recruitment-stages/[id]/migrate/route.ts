// src/app/api/settings/recruitment-stages/[id]/migrate/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '../../../../../../lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/recruitment-stages\/([^/]+)\/migrate/);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
    const id = extractIdFromUrl(request);
    const session = await getServerSession(authOptions);
    const actingUserId = session?.user?.id;
    if (!actingUserId) return new NextResponse('Unauthorized', { status: 401 });
    
    // Check permissions
    if (session.user.role !== 'Admin' &&  !session.user.modulePermissions?.includes('RECRUITMENT_STAGES_MANAGE')) {
        await logAudit('WARN', `Forbidden attempt to migrate recruitment stage by ${session.user.name || session.user.email}.`, 'API:RecruitmentStages:Migrate', actingUserId);
        return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    const { replacementStageName } = body;
    if (!replacementStageName) {
        return NextResponse.json({ message: 'Replacement stage name is required' }, { status: 400 });
    }
    
    const client = await getPool().connect();
    try {
        // Get the stage to be migrated
        const stageResult = await client.query('SELECT name FROM "RecruitmentStage" WHERE id = $1', [id]);
        if (stageResult.rowCount === 0) {
            return NextResponse.json({ message: "Recruitment stage not found" }, { status: 404 });
        }
        
        const stageName = stageResult.rows[0].name;
        
        // Verify the replacement stage exists
        const replacementStageResult = await client.query('SELECT name FROM "RecruitmentStage" WHERE name = $1', [replacementStageName]);
        if (replacementStageResult.rowCount === 0) {
            return NextResponse.json({ message: `Replacement stage "${replacementStageName}" not found` }, { status: 404 });
        }
        
        await client.query('BEGIN');
        
        // Migrate candidates
        const candidateResult = await client.query(
            'UPDATE "Candidate" SET status = $1 WHERE status = $2 RETURNING id',
            [replacementStageName, stageName]
        );
        
        // Migrate transition records
        const transitionResult = await client.query(
            'UPDATE "TransitionRecord" SET stage = $1 WHERE stage = $2 RETURNING id',
            [replacementStageName, stageName]
        );
        
        const migratedCandidates = candidateResult.rowCount;
        const migratedTransitions = transitionResult.rowCount;
        
        await client.query('COMMIT');
        
        await logAudit('AUDIT', `Migrated ${migratedCandidates} candidates and ${migratedTransitions} transition records from stage "${stageName}" to "${replacementStageName}".`, 'API:RecruitmentStages:Migrate', actingUserId, { 
            stageId: id, 
            oldStageName: stageName, 
            newStageName: replacementStageName,
            migratedCandidates,
            migratedTransitions
        });
        
        return NextResponse.json({ 
            message: `Successfully migrated ${migratedCandidates} candidates and ${migratedTransitions} transition records to "${replacementStageName}"`,
            migratedCandidates,
            migratedTransitions
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`Failed to migrate recruitment stage ${id}:`, error);
        await logAudit('ERROR', `Failed to migrate stage (ID: ${id}). Error: ${error.message}`, 'API:RecruitmentStages:Migrate', actingUserId);
        return NextResponse.json({ message: "Error migrating recruitment stage", error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
