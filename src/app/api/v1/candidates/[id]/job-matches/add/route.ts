import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';

const addJobMatchSchema = z.object({
  fitScore: z.number().min(0).max(100).transform(val => Math.round(val * 100)), // Convert decimal to integer (0.7 -> 70)
  jobId: z.string().uuid(),
  matchReasons: z.array(z.string()).optional().default([]),
  // Note: positionTitle, createdAt, and updatedAt are automatically handled
  // - positionTitle: Retrieved from Position table based on jobId
  // - createdAt: Automatically set to current timestamp
  // - updatedAt: Automatically set to current timestamp
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

  const { fitScore, jobId, matchReasons } = validationResult.data;
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
    const positionResult = await client.query(positionQuery, [jobId]);
    
    if (positionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Position not found' }), { status: 404, headers: handleCors(req) });
    }

    // Check if job match already exists for this candidate and position
    const existingMatchQuery = 'SELECT id FROM "JobMatch" WHERE "candidateId" = $1 AND "jobId" = $2';
    const existingMatchResult = await client.query(existingMatchQuery, [id, jobId]);
    
    if (existingMatchResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Job match already exists for this candidate and position' }), { status: 409, headers: handleCors(req) });
    }

    // Insert new job match
    const matchId = uuidv4();
    const insertJobMatchQuery = `
      INSERT INTO "JobMatch" (id, "candidateId", "jobId", "fitScore", "matchReasons")
      VALUES ($1, $2, $3, $4, $5)
    `;
    
    const insertResult = await client.query(insertJobMatchQuery, [
      matchId,
      id,
      jobId,
      fitScore,
      matchReasons || [],
    ]);

    await client.query('COMMIT');
    
    const newMatch = insertResult.rows[0];
    const jobMatch = {
      id: newMatch.id,
      fitScore: newMatch.fitScore ? newMatch.fitScore / 100 : 0, // Convert integer back to decimal
      jobId: newMatch.jobId,
      matchReasons: newMatch.matchReasons || [],
      createdAt: newMatch.createdAt,
      updatedAt: newMatch.updatedAt,
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