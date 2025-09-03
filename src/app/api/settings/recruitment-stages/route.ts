// src/app/api/settings/recruitment-stages/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '../../../../lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { broadcastCandidateUpdate } from '@/lib/simple-broadcaster';
import { fetchAllRecruitmentStagesDb } from '@/lib/apiUtils';

const recruitmentStageSchema = z.object({
  name: z.string().min(1, 'Stage name cannot be empty.'),
  description: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
  color_complete: z.string().optional().nullable(), // Add color_complete
  color_badge: z.string().optional().nullable(),    // Add color_badge
});

/**
 * @openapi
 * /api/settings/recruitment-stages:
 *   get:
 *     summary: Get all recruitment stages
 *     description: Returns all recruitment stages. Requires authentication.
 *     responses:
 *       200:
 *         description: List of recruitment stages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new recruitment stage
 *     description: Creates a new recruitment stage. Requires authentication and Admin or RECRUITMENT_STAGES_EDIT permission.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               is_system:
 *                 type: boolean
 *               sort_order:
 *                 type: integer
 *           examples:
 *             example:
 *               summary: Example request
 *               value:
 *                 name: "Screening"
 *                 description: "Screening stage"
 *                 is_system: false
 *                 sort_order: 2
 *     responses:
 *       201:
 *         description: Recruitment stage created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               success:
 *                 summary: Example response
 *                 value:
 *                   id: "uuid"
 *                   name: "Screening"
 *                   description: "Screening stage"
 *                   is_system: false
 *                   sort_order: 2
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden: Insufficient permissions
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stageIds = searchParams.get('ids'); // New parameter for getting specific stage names
  
  try {
    if (stageIds) {
      // Get specific stages by IDs or names (no authentication required for this use case)
      const ids = stageIds.split(',').filter(id => id.trim());
      if (ids.length === 0) {
        return NextResponse.json({ error: 'No valid stage IDs or names provided' }, { status: 400 });
      }
      
      const client = await getPool().connect();
      try {
        // Check if the provided values are UUIDs or stage names
        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        
        const uuidIds = ids.filter(id => isUuid(id));
        const nameIds = ids.filter(id => !isUuid(id));
        
        let query: string;
        let params: any[];
        
        if (uuidIds.length > 0 && nameIds.length > 0) {
          // Mixed case: some UUIDs, some names
          query = `
            SELECT id, name 
            FROM "RecruitmentStage" 
            WHERE id = ANY($1::uuid[]) OR name = ANY($2)
            ORDER BY "sort_order", name
          `;
          params = [uuidIds, nameIds];
        } else if (uuidIds.length > 0) {
          // All UUIDs
          query = `
            SELECT id, name 
            FROM "RecruitmentStage" 
            WHERE id = ANY($1::uuid[])
            ORDER BY "sort_order", name
          `;
          params = [uuidIds];
        } else {
          // All names
          query = `
            SELECT id, name 
            FROM "RecruitmentStage" 
            WHERE name = ANY($1)
            ORDER BY "sort_order", name
          `;
          params = [nameIds];
        }
        
        const result = await client.query(query, params);
        
        return NextResponse.json(result.rows);
      } finally {
        client.release();
      }
    } else {
      // Get all recruitment stages (existing functionality with authentication)
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });
      
      // Check permissions
      if (!hasPermission(session.user, 'RECRUITMENT_STAGES_EDIT')) {
          return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
      }

      const client = await getPool().connect();
      try {
          const result = await client.query('SELECT id, name, description, sort_order, color_complete, color_badge, is_system FROM "RecruitmentStage" ORDER BY sort_order ASC, name ASC');
          return NextResponse.json(result.rows);
      } finally {
          client.release();
      }
    }
  } catch (error: any) {
    console.error('Error fetching recruitment stages:', error);
    return NextResponse.json({ error: 'Failed to fetch recruitment stages' }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const actingUserId = session?.user?.id;
    if (!actingUserId) return new NextResponse('Unauthorized', { status: 401 });
    
    // Check permissions
    if (!hasPermission(session.user, 'RECRUITMENT_STAGES_EDIT')) {
        await logAudit('WARN', `Forbidden attempt to create recruitment stage by ${session.user.name || session.user.email}.`, 'API:RecruitmentStages:Create', actingUserId);
        return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }
    
    const validation = recruitmentStageSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, description, sort_order, color_complete, color_badge } = body;
    const newId = uuidv4();
    
    const client = await getPool().connect();
    try {
        const result = await client.query(
            'INSERT INTO "RecruitmentStage" (id, name, description, sort_order, color_complete, color_badge, is_system) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, description, sort_order, color_complete, color_badge, is_system',
            [newId, name, description, sort_order ?? 0, color_complete || null, color_badge || null, false]
        );
        await logAudit('AUDIT', `Recruitment stage '${name}' created.`, 'API:RecruitmentStages:Create', actingUserId, { stageId: newId });
        
        // Broadcast the updated stages list to all connected clients
        const updatedStages = await fetchAllRecruitmentStagesDb();
        broadcastCandidateUpdate({ action: 'recruitment_stages_updated', stages: updatedStages }, session.user.id);
        
        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error: any) {
        console.error("Failed to create recruitment stage:", error);
        await logAudit('ERROR', `Failed to create stage '${name}'. Error: ${error.message}`, 'API:RecruitmentStages:Create', actingUserId, { input: body });
        return NextResponse.json({ message: "Error creating recruitment stage", error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
    
