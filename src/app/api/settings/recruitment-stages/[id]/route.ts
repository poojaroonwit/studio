// src/app/api/settings/recruitment-stages/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '../../../../../lib/db';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import type { RecruitmentStage } from '@/lib/types';
import { logAudit } from '@/lib/auditLog';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { broadcastCandidateUpdate } from '@/lib/simple-broadcaster';
import { fetchAllRecruitmentStagesDb } from '@/lib/apiUtils';

const updateRecruitmentStageSchema = z.object({
  name: z.string().min(1, 'Stage name cannot be empty.').optional(),
  description: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
  color_complete: z.string().optional().nullable(),
  color_badge: z.string().optional().nullable(),
});

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/recruitment-stages\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * @openapi
 * /api/settings/recruitment-stages/{id}:
 *   get:
 *     summary: Get a recruitment stage by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the recruitment stage
 *     responses:
 *       200:
 *         description: Recruitment stage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Recruitment stage not found
 *   put:
 *     summary: Update a recruitment stage by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the recruitment stage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Recruitment stage updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Recruitment stage not found
 *   delete:
 *     summary: Delete a recruitment stage by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the recruitment stage
 *     responses:
 *       200:
 *         description: Recruitment stage deleted
 *       404:
 *         description: Recruitment stage not found
 */
export async function GET(request: NextRequest) {
    const id = extractIdFromUrl(request);
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

    const client = await getPool().connect();
    try {
        const result = await client.query('SELECT id, name, description, sort_order, color_complete, color_badge, is_system FROM "RecruitmentStage" WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return NextResponse.json({ message: "Recruitment stage not found" }, { status: 404 });
        }
        return NextResponse.json(result.rows[0]);
    } catch (error: any) {
        console.error(`Failed to fetch recruitment stage ${id}:`, error);
        return NextResponse.json({ message: "Error fetching recruitment stage", error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}

export async function PUT(request: NextRequest) {
    const id = extractIdFromUrl(request);
    const session = await getServerSession(authOptions);
    const actingUserId = session?.user?.id;
    if (!actingUserId) return new NextResponse('Unauthorized', { status: 401 });
    
    // Check permissions
    if (!hasPermission(session.user, 'RECRUITMENT_STAGES_EDIT')) {
        await logAudit('WARN', `Forbidden attempt to update recruitment stage by ${session.user.name || session.user.email}.`, 'API:RecruitmentStages:Edit', actingUserId);
        return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = updateRecruitmentStageSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    if (Object.keys(validation.data).length === 0) {
        return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }



    const client = await getPool().connect();
    try {
        const setClauses = Object.entries(validation.data).map(([key, value], index) => {
            const dbKey = key === 'sort_order' ? '"sort_order"' : key;
            return `${dbKey} = $${index + 1}`;
        });
        const queryParams = Object.values(validation.data);
        
        const updateQuery = `
            UPDATE "RecruitmentStage"
            SET ${setClauses.join(', ')}
            WHERE id = $${queryParams.length + 1}
            RETURNING *;
        `;



        const result = await client.query(updateQuery, [...queryParams, id]);

        if (result.rowCount === 0) {
            return NextResponse.json({ message: "Recruitment stage not found" }, { status: 404 });
        }

        await logAudit('AUDIT', `Recruitment stage '${result.rows[0].name}' (ID: ${id}) updated.`, 'API:RecruitmentStages:Update', actingUserId, { stageId: id, changes: validation.data });
        
        // Broadcast the updated stages list to all connected clients
        const updatedStages = await fetchAllRecruitmentStagesDb();
        broadcastCandidateUpdate({ action: 'recruitment_stages_updated', stages: updatedStages }, session.user.id);
        
        return NextResponse.json(result.rows[0]);

    } catch (error: any) {
        console.error(`Failed to update recruitment stage ${id}:`, error);
        await logAudit('ERROR', `Failed to update stage (ID: ${id}). Error: ${error.message}`, 'API:RecruitmentStages:Update', actingUserId, { input: body });
        return NextResponse.json({ message: "Error updating recruitment stage", error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}

export async function DELETE(request: NextRequest) {
    const id = extractIdFromUrl(request);
    const session = await getServerSession(authOptions);
    const actingUserId = session?.user?.id;
    if (!actingUserId) return new NextResponse('Unauthorized', { status: 401 });
    
    // Check permissions
    if (!hasPermission(session.user, 'RECRUITMENT_STAGES_EDIT')) {
        await logAudit('WARN', `Forbidden attempt to delete recruitment stage by ${session.user.name || session.user.email}.`, 'API:RecruitmentStages:Delete', actingUserId);
        return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
    }
    
    const client = await getPool().connect();
    try {
        // First, get the stage name to check if it's protected
        const stageResult = await client.query('SELECT name FROM "RecruitmentStage" WHERE id = $1', [id]);
        
        if (stageResult.rowCount === 0) {
            return NextResponse.json({ message: "Recruitment stage not found" }, { status: 404 });
        }
        
        const stageName = stageResult.rows[0].name;
        
        // Check if this stage has business logic dependencies that prevent deletion
        const PROTECTED_STAGES = ['Applied', 'Hired', 'Rejected'];
        if (PROTECTED_STAGES.includes(stageName)) {
            return NextResponse.json({ 
                message: `Cannot delete stage "${stageName}" as it has business logic dependencies. This stage is used in core system functionality.` 
            }, { status: 400 });
        }
        
        // Check if the stage is currently in use by candidates or transition records
        const candidateCount = await client.query(
            'SELECT COUNT(*) as count FROM "Candidate" WHERE "statusId" = $1',
            [id]
        );
        
        const transitionCount = await client.query(
            'SELECT COUNT(*) as count FROM "TransitionRecord" WHERE stage = $1',
            [stageName]
        );
        
        const totalUsage = parseInt(candidateCount.rows[0].count) + parseInt(transitionCount.rows[0].count);
        
        if (totalUsage > 0) {
            return NextResponse.json({ 
                message: `Stage "${stageName}" is currently in use by ${totalUsage} record(s). Please migrate these records to another stage before deletion.`,
                usageCount: totalUsage,
                stageName: stageName
            }, { status: 409 });
        }
        
        // Proceed with deletion
        const result = await client.query('DELETE FROM "RecruitmentStage" WHERE id = $1 RETURNING name', [id]);
        
        await logAudit('AUDIT', `Recruitment stage '${result.rows[0].name}' (ID: ${id}) deleted.`, 'API:RecruitmentStages:Delete', actingUserId, { stageId: id });
        
        // Broadcast the updated stages list to all connected clients
        const updatedStages = await fetchAllRecruitmentStagesDb();
        broadcastCandidateUpdate({ action: 'recruitment_stages_updated', stages: updatedStages }, session.user.id);
        
        return NextResponse.json({ message: "Recruitment stage deleted successfully" });

    } catch (error: any) {
        console.error(`Failed to delete recruitment stage ${id}:`, error);
        await logAudit('ERROR', `Failed to delete stage (ID: ${id}). Error: ${error.message}`, 'API:RecruitmentStages:Delete', actingUserId);
        return NextResponse.json({ message: "Error deleting recruitment stage", error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
