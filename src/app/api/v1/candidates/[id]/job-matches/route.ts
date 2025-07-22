import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { normalizePayloadTypes } from '@/lib/apiUtils';
import { normalizeFitScore } from '@/lib/scoreUtils';

const jobMatchSchema = z.object({
  fitScore: z.number().min(0).max(100).optional().transform(val => {
    if (val === undefined || val === null) return null;
    if (val >= 0 && val <= 100) return Math.round(val);
    if (val > 0 && val < 1) return Math.round(val * 100);
    return Math.max(0, Math.min(100, Math.round(val)));
  }), // Convert decimal to integer if needed (0.7 -> 70, 70 -> 70)
  jobId: z.string().uuid().optional(), // Make optional to match database nullable field
  matchReasons: z.array(z.string()).optional().default([]),
  // Note: positionTitle, createdAt, and updatedAt are automatically handled
  // - positionTitle: Retrieved from Position table based on jobId
  // - createdAt: Automatically set to current timestamp
  // - updatedAt: Automatically set to current timestamp
});

const jobMatchesUpdateSchema = z.object({
  job_matches: z.array(jobMatchSchema).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`[JOB-MATCHES] GET request to: ${req.nextUrl.pathname}`);
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  const { id } = params;
  const client = await getPool().connect();
  
  try {
    // First check if candidate exists
    const candidateQuery = 'SELECT id FROM "Candidate" WHERE id = $1';
    const candidateResult = await client.query(candidateQuery, [id]);
    
    if (candidateResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404, headers: handleCors(req) });
    }

    // Get job matches for this candidate
    const jobMatchesQuery = `
      SELECT jm.*, p.title as "positionTitle"
      FROM "JobMatch" jm
      LEFT JOIN "Position" p ON jm."jobId" = p.id
      WHERE jm."candidateId" = $1
      ORDER BY jm."fitScore" DESC;
    `;
    const jobMatchesResult = await client.query(jobMatchesQuery, [id]);
    
    const jobMatches = jobMatchesResult.rows.map(match => ({
      id: match.id,
      fitScore: normalizeFitScore(match.fitScore), // Keep as integer (0-100) for consistency with scoreUtils
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`[JOB-MATCHES] POST request to: ${req.nextUrl.pathname}`);
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job matches' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = params;
  let body;
  
  try {
    body = await req.json();
    console.log('[JOB-MATCHES] Request body:', JSON.stringify(body, null, 2));
    body = normalizePayloadTypes(body);
  } catch (error) {
    console.error('[JOB-MATCHES] JSON parse error:', error);
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/candidates/[id]/job-matches', details: { message: 'Invalid JSON body' } }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = jobMatchesUpdateSchema.safeParse(body);
  if (!validationResult.success) {
    console.error('[JOB-MATCHES] Validation error:', validationResult.error.flatten());
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/candidates/[id]/job-matches', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }

  const { job_matches } = validationResult.data;
  console.log('[JOB-MATCHES] Validated job_matches:', JSON.stringify(job_matches, null, 2));
  
  let client;
  try {
    console.log('[JOB-MATCHES] Getting database connection...');
    client = await getPool().connect();
    console.log('[JOB-MATCHES] Database connection established');
  } catch (dbError) {
    console.error('[JOB-MATCHES] Database connection error:', dbError);
    return new Response(JSON.stringify({ 
      error: 'Database connection failed', 
      details: (dbError as Error).message 
    }), { status: 500, headers: handleCors(req) });
  }
  
  try {
    console.log('[JOB-MATCHES] Starting transaction...');
    await client.query('BEGIN');
    console.log('[JOB-MATCHES] Transaction started');
    
    // Check if candidate exists
    console.log('[JOB-MATCHES] Checking if candidate exists:', id);
    const candidateQuery = 'SELECT id FROM "Candidate" WHERE id = $1';
    const candidateResult = await client.query(candidateQuery, [id]);
    console.log('[JOB-MATCHES] Candidate query result:', candidateResult.rows.length, 'rows');
    
    if (candidateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404, headers: handleCors(req) });
    }

    // Check if JobMatch table exists
    console.log('[JOB-MATCHES] Checking JobMatch table structure...');
    try {
      const tableCheckQuery = `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'JobMatch' 
        ORDER BY ordinal_position
      `;
      const tableResult = await client.query(tableCheckQuery);
      console.log('[JOB-MATCHES] JobMatch table columns:', tableResult.rows);
    } catch (tableError) {
      console.error('[JOB-MATCHES] Table check error:', tableError);
    }

    // Insert or update job matches
    const insertJobMatchQuery = `
      INSERT INTO "JobMatch" (id, "candidateId", "jobId", "fitScore", "matchReasons", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const updateJobMatchQuery = `
      UPDATE "JobMatch" 
      SET "fitScore" = $1, "matchReasons" = $2, "updatedAt" = NOW()
      WHERE "candidateId" = $3 AND "jobId" = $4
      RETURNING *
    `;

    const checkExistingQuery = `
      SELECT id FROM "JobMatch" WHERE "candidateId" = $1 AND "jobId" = $2
    `;

    const insertedMatches = [];
    
    for (const match of job_matches || []) { // Use || [] to handle empty array
      console.log('[JOB-MATCHES] Processing match:', {
        candidateId: id,
        jobId: match.jobId || null,
        fitScore: match.fitScore || null,
        matchReasons: match.matchReasons || []
      });
      
      try {
        // Check if job match already exists
        console.log('[JOB-MATCHES] Checking for existing match...');
        const existingResult = await client.query(checkExistingQuery, [id, match.jobId || null]);
        console.log('[JOB-MATCHES] Existing match check result:', existingResult.rows.length, 'rows');
        
        let result;
        if (existingResult.rows.length > 0) {
          // Update existing match
          console.log('[JOB-MATCHES] Updating existing match:', existingResult.rows[0].id);
          result = await client.query(updateJobMatchQuery, [
            match.fitScore || null,
            match.matchReasons || [],
            id,
            match.jobId || null,
          ]);
          console.log('[JOB-MATCHES] Update result:', result.rows[0]);
        } else {
          // Insert new match
          const matchId = uuidv4();
          console.log('[JOB-MATCHES] Inserting new match:', matchId);
          result = await client.query(insertJobMatchQuery, [
            matchId,
            id,
            match.jobId || null,
            match.fitScore || null,
            match.matchReasons || [],
          ]);
          console.log('[JOB-MATCHES] Insert result:', result.rows[0]);
        }
        
        const processedMatch = result.rows[0];
        insertedMatches.push({
          id: processedMatch.id,
          fitScore: normalizeFitScore(processedMatch.fitScore), // Keep as integer (0-100) for consistency with scoreUtils
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

    console.log('[JOB-MATCHES] Committing transaction...');
    await client.query('COMMIT');
    console.log('[JOB-MATCHES] Successfully processed', insertedMatches.length, 'job matches');
    
    return new Response(JSON.stringify({ 
      message: 'Job matches added/updated successfully', 
      job_matches: insertedMatches 
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
    
    if (client) {
      try {
        await client.query('ROLLBACK');
        console.log('[JOB-MATCHES] Transaction rolled back');
      } catch (rollbackError) {
        console.error('[JOB-MATCHES] Rollback error:', rollbackError);
      }
    }
    
    return new Response(JSON.stringify({ 
      error: 'Error adding/updating job matches', 
      details: (error as Error).message,
      stack: (error as Error).stack,
      code: (error as any).code,
      detail: (error as any).detail,
      hint: (error as any).hint
    }), { status: 500, headers: handleCors(req) });
  } finally {
    if (client) {
      client.release();
      console.log('[JOB-MATCHES] Database connection released');
    }
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`[JOB-MATCHES] PATCH request to: ${req.nextUrl.pathname}`);
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job matches' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = params;
  let body;
  
  try {
    body = await req.json();
    console.log('[JOB-MATCHES] PATCH Request body:', JSON.stringify(body, null, 2));
    body = normalizePayloadTypes(body);
  } catch (error) {
    console.error('[JOB-MATCHES] JSON parse error:', error);
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/candidates/[id]/job-matches', details: { message: 'Invalid JSON body' } }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = jobMatchesUpdateSchema.safeParse(body);
  if (!validationResult.success) {
    console.error('[JOB-MATCHES] Validation error:', validationResult.error.flatten());
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/candidates/[id]/job-matches', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }

  const { job_matches } = validationResult.data;
  console.log('[JOB-MATCHES] PATCH Validated job_matches:', JSON.stringify(job_matches, null, 2));
  
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if candidate exists
    const candidateQuery = 'SELECT id FROM "Candidate" WHERE id = $1';
    const candidateResult = await client.query(candidateQuery, [id]);
    
    if (candidateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404, headers: handleCors(req) });
    }

    // Update existing job matches or insert new ones
    const insertJobMatchQuery = `
      INSERT INTO "JobMatch" (id, "candidateId", "jobId", "fitScore", "matchReasons", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const updateJobMatchQuery = `
      UPDATE "JobMatch" 
      SET "fitScore" = $1, "matchReasons" = $2, "updatedAt" = NOW()
      WHERE "candidateId" = $3 AND "jobId" = $4
      RETURNING *
    `;

    const checkExistingQuery = `
      SELECT id FROM "JobMatch" WHERE "candidateId" = $1 AND "jobId" = $2
    `;

    const updatedMatches = [];
    
    for (const match of job_matches || []) { // Use || [] to handle empty array
      console.log('[JOB-MATCHES] PATCH Processing match:', {
        candidateId: id,
        jobId: match.jobId || null,
        fitScore: match.fitScore || null,
        matchReasons: match.matchReasons || []
      });
      
      try {
        // Check if job match already exists
        const existingResult = await client.query(checkExistingQuery, [id, match.jobId || null]);
        
        let result;
        if (existingResult.rows.length > 0) {
          // Update existing match
          console.log('[JOB-MATCHES] PATCH Updating existing match:', existingResult.rows[0].id);
          result = await client.query(updateJobMatchQuery, [
            match.fitScore || null,
            match.matchReasons || [],
            id,
            match.jobId || null,
          ]);
        } else {
          // Insert new match
          const matchId = uuidv4();
          console.log('[JOB-MATCHES] PATCH Inserting new match:', matchId);
          result = await client.query(insertJobMatchQuery, [
            matchId,
            id,
            match.jobId || null,
            match.fitScore || null,
            match.matchReasons || [],
          ]);
        }
        
        const processedMatch = result.rows[0];
        updatedMatches.push({
          id: processedMatch.id,
          fitScore: normalizeFitScore(processedMatch.fitScore), // Keep as integer (0-100) for consistency with scoreUtils
          jobId: processedMatch.jobId || null,
          matchReasons: processedMatch.matchReasons || [],
        });
      } catch (upsertError) {
        console.error('[JOB-MATCHES] PATCH Error for match:', match, 'Error:', upsertError);
        throw upsertError;
      }
    }

    await client.query('COMMIT');
    console.log('[JOB-MATCHES] PATCH Successfully processed', updatedMatches.length, 'job matches');
    
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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job matches' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = params;
  let body;
  
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/candidates/[id]/job-matches', details: { message: 'Invalid JSON body' } }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = jobMatchesUpdateSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/candidates/[id]/job-matches', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }

  const { job_matches } = validationResult.data;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if candidate exists
    const candidateQuery = 'SELECT id FROM "Candidate" WHERE id = $1';
    const candidateResult = await client.query(candidateQuery, [id]);
    
    if (candidateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404, headers: handleCors(req) });
    }

    // Delete existing job matches for this candidate
    await client.query('DELETE FROM "JobMatch" WHERE "candidateId" = $1', [id]);

    // Insert new job matches
    const insertJobMatchQuery = `
      INSERT INTO "JobMatch" (id, "candidateId", "jobId", "fitScore", "matchReasons", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const insertedMatches = [];
    
    for (const match of job_matches || []) { // Use || [] to handle empty array
      const matchId = uuidv4();
      const result = await client.query(insertJobMatchQuery, [
        matchId,
        id,
        match.jobId || null,
        match.fitScore || null,
        match.matchReasons || [],
      ]);
      
      const processedMatch = result.rows[0];
      insertedMatches.push({
        id: processedMatch.id,
        fitScore: normalizeFitScore(processedMatch.fitScore), // Keep as integer (0-100) for consistency with scoreUtils
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job matches' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = params;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if candidate exists
    const candidateQuery = 'SELECT id FROM "Candidate" WHERE id = $1';
    const candidateResult = await client.query(candidateQuery, [id]);
    
    if (candidateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404, headers: handleCors(req) });
    }

    // Delete all job matches for this candidate
    const deleteResult = await client.query('DELETE FROM "JobMatch" WHERE "candidateId" = $1 RETURNING id', [id]);
    
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