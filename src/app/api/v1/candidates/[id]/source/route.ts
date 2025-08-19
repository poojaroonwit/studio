import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { 
  createSuccessResponse, 
  handleApiError, 
  createUnauthorizedError, 
  createForbiddenError, 
  createValidationError, 
  createNotFoundError, 
  createInternalServerError 
} from '@/lib/apiErrorHandler';
import { logAudit } from '@/lib/auditLog';

const updateCandidateSourceSchema = z.object({
  sourceId: z.string().uuid().nullable().optional(),
  subSource: z.string().optional().nullable(),
});

/**
 * @openapi
 * /api/v1/candidates/{id}/source:
 *   get:
 *     summary: Get candidate source information
 *     description: Returns the current source information for a specific candidate.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Candidate source information
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Candidate not found
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update candidate source
 *     description: Updates the source information for a specific candidate.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sourceId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               subSource:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Candidate source updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       404:
 *         description: Candidate not found
 *       500:
 *         description: Server error
 */

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  const { id } = params;
  const client = await getPool().connect();
  
  try {
    const candidateQuery = `
      SELECT c.id, c.name, c."sourceId", c."subSource",
             cs.name as "sourceName", cs.description as "sourceDescription", cs.logo as "sourceLogo"
      FROM "Candidate" c
      LEFT JOIN "CandidateSource" cs ON c."sourceId" = cs.id
      WHERE c.id = $1;
    `;
    
    const candidateResult = await client.query(candidateQuery, [id]);
    
    if (candidateResult.rows.length === 0) {
      return handleApiError(req, createNotFoundError('Candidate not found'));
    }

    const candidate = candidateResult.rows[0];
    
    return createSuccessResponse(req, {
      candidateId: candidate.id,
      candidateName: candidate.name,
      sourceId: candidate.sourceId,
      subSource: candidate.subSource,
      source: candidate.sourceId ? {
        id: candidate.sourceId,
        name: candidate.sourceName,
        description: candidate.sourceDescription,
        logo: candidate.sourceLogo
      } : null,
    }, 200);
  } catch (error) {
    return handleApiError(req, createInternalServerError('Error fetching candidate source', { 
      originalError: (error as Error).message 
    }));
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user || (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE'))) {
    return handleApiError(req, createForbiddenError('Insufficient permissions to update candidate sources'));
  }

  const { id } = params;
  let body;
  
  try {
    body = await req.json();
  } catch {
    return handleApiError(req, createValidationError('Invalid JSON body'));
  }

  const validationResult = updateCandidateSourceSchema.safeParse(body);
  if (!validationResult.success) {
    return handleApiError(req, createValidationError('Invalid input', validationResult.error.flatten().fieldErrors));
  }

  const updateData = validationResult.data;
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // Check if candidate exists
    const existingResult = await client.query('SELECT id, name, "sourceId", "subSource" FROM "Candidate" WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return handleApiError(req, createNotFoundError('Candidate not found'));
    }

    const existingCandidate = existingResult.rows[0];
    const oldSourceId = existingCandidate.sourceId;
    const oldSubSource = existingCandidate.subSource;

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updateData.sourceId !== undefined) {
      updateFields.push(`"sourceId" = $${paramIndex++}`);
      updateValues.push(updateData.sourceId);
    }

    if (updateData.subSource !== undefined) {
      updateFields.push(`"subSource" = $${paramIndex++}`);
      updateValues.push(updateData.subSource);
    }

    // Always update the updatedAt timestamp
    updateFields.push(`"updatedAt" = NOW()`);

    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return createSuccessResponse(req, { 
        message: 'No source fields to update',
        candidateId: id,
        currentSource: {
          sourceId: existingCandidate.sourceId,
          subSource: existingCandidate.subSource
        }
      }, 200);
    }

    // Execute update
    const updateQuery = `
      UPDATE "Candidate" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, "sourceId", "subSource";
    `;
    updateValues.push(id);

    const updateResult = await client.query(updateQuery, updateValues);
    const updatedCandidate = updateResult.rows[0];

    // Fetch updated candidate with source information
    const updatedCandidateWithSource = await client.query(`
      SELECT c.id, c.name, c."sourceId", c."subSource",
             cs.name as "sourceName", cs.description as "sourceDescription", cs.logo as "sourceLogo"
      FROM "Candidate" c
      LEFT JOIN "CandidateSource" cs ON c."sourceId" = cs.id
      WHERE c.id = $1
    `, [id]);

    const candidateWithSource = updatedCandidateWithSource.rows[0];

    await client.query('COMMIT');

    // Log the change
    const changeDescription = [];
    if (updateData.sourceId !== undefined) {
      changeDescription.push(`source: ${oldSourceId || 'none'} → ${updateData.sourceId || 'none'}`);
    }
    if (updateData.subSource !== undefined) {
      changeDescription.push(`sub-source: ${oldSubSource || 'none'} → ${updateData.subSource || 'none'}`);
    }

    await logAudit('AUDIT', `Candidate '${updatedCandidate.name}' source updated by ${user.name}. Changes: ${changeDescription.join(', ')}`, 'API:V1:Candidates:UpdateSource', user.id, { 
      candidateId: id, 
      oldSourceId, 
      newSourceId: updateData.sourceId,
      oldSubSource,
      newSubSource: updateData.subSource
    });

    return createSuccessResponse(req, {
      message: 'Candidate source updated successfully',
      candidateId: candidateWithSource.id,
      candidateName: candidateWithSource.name,
      sourceId: candidateWithSource.sourceId,
      subSource: candidateWithSource.subSource,
      source: candidateWithSource.sourceId ? {
        id: candidateWithSource.sourceId,
        name: candidateWithSource.sourceName,
        description: candidateWithSource.sourceDescription,
        logo: candidateWithSource.sourceLogo
      } : null,
      changes: {
        sourceId: updateData.sourceId !== undefined ? { from: oldSourceId, to: updateData.sourceId } : undefined,
        subSource: updateData.subSource !== undefined ? { from: oldSubSource, to: updateData.subSource } : undefined
      }
    }, 200);

  } catch (error) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Failed to update candidate source (ID: ${id}) by ${user?.name || 'Unknown'}. Error: ${(error as Error).message}`, 'API:V1:Candidates:UpdateSource', user?.id, { 
      candidateId: id, 
      error: (error as Error).message, 
      requestBody: body 
    });
    return handleApiError(req, createInternalServerError('Error updating candidate source', { 
      originalError: (error as Error).message 
    }));
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
}
