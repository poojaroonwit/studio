import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { normalizePayloadTypes } from '@/lib/apiUtils';

const jobMatchSchema = z.object({
  fitScore: z.number().min(0).max(100),
  jobId: z.string().uuid(),
  matchReasons: z.array(z.string()).optional().default([]),
  // Note: position_title, created_at, and updated_at are automatically handled
  // - position_title: Retrieved from Position table based on jobId
  // - created_at: Automatically set to current timestamp
  // - updated_at: Automatically set to current timestamp
});

const jobMatchesUpdateSchema = z.object({
  job_matches: z.array(jobMatchSchema),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`[JobMatches API] GET request for candidate ID: ${params.id}`);
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  console.log(`[JobMatches API] Auth header present: ${!!authHeader}, Token present: ${!!token}`);
  
  const user = token ? await verifyApiToken(token) : null;
  console.log(`[JobMatches API] User authenticated: ${!!user}, User role: ${user?.role}`);
  
  if (!user) {
    console.log(`[JobMatches API] Unauthorized access attempt`);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  const { id } = params;
  console.log(`[JobMatches API] Processing request for candidate ID: ${id}`);
  
  const client = await getPool().connect();
  
  try {
    // First check if candidate exists
    const candidateQuery = 'SELECT id FROM "Candidate" WHERE id = $1';
    const candidateResult = await client.query(candidateQuery, [id]);
    console.log(`[JobMatches API] Candidate query result: ${candidateResult.rows.length} rows found`);
    
    if (candidateResult.rows.length === 0) {
      console.log(`[JobMatches API] Candidate not found: ${id}`);
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
    console.log(`[JobMatches API] Executing job matches query for candidate: ${id}`);
    const jobMatchesResult = await client.query(jobMatchesQuery, [id]);
    console.log(`[JobMatches API] Job matches query result: ${jobMatchesResult.rows.length} matches found`);
    
    const jobMatches = jobMatchesResult.rows.map(match => ({
      id: match.id,
      fitScore: match.fitScore,
      jobId: match.jobId,
      matchReasons: match.matchReasons || [],
      positionTitle: match.positionTitle,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    }));

    console.log(`[JobMatches API] Returning ${jobMatches.length} job matches`);
    return new Response(JSON.stringify({ jobMatches }), { status: 200, headers: handleCors(req) });
  } catch (error) {
    console.error(`[JobMatches API] Error fetching job matches:`, error);
    return new Response(JSON.stringify({ error: 'Error fetching job matches', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = jobMatchesUpdateSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
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
        fitScore: match.fitScore,
        jobId: match.jobId,
        matchReasons: match.matchReasons || [],
      });
    }

    await client.query('COMMIT');
    
    return new Response(JSON.stringify({ 
      message: 'Job matches updated successfully', 
      jobMatches: insertedMatches 
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
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = jobMatchesUpdateSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
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
        fitScore: match.fitScore,
        jobId: match.jobId,
        matchReasons: match.matchReasons || [],
      });
    }

    await client.query('COMMIT');
    
    return new Response(JSON.stringify({ 
      message: 'Job matches updated successfully', 
      jobMatches: insertedMatches 
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
      deletedCount: deleteResult.rowCount
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