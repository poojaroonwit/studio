import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { normalizePayloadTypes } from '@/lib/apiUtils';

const jobMatchSchema = z.object({
  fitScore: z.number().min(0).max(100).transform(val => Math.round(val * 100)), // Convert decimal to integer (0.7 -> 70)
  jobId: z.string().uuid(),
  matchReasons: z.array(z.string()).optional().default([]),
  // Note: positionTitle, createdAt, and updatedAt are automatically handled
  // - positionTitle: Retrieved from Position table based on jobId
  // - createdAt: Automatically set to current timestamp
  // - updatedAt: Automatically set to current timestamp
});

const jobMatchesUpdateSchema = z.object({
  job_matches: z.array(jobMatchSchema),
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
      fitScore: match.fitScore ? match.fitScore / 100 : 0, // Convert integer back to decimal
      jobId: match.jobId,
      matchReasons: match.matchReasons || [],
      positionTitle: match.positionTitle,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    }));

    return new Response(JSON.stringify({ job_matches: jobMatches }), { status: 200, headers: handleCors(req) });
  } catch (error) {
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
    body = normalizePayloadTypes(body);
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
      INSERT INTO "JobMatch" (id, "candidateId", "jobId", "fitScore", "matchReasons")
      VALUES ($1, $2, $3, $4, $5)
    `;

    const insertedMatches = [];
    
    for (const match of job_matches) {
      const matchId = uuidv4();
      await client.query(insertJobMatchQuery, [
        matchId,
        id,
        match.jobId,
        match.fitScore,
        match.matchReasons || [],
      ]);
      
      insertedMatches.push({
        id: matchId,
        fitScore: match.fitScore / 100, // Convert integer back to decimal for response
        jobId: match.jobId,
        matchReasons: match.matchReasons || [],
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
      INSERT INTO "JobMatch" (id, "candidateId", "jobId", "fitScore", "matchReasons")
      VALUES ($1, $2, $3, $4, $5)
    `;

    const insertedMatches = [];
    
    for (const match of job_matches) {
      const matchId = uuidv4();
      await client.query(insertJobMatchQuery, [
        matchId,
        id,
        match.jobId,
        match.fitScore,
        match.matchReasons || [],
      ]);
      
      insertedMatches.push({
        id: matchId,
        fitScore: match.fitScore / 100, // Convert integer back to decimal for response
        jobId: match.jobId,
        matchReasons: match.matchReasons || [],
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