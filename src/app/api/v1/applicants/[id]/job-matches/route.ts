import { NextRequest } from 'next/server';
import { getPool, getSafeDbClient, withDbTransaction } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { normalizePayloadTypes } from '@/lib/apiUtils';
import { normalizeFitScore } from '@/lib/scoreUtils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const jobMatchSchema = z.object({
  fitScore: z.number().min(0).max(1).optional(),
  jobId: z.string().uuid().optional(),
  matchReasons: z.array(z.string()).optional().default([]),
  // Note: positionTitle, createdAt, and updatedAt are automatically handled
  // - positionTitle: Retrieved from Position table based on jobId
  // - createdAt: Automatically set to current timestamp
  // - updatedAt: Automatically set to current timestamp
});

const jobMatchesUpdateSchema = z.object({
  job_matches: z.array(jobMatchSchema).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  if (user.role !== 'Admin' &&  !user.modulePermissions?.includes('JOB_MATCH_VIEW')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to view job matches' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = await params;
  const client = await getPool().connect();
  
  try {
    // First check if Applicant exists
    const applicantQuery = 'SELECT id FROM "Applicant" WHERE id = $1';
    const applicantResult = await client.query(applicantQuery, [id]);
    
    if (applicantResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Applicant not found' }), { status: 404, headers: handleCors(req) });
    }

    // Get job matches for this Applicant
    const applicantId = id;
    const jobMatchesQuery = `
      SELECT jm.*, p.title as "positionTitle"
      FROM "JobMatch" jm
      LEFT JOIN "Position" p ON jm."jobId" = p.id
      WHERE jm."applicantId" = $1
      ORDER BY jm."fitScore" DESC;
    `;
    const jobMatchesResult = await client.query(jobMatchesQuery, [applicantId]);
    
    const jobMatches = jobMatchesResult.rows.map((match: any) => ({
      id: match.id,
      fitScore: match.fitScore,
      jobId: match.jobId,
      matchReasons: match.matchReasons || [],
      positionTitle: match.positionTitle,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    }));

    return new Response(JSON.stringify({ job_matches: jobMatches }), { status: 200, headers: handleCors(req) });
  } catch (error) {
    console.error('[JOB-MATCHES] GET Error:', error);
    return new Response(JSON.stringify({ error: 'Error fetching job matches', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  if (user.role !== 'Admin' &&  !user.modulePermissions?.includes('JOB_MATCH_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job matches' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = await params;
  const applicantId = id;
  let body;
  
  try {
    body = await req.json();
    body = normalizePayloadTypes(body);
  } catch (error) {
    console.error('[JOB-MATCHES] JSON parse error:', error);
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/applicants/[id]/job-matches', details: { message: 'Invalid JSON body' } }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = jobMatchesUpdateSchema.safeParse(body);
  if (!validationResult.success) {
    console.error('[JOB-MATCHES] Validation error:', validationResult.error.flatten());
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/applicants/[id]/job-matches', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }

    const validatedData = validationResult.data;
  const job_matches = validatedData.job_matches;
  
  try {
    
    const result = await withDbTransaction(async (client) => {
      // Check if Applicant exists
      const applicantQuery = 'SELECT id FROM "Applicant" WHERE id = $1';
      const applicantResult = await client.query(applicantQuery, [applicantId]);
      
      if (applicantResult.rows.length === 0) {
        throw new Error('Applicant not found');
      }



    // Insert or update job matches
    const insertJobMatchQuery = `
      INSERT INTO "JobMatch" (id, "applicantId", "jobId", "fitScore", "matchReasons", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const updateJobMatchQuery = `
      UPDATE "JobMatch" 
      SET "fitScore" = $1, "matchReasons" = $2, "updatedAt" = NOW()
      WHERE "applicantId" = $3 AND "jobId" = $4
      RETURNING *
    `;

    const checkExistingQuery = `
      SELECT id FROM "JobMatch" WHERE "applicantId" = $1 AND "jobId" = $2
    `;

    const insertedMatches = [];
    
    for (const match of job_matches || []) { // Use || [] to handle empty array
      try {
        // Check if job match already exists
        const existingResult = await client.query(checkExistingQuery, [applicantId, match.jobId || null]);
        
        let result;
        if (existingResult.rows.length > 0) {
          // Update existing match
          result = await client.query(updateJobMatchQuery, [
            match.fitScore || null, // Already 0-1
            match.matchReasons || [],
            applicantId,
            match.jobId || null,
          ]);
        } else {
          // Insert new match
          const matchId = uuidv4();
          result = await client.query(insertJobMatchQuery, [
            matchId,
            applicantId,
            match.jobId || null,
            match.fitScore || null, // Already 0-1
            match.matchReasons || [],
          ]);

        }
        
        const processedMatch = result.rows[0];
        insertedMatches.push({
          id: processedMatch.id,
          fitScore: processedMatch.fitScore,
          jobId: processedMatch.jobId || null,
          matchReasons: processedMatch.matchReasons || [],
        });
      } catch (insertError) {
        console.error('[JOB-MATCHES] Error for match:', match, 'Error:', insertError);
        console.error('[JOB-MATCHES] Error details:', {
          message: (insertError as Error).message,
          stack: (insertError as Error).stack,
          code: (insertError as any).code
        });
        throw insertError;
      }
    }

  
      return insertedMatches;
    });

    return new Response(JSON.stringify({ 
      message: 'Job matches added/updated successfully', 
      job_matches: result 
    }), { status: 200, headers: handleCors(req) });
    
  } catch (error) {
    console.error('[JOB-MATCHES] Database error:', error);
    console.error('[JOB-MATCHES] Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      code: (error as any).code,
      detail: (error as any).detail,
      hint: (error as any).hint
    });
    
    // Handle specific known errors
    if ((error as Error).message === 'Applicant not found') {
      return new Response(JSON.stringify({ error: 'Applicant not found' }), { status: 404, headers: handleCors(req) });
    }
    
    return new Response(JSON.stringify({ 
      error: 'Error adding/updating job matches', 
      details: (error as Error).message,
      stack: (error as Error).stack,
      code: (error as any).code,
      detail: (error as any).detail,
      hint: (error as any).hint
    }), { status: 500, headers: handleCors(req) });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // console.log(`[JOB-MATCHES] PATCH request to: ${req.nextUrl.pathname}`);
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  if (user.role !== 'Admin' &&  !user.modulePermissions?.includes('JOB_MATCH_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job matches' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = await params;
  const applicantId = id;
  let body;
  
  try {
    body = await req.json();
    // console.log('[JOB-MATCHES] PATCH Request body:', JSON.stringify(body, null, 2));
    body = normalizePayloadTypes(body);
  } catch (error) {
    console.error('[JOB-MATCHES] JSON parse error:', error);
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/applicants/[id]/job-matches', details: { message: 'Invalid JSON body' } }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = jobMatchesUpdateSchema.safeParse(body);
  if (!validationResult.success) {
    console.error('[JOB-MATCHES] Validation error:', validationResult.error.flatten());
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/applicants/[id]/job-matches', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }

    const validatedData = validationResult.data;
  const job_matches = validatedData.job_matches;
  
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if Applicant exists
    const applicantQuery = 'SELECT id FROM "Applicant" WHERE id = $1';
    const applicantResult = await client.query(applicantQuery, [applicantId]);
    
    if (applicantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Applicant not found' }), { status: 404, headers: handleCors(req) });
    }

    // Update existing job matches or insert new ones
    const insertJobMatchQuery = `
      INSERT INTO "JobMatch" (id, "applicantId", "jobId", "fitScore", "matchReasons", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const updateJobMatchQuery = `
      UPDATE "JobMatch" 
      SET "fitScore" = $1, "matchReasons" = $2, "updatedAt" = NOW()
      WHERE "applicantId" = $3 AND "jobId" = $4
      RETURNING *
    `;

    const checkExistingQuery = `
      SELECT id FROM "JobMatch" WHERE "applicantId" = $1 AND "jobId" = $2
    `;

    const updatedMatches = [];
    
    for (const match of job_matches || []) { // Use || [] to handle empty array
      try {
        // Check if job match already exists
        const existingResult = await client.query(checkExistingQuery, [applicantId, match.jobId || null]);
        
        let result;
        if (existingResult.rows.length > 0) {
          // Update existing match
          result = await client.query(updateJobMatchQuery, [
            match.fitScore || null, // Already 0-1
            match.matchReasons || [],
            applicantId,
            match.jobId || null,
          ]);
        } else {
          // Insert new match
          const matchId = uuidv4();
          result = await client.query(insertJobMatchQuery, [
            matchId,
            applicantId,
            match.jobId || null,
            match.fitScore || null, // Already 0-1
            match.matchReasons || [],
          ]);
        }
        
        const processedMatch = result.rows[0];
        updatedMatches.push({
          id: processedMatch.id,
          fitScore: processedMatch.fitScore,
          jobId: processedMatch.jobId || null,
          matchReasons: processedMatch.matchReasons || [],
        });
      } catch (upsertError) {
        console.error('[JOB-MATCHES] PATCH Error for match:', match, 'Error:', upsertError);
        throw upsertError;
      }
    }

    await client.query('COMMIT');
    
    return new Response(JSON.stringify({ 
      message: 'Job matches updated successfully', 
      job_matches: updatedMatches 
    }), { status: 200, headers: handleCors(req) });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[JOB-MATCHES] PATCH Database error:', error);
    return new Response(JSON.stringify({ 
      error: 'Error updating job matches', 
      details: (error as Error).message,
      stack: (error as Error).stack 
    }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  if (user.role !== 'Admin' &&  !user.modulePermissions?.includes('JOB_MATCH_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job matches' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = await params;
  const applicantId = id;
  let body;
  
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/applicants/[id]/job-matches', details: { message: 'Invalid JSON body' } }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = jobMatchesUpdateSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/applicants/[id]/job-matches', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }

    const validatedData = validationResult.data;
  const job_matches = validatedData.job_matches;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if Applicant exists
    const applicantQuery = 'SELECT id FROM "Applicant" WHERE id = $1';
    const applicantResult = await client.query(applicantQuery, [applicantId]);
    
    if (applicantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Applicant not found' }), { status: 404, headers: handleCors(req) });
    }

    // Delete existing job matches for this Applicant
    await client.query('DELETE FROM "JobMatch" WHERE "applicantId" = $1', [applicantId]);

    // Insert new job matches
    const insertJobMatchQuery = `
      INSERT INTO "JobMatch" (id, "applicantId", "jobId", "fitScore", "matchReasons", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const insertedMatches = [];
    
    for (const match of job_matches || []) { // Use || [] to handle empty array
      const matchId = uuidv4();
      const result = await client.query(insertJobMatchQuery, [
        matchId,
        applicantId,
        match.jobId || null,
        match.fitScore || null, // Already 0-1
        match.matchReasons || [],
      ]);
      
      const processedMatch = result.rows[0];
      insertedMatches.push({
        id: processedMatch.id,
        fitScore: processedMatch.fitScore,
        jobId: processedMatch.jobId || null,
        matchReasons: processedMatch.matchReasons || [],
      });
    }

    await client.query('COMMIT');
    
    return new Response(JSON.stringify({ 
      message: 'Job matches updated successfully', 
      job_matches: insertedMatches 
    }), { status: 200, headers: handleCors(req) });
    
  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error updating job matches', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  if (user.role !== 'Admin' &&  !user.modulePermissions?.includes('JOB_MATCH_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job matches' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = await params;
  const applicantId = id;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if Applicant exists
    const applicantQuery = 'SELECT id FROM "Applicant" WHERE id = $1';
    const applicantResult = await client.query(applicantQuery, [applicantId]);
    
    if (applicantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Applicant not found' }), { status: 404, headers: handleCors(req) });
    }

    // Delete all job matches for this Applicant
    const deleteResult = await client.query('DELETE FROM "JobMatch" WHERE "applicantId" = $1 RETURNING id', [applicantId]);
    
    await client.query('COMMIT');
    
    return new Response(JSON.stringify({ 
      message: 'All job matches deleted successfully',
      deleted_count: deleteResult.rowCount
    }), { status: 200, headers: handleCors(req) });
    
  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error deleting job matches', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 