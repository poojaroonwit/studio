import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { handleCors } from '@/lib/cors';

const updateCandidateSchema = z.object({
  // Legacy fields for backward compatibility
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  positionId: z.string().uuid().nullable().optional(),
  recruiterId: z.string().uuid().nullable().optional(),
  fitScore: z.number().min(0).max(100).optional(),
  status: z.string().min(1).optional(),
  parsedData: z.record(z.any()).optional().nullable(),
  custom_attributes: z.record(z.any()).optional().nullable(),
  resumePath: z.string().optional().nullable(),
  transitionNotes: z.string().optional().nullable(),
  
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
  }).optional(),
  
  // Job matches and applied job updates
  job_matches: z.array(z.object({
    fit_score: z.number().min(0).max(100),
    job_id: z.string().uuid(),
    match_reasons: z.array(z.string()).optional().default([]),
  })).optional(),
  
  job_applied: z.object({
    fit_score: z.number().min(0).max(100),
    job_id: z.string().uuid(),
    justification: z.array(z.string()).optional().default([]),
  }).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
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
      return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404, headers: handleCors(req) });
    }
    const candidate = candidateResult.rows[0];
    // Get job matches for this candidate
    const jobMatchesQuery = `
      SELECT jm.*, p.title as "positionTitle"
      FROM "JobMatch" jm
      LEFT JOIN "Position" p ON jm."jobId" = p.id
      WHERE jm."candidateId" = $1
      ORDER BY jm."fit_score" DESC;
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
    return new Response(JSON.stringify({
      ...candidate,
      custom_attributes: candidate.customAttributes || {},
      position: candidate.positionId ? {
        title: candidate.positionTitle,
        department: candidate.positionDepartment
      } : null,
      recruiter: candidate.recruiterId ? { name: candidate.recruiterName } : null,
      jobMatches: jobMatchesResult.rows,
      resumeHistory: resumeHistoryResult.rows,
    }), { status: 200, headers: handleCors(req) });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error fetching candidate', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user || (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE'))) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), { status: 403, headers: handleCors(req) });
  }
  const { id } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: handleCors(req) });
  }
  const validationResult = updateCandidateSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }
  
  const updateData = validationResult.data;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    const existingResult = await client.query('SELECT * FROM "Candidate" WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404, headers: handleCors(req) });
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
    
    if (updateData.fitScore !== undefined) {
      updateFields.push(`"fitScore" = $${paramIndex++}`);
      updateValues.push(updateData.fitScore);
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
    }
    
    if (updateData.parsedData) {
      newParsedData = { ...newParsedData, ...updateData.parsedData };
      hasParsedDataChanges = true;
    }
    
    if (hasParsedDataChanges) {
      updateFields.push(`"parsedData" = $${paramIndex++}`);
      updateValues.push(newParsedData);
    }
    
    // Always update the updatedAt timestamp
    updateFields.push(`"updatedAt" = NOW()`);
    
    // If no fields to update, return early
    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ 
        message: 'No fields to update',
        candidate: {
          ...existingCandidate,
          custom_attributes: existingCandidate.customAttributes || {},
        }
      }), { status: 200, headers: handleCors(req) });
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
          match.job_id,
          match.fit_score,
          match.match_reasons || [],
        ]);
      }
    }
    
    // Create transition record if status changed
    if (updateData.status !== undefined && oldStatus !== updateData.status) {
      const insertTransitionQuery = `
        INSERT INTO "TransitionRecord" (id, "candidateId", "positionId", stage, notes, "actingUserId", date)
        VALUES ($1, $2, $3, $4, $5, $6, NOW());
      `;
      await client.query(insertTransitionQuery, [
        uuidv4(), id, updateData.positionId || existingCandidate.positionId, updateData.status, 'Status changed via API', user.id
      ]);
    }
    
    await client.query('COMMIT');
    const updatedCandidate = updateResult.rows[0];
    
    return new Response(JSON.stringify({
      message: 'Candidate updated successfully',
      candidate: {
        ...updatedCandidate,
        custom_attributes: updatedCandidate.customAttributes || {},
      },
      updated_fields: Object.keys(updateData).filter(key => updateData[key as keyof typeof updateData] !== undefined)
    }), { status: 200, headers: handleCors(req) });
    
  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error updating candidate', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user || (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE'))) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), { status: 403, headers: handleCors(req) });
  }
  const { id } = params;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const existingResult = await client.query('SELECT * FROM "Candidate" WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404, headers: handleCors(req) });
    }
    await client.query('DELETE FROM "Candidate" WHERE id = $1', [id]);
    await client.query('COMMIT');
    return new Response(JSON.stringify({ message: 'Candidate deleted successfully' }), { status: 200, headers: handleCors(req) });
  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error deleting candidate', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 