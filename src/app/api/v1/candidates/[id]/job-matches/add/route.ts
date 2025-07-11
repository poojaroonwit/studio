import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';

const addJobMatchSchema = z.object({
  fit_score: z.number().min(0).max(100),
  job_id: z.string().uuid(),
  match_reasons: z.array(z.string()).optional().default([]),
});

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
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = addJobMatchSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }

  const { fit_score, job_id, match_reasons } = validationResult.data;
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

    // Check if position exists
    const positionQuery = 'SELECT id FROM "Position" WHERE id = $1';
    const positionResult = await client.query(positionQuery, [job_id]);
    
    if (positionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Position not found' }), { status: 404, headers: handleCors(req) });
    }

    // Check if job match already exists for this candidate and position
    const existingMatchQuery = 'SELECT id FROM "JobMatch" WHERE "candidateId" = $1 AND "jobId" = $2';
    const existingMatchResult = await client.query(existingMatchQuery, [id, job_id]);
    
    if (existingMatchResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Job match already exists for this candidate and position' }), { status: 409, headers: handleCors(req) });
    }

    // Insert new job match
    const matchId = uuidv4();
    const insertQuery = `
      INSERT INTO "JobMatch" (id, "candidateId", "jobId", "fitScore", "matchReasons", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *;
    `;
    
    const insertResult = await client.query(insertQuery, [
      matchId,
      id,
      job_id,
      fit_score,
      match_reasons || [],
    ]);

    await client.query('COMMIT');
    
    const newMatch = insertResult.rows[0];
    const jobMatch = {
      id: newMatch.id,
      fit_score: newMatch.fit_score,
      job_id: newMatch.jobId,
      match_reasons: newMatch.match_reasons || [],
      created_at: newMatch.createdAt,
      updated_at: newMatch.updatedAt,
    };

    return new Response(JSON.stringify({ 
      message: 'Job match added successfully', 
      job_match: jobMatch 
    }), { status: 201, headers: handleCors(req) });
    
  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error adding job match', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 