import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { SimpleErrorHandler,
  createUnauthorizedError,
  createValidationError,
  createInternalServerError
} from '@/lib/errors';;
import { z } from 'zod';

const createTransitionSchema = z.object({
  candidateId: z.string().uuid('Invalid candidate ID'),
  fromStageId: z.string().uuid('Invalid from stage ID'),
  toStageId: z.string().uuid('Invalid to stage ID'),
  notes: z.string().optional(),
  transitionDate: z.string().datetime().optional()
});

/**
 * @openapi
 * /api/v1/transitions:
 *   get:
 *     summary: Get candidate transitions (V1 API)
 *     description: Returns a list of candidate stage transitions. Requires Bearer token authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: candidateId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by candidate ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of transitions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       candidateId:
 *                         type: string
 *                         format: uuid
 *                       fromStageId:
 *                         type: string
 *                         format: uuid
 *                       toStageId:
 *                         type: string
 *                         format: uuid
 *                       fromStageName:
 *                         type: string
 *                       toStageName:
 *                         type: string
 *                       notes:
 *                         type: string
 *                       transitionDate:
 *                         type: string
 *                         format: date-time
 *                       createdBy:
 *                         type: string
 *                         format: uuid
 *                       createdByName:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *                   description: Total number of transitions
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 path:
 *                   type: string
 *                 method:
 *                   type: string
 *                 statusCode:
 *                   type: integer
 *             examples:
 *               success:
 *                 summary: Example response
 *                 value:
 *                   success: true
 *                   data:
 *                     - id: "123e4567-e89b-12d3-a456-426614174000"
 *                       candidateId: "123e4567-e89b-12d3-a456-426614174001"
 *                       fromStageId: "123e4567-e89b-12d3-a456-426614174002"
 *                       toStageId: "123e4567-e89b-12d3-a456-426614174003"
 *                       fromStageName: "Applied"
 *                       toStageName: "Interview"
 *                       notes: "Candidate passed initial screening"
 *                       transitionDate: "2024-01-01T00:00:00.000Z"
 *                       createdBy: "123e4567-e89b-12d3-a456-426614174004"
 *                       createdByName: "Sample User"
 *                       createdAt: "2024-01-01T00:00:00.000Z"
 *                   total: 1
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *                   path: "/api/v1/transitions"
 *                   method: "GET"
 *                   statusCode: 200
 *       401:
 *         description: Unauthorized - Invalid or missing Bearer token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized - Invalid or expired token"
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create a candidate transition (V1 API)
 *     description: Create a new candidate stage transition. Requires Bearer token authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               candidateId:
 *                 type: string
 *                 format: uuid
 *                 description: Candidate ID
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *               fromStageId:
 *                 type: string
 *                 format: uuid
 *                 description: Source stage ID
 *                 example: "123e4567-e89b-12d3-a456-426614174002"
 *               toStageId:
 *                 type: string
 *                 format: uuid
 *                 description: Target stage ID
 *                 example: "123e4567-e89b-12d3-a456-426614174003"
 *               notes:
 *                 type: string
 *                 description: Optional transition notes
 *                 example: "Candidate passed initial screening"
 *               transitionDate:
 *                 type: string
 *                 format: date-time
 *                 description: Optional transition date (defaults to current time)
 *                 example: "2024-01-01T00:00:00.000Z"
 *             required:
 *               - candidateId
 *               - fromStageId
 *               - toStageId
 *     responses:
 *       201:
 *         description: Transition created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Transition created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     candidateId:
 *                       type: string
 *                       format: uuid
 *                     fromStageId:
 *                       type: string
 *                       format: uuid
 *                     toStageId:
 *                       type: string
 *                       format: uuid
 *                     notes:
 *                       type: string
 *                     transitionDate:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 path:
 *                   type: string
 *                 method:
 *                   type: string
 *                 statusCode:
 *                   type: integer
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid request body"
 *       401:
 *         description: Unauthorized - Invalid or missing Bearer token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized - Invalid or expired token"
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const user = token ? await verifyApiToken(token) : null;
    
    if (!user) {
      return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
    }

    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get('candidateId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const client = await getPool().connect();
    try {
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      if (candidateId) {
        whereConditions.push(`t.candidate_id = $${paramIndex++}`);
        queryParams.push(candidateId);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM "CandidateTransition" t
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Get transitions with stage names
      const transitionsQuery = `
        SELECT 
          t.id,
          t.candidate_id as "candidateId",
          t.from_stage_id as "fromStageId",
          t.to_stage_id as "toStageId",
          fs.name as "fromStageName",
          ts.name as "toStageName",
          t.notes,
          t.transition_date as "transitionDate",
          t.created_by as "createdBy",
          u.name as "createdByName",
          t.created_at as "createdAt"
        FROM "CandidateTransition" t
        LEFT JOIN "RecruitmentStage" fs ON t.from_stage_id = fs.id
        LEFT JOIN "RecruitmentStage" ts ON t.to_stage_id = ts.id
        LEFT JOIN "User" u ON t.created_by = u.id
        ${whereClause}
        ORDER BY t.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      queryParams.push(limit, offset);
      const transitionsResult = await client.query(transitionsQuery, queryParams);

      const transitions = transitionsResult.rows.map((row: any) => ({
        id: row.id,
        candidateId: row.candidateId,
        fromStageId: row.fromStageId,
        toStageId: row.toStageId,
        fromStageName: row.fromStageName,
        toStageName: row.toStageName,
        notes: row.notes,
        transitionDate: row.transitionDate,
        createdBy: row.createdBy,
        createdByName: row.createdByName,
        createdAt: row.createdAt
      }));

      const response = {
        data: transitions,
        total: total
      };

      return SimpleErrorHandler.createSuccessResponse(req, response, 200);
    } finally {
      client.release();
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Failed to fetch transitions: ${errorMessage}`));
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const user = token ? await verifyApiToken(token) : null;
    
    if (!user) {
      return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = createTransitionSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errorMsg = validationResult.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return SimpleErrorHandler.handleApiError(req, createValidationError(`Invalid request body - ${errorMsg}`));
    }

    const { candidateId, fromStageId, toStageId, notes, transitionDate } = validationResult.data;

    const client = await getPool().connect();
    try {
      // Create transition
      const insertQuery = `
        INSERT INTO "CandidateTransition" (
          id, candidate_id, from_stage_id, to_stage_id, notes, transition_date, created_by, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW()
        ) RETURNING *
      `;
      
      const transitionDateValue = transitionDate || new Date().toISOString();
      const result = await client.query(insertQuery, [
        candidateId, fromStageId, toStageId, notes, transitionDateValue, user.id
      ]);

      const newTransition = result.rows[0];

      // Update candidate status
      await client.query(
        'UPDATE "Candidate" SET "statusId" = $1 WHERE id = $2',
        [toStageId, candidateId]
      );

      const response = {
        message: 'Transition created successfully',
        data: {
          id: newTransition.id,
          candidateId: newTransition.candidate_id,
          fromStageId: newTransition.from_stage_id,
          toStageId: newTransition.to_stage_id,
          notes: newTransition.notes,
          transitionDate: newTransition.transition_date,
          createdAt: newTransition.created_at
        }
      };

      return SimpleErrorHandler.createSuccessResponse(req, response, 201);
    } finally {
      client.release();
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Failed to create transition: ${errorMessage}`));
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
}
