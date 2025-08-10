import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
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
import { normalizeFitScore } from '@/lib/scoreUtils';
import { logAudit } from '@/lib/auditLog';
import { syncRecruiterForCandidate } from '@/lib/recruiterSync';

const updateCandidateSchema = z.object({
  // Legacy fields for backward compatibility
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  positionId: z.string().uuid().nullable().optional(),
  recruiterId: z.string().uuid().nullable().optional(),
  fitScore: z.number().min(0).max(1).optional(),
  status: z.string().min(1).optional(),
  parsedData: z.record(z.any()).optional().nullable(),
  custom_attributes: z.record(z.any()).optional().nullable(),
  resumePath: z.string().optional().nullable(),
  transitionNotes: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  
  // New candidate_info format
  candidate_info: z.object({
    personal_info: z.object({
      title_honorific: z.string().optional().nullable(),
      firstname: z.string().min(1).optional(),
      lastname: z.string().min(1).optional(),
      nickname: z.string().optional().nullable(),
      location: z.string().optional().nullable(),
      introduction_aboutme: z.string().optional().nullable(),
    }).optional(),
    contact_info: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional().nullable(),
    }).optional(),
    education: z.array(z.any()).optional(),
    experience: z.array(z.any()).optional(),
    skills: z.array(z.any()).optional(),
    job_suitable: z.array(z.any()).optional(),
    cv_language: z.string().optional().nullable(),
    status: z.string().optional(),
    fitScore: z.number().optional(), // <-- Added this line
  }).optional(),
  
  // Job matches and applied job updates
  job_matches: z.array(z.object({
    fitScore: z.number().min(0).max(1),
    jobId: z.string().uuid(),
    matchReasons: z.array(z.string()).optional().default([]),
  })).optional(),
  
  job_applied: z.object({
    fitScore: z.number().min(0).max(1),
    jobId: z.string().uuid(),
    justification: z.array(z.string()).optional().default([]),
  }).optional(),
});

export { updateCandidateSchema };

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
      SELECT c.*, p.title as "positionTitle", p.department as "positionDepartment", r.name as "recruiterName"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" r ON c."recruiterId" = r.id
      WHERE c.id = $1;
    `;
    const candidateResult = await client.query(candidateQuery, [id]);
    if (candidateResult.rows.length === 0) {
      return handleApiError(req, createNotFoundError('Candidate not found'));
    }
    const candidate = candidateResult.rows[0];
    // Get job matches for this candidate
    const jobMatchesQuery = `
      SELECT jm.*, p.title as "positionTitle"
      FROM "JobMatch" jm
      LEFT JOIN "Position" p ON jm."jobId" = p.id
      WHERE jm."candidateId" = $1
      ORDER BY jm."fitScore" DESC;
    `;
    const jobMatchesResult = await client.query(jobMatchesQuery, [id]);
    // Get resume history for this candidate
    const resumeHistoryQuery = `
      SELECT rh.*, u.name as "uploadedByUserName"
      FROM "ResumeHistory" rh
      LEFT JOIN "User" u ON rh."uploaded_by_user_id" = u.id
      WHERE rh."candidateId" = $1
      ORDER BY rh."uploadedAt" DESC;
    `;
    const resumeHistoryResult = await client.query(resumeHistoryQuery, [id]);
    return createSuccessResponse(req, {
      ...candidate,
      custom_attributes: candidate.customAttributes || {},
      position: candidate.positionId ? {
        title: candidate.positionTitle,
        department: candidate.positionDepartment
      } : null,
      recruiter: candidate.recruiterId ? { name: candidate.recruiterName } : null,
      jobMatches: jobMatchesResult.rows.map(match => ({
        ...match,
        fitScore: match.fitScore,
      })),
      resumeHistory: resumeHistoryResult.rows,
    }, 200);
  } catch (error) {
    return handleApiError(req, createInternalServerError('Error fetching candidate', { 
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
    return handleApiError(req, createForbiddenError('Insufficient permissions to update candidates'));
  }
  const { id } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return handleApiError(req, createValidationError('Invalid JSON body'));
  }
  const validationResult = updateCandidateSchema.safeParse(body);
  if (!validationResult.success) {
    return handleApiError(req, createValidationError('Invalid input', validationResult.error.flatten().fieldErrors));
  }
  
  const updateData = validationResult.data;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    const existingResult = await client.query('SELECT * FROM "Candidate" WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return handleApiError(req, createNotFoundError('Candidate not found'));
    }
    
    const existingCandidate = existingResult.rows[0];
    const oldStatus = existingCandidate.status;
    const existingParsedData = existingCandidate.parsedData || {};
    
    // Build dynamic update query based on provided fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    // Handle legacy fields
    if (updateData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(updateData.name);
    }
    
    if (updateData.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(updateData.email);
    }
    
    if (updateData.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      updateValues.push(updateData.phone);
    }
    
    if (updateData.positionId !== undefined) {
      updateFields.push(`"positionId" = $${paramIndex++}`);
      updateValues.push(updateData.positionId);
    }
    
    if (updateData.recruiterId !== undefined) {
      updateFields.push(`"recruiterId" = $${paramIndex++}`);
      updateValues.push(updateData.recruiterId);
    }
    
    // Extract fitScore from top-level fitScore, or fallback to job_applied.fitScore for backward compatibility
    let fitScoreToUpdate: number | undefined = undefined;
    if (typeof updateData.fitScore === 'number') {
      fitScoreToUpdate = updateData.fitScore;
    } else if (updateData.job_applied && typeof updateData.job_applied.fitScore === 'number') {
      fitScoreToUpdate = updateData.job_applied.fitScore;
    }
    if (typeof fitScoreToUpdate === 'number') {
      updateFields.push(`"fitScore" = $${paramIndex++}`);
      updateValues.push(fitScoreToUpdate);
    }
    
    if (updateData.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(updateData.status);
    }
    
    if (updateData.custom_attributes !== undefined) {
      updateFields.push(`"customAttributes" = $${paramIndex++}`);
      updateValues.push(updateData.custom_attributes);
    }
    
    if (updateData.resumePath !== undefined) {
      updateFields.push(`"resumePath" = $${paramIndex++}`);
      updateValues.push(updateData.resumePath);
    }
    
    if (updateData.avatarUrl !== undefined) {
      updateFields.push(`"avatarUrl" = $${paramIndex++}`);
      updateValues.push(updateData.avatarUrl);
    }
    
    // Handle new candidate_info format
    let newParsedData = { ...existingParsedData };
    let hasParsedDataChanges = false;
    
    if (updateData.candidate_info) {
      newParsedData.candidate_info = {
        ...(newParsedData.candidate_info || {}),
        ...updateData.candidate_info
      };
      hasParsedDataChanges = true;
    }
    
    if (updateData.job_matches) {
      newParsedData.job_matches = updateData.job_matches;
      hasParsedDataChanges = true;
    }
    
    if (updateData.job_applied) {
      newParsedData.job_applied = updateData.job_applied;
      hasParsedDataChanges = true;
      // Patch: Sync top-level fields with job_applied
      if (updateData.job_applied.fitScore !== undefined) {
        updateFields.push(`"fitScore" = $${paramIndex++}`);
        updateValues.push(updateData.job_applied.fitScore);
      }
      if (updateData.job_applied.justification !== undefined) {
        // Store as a string (join array with newlines) or as JSON if preferred
        updateFields.push(`"assignmentJustification" = $${paramIndex++}`);
        updateValues.push(Array.isArray(updateData.job_applied.justification) ? updateData.job_applied.justification.join('\n') : updateData.job_applied.justification);
      }
    }
    
    if (updateData.parsedData) {
      newParsedData = { ...newParsedData, ...updateData.parsedData };
      hasParsedDataChanges = true;
    }
    
    if (hasParsedDataChanges) {
      updateFields.push(`"parsedData" = $${paramIndex++}`);
      updateValues.push(newParsedData);
    }
    
    // If no fields to update, return early
    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return createSuccessResponse(req, { 
        message: 'No fields to update',
        candidate: {
          ...existingCandidate,
          custom_attributes: existingCandidate.customAttributes || {},
        }
      }, 200);
    }
    
    // Build and execute the update query
    const updateQuery = `
      UPDATE "Candidate" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;
    updateValues.push(id);
    
    const updateResult = await client.query(updateQuery, updateValues);
    
    // Update job matches in JobMatch table if provided
    if (updateData.job_matches) {
      // Delete existing job matches
      await client.query('DELETE FROM "JobMatch" WHERE "candidateId" = $1', [id]);
      
      // Insert new job matches
      const insertJobMatchQuery = `
        INSERT INTO "JobMatch" (id, "candidateId", "jobId", "fitScore", "matchReasons", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `;
      
      for (const match of updateData.job_matches) {
        const matchId = uuidv4();
        await client.query(insertJobMatchQuery, [
          matchId,
          id,
          match.jobId,
          match.fitScore, // Already 0-1
          match.matchReasons || [],
        ]);
      }
    }
    
    // Create transition record if status changed
    if (updateData.status !== undefined && oldStatus !== updateData.status) {
      const insertTransitionQuery = `
        INSERT INTO "TransitionRecord" (id, "candidateId", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW());
      `;
      await client.query(insertTransitionQuery, [
        uuidv4(), id, updateData.positionId || existingCandidate.positionId, updateData.status, 'Status changed via API', user.id
      ]);
    }
    
    await client.query('COMMIT');
    const updatedCandidate = updateResult.rows[0];
    
    // Auto-assign recruiter if position changed and candidate has no recruiter
    const oldPositionId = existingCandidate.positionId;
    const newPositionId = updateData.positionId !== undefined ? updateData.positionId : oldPositionId;
    const hasPositionChanged = updateData.positionId !== undefined && updateData.positionId !== oldPositionId;
    const hasNoRecruiter = !updatedCandidate.recruiterId;
    
    if (hasPositionChanged && hasNoRecruiter && newPositionId) {
      try {
        const syncSuccess = await syncRecruiterForCandidate(
          id,
          newPositionId,
          user.id,
          user.name || user.email || 'System'
        );
        if (syncSuccess) {
          console.log(`Recruiter auto-assigned to candidate ${id} from position ${newPositionId}`);
        }
      } catch (syncError) {
        console.error('Failed to auto-assign recruiter after position update:', syncError);
        // Don't fail the candidate update if sync fails
      }
    }
    
    await logAudit('AUDIT', `Candidate '${updatedCandidate.name}' updated by ${user.name}.`, 'API:V1:Candidates:Update', user.id, { candidateId: id, updatedFields: updateData });
    return createSuccessResponse(req, {
      message: 'Candidate updated successfully',
      candidate: {
        ...updatedCandidate,
        custom_attributes: updatedCandidate.customAttributes || {},
      },
      updated_fields: Object.keys(updateData).filter(key => updateData[key as keyof typeof updateData] !== undefined)
    }, 200);
    
  } catch (error) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Failed to update candidate (ID: ${id}) by ${user?.name || 'Unknown'}. Error: ${(error as Error).message}`, 'API:V1:Candidates:Update', user?.id, { candidateId: id, error: (error as Error).message, ...body });
    return handleApiError(req, createInternalServerError('Error updating candidate', { 
      originalError: (error as Error).message 
    }));
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user || (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE'))) {
    return handleApiError(req, createForbiddenError('Insufficient permissions to delete candidates'));
  }
  const { id } = params;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const existingResult = await client.query('SELECT * FROM "Candidate" WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return handleApiError(req, createNotFoundError('Candidate not found'));
    }
    await client.query('DELETE FROM "Candidate" WHERE id = $1', [id]);
    await client.query('COMMIT');
    await logAudit('AUDIT', `Candidate '${existingResult.rows[0].name}' deleted by ${user.name}.`, 'API:V1:Candidates:Delete', user.id, { candidateId: id });
    return createSuccessResponse(req, { message: 'Candidate deleted successfully' }, 200);
  } catch (error) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Failed to delete candidate (ID: ${id}) by ${user?.name || 'Unknown'}. Error: ${(error as Error).message}`, 'API:V1:Candidates:Delete', user?.id, { candidateId: id, error: (error as Error).message });
    return handleApiError(req, createInternalServerError('Error deleting candidate', { 
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