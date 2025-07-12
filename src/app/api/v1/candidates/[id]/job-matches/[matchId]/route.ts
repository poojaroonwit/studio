import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';

const jobMatchSchema = z.object({
  fit_score: z.number().min(0).max(100),
  job_id: z.string().uuid(),
  match_reasons: z.array(z.string()).optional().default([]),
  // Note: position_title, created_at, and updated_at are automatically handled
  // - position_title: Retrieved from Position table based on job_id
  // - created_at: Automatically set to current timestamp
  // - updated_at: Automatically set to current timestamp
});

export async function GET(req: NextRequest, { params }: { params: { id: string; matchId: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  const { id, matchId } = params;
  const client = await getPool().connect();
  
  try {
    // Check if candidate exists
    const candidateQuery = 'SELECT id FROM "Candidate" WHERE id = $1';
    const candidateResult = await client.query(candidateQuery, [id]);
    
    if (candidateResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404, headers: handleCors(req) });
    }

    // Get specific job match
    const jobMatchQuery = `
      SELECT jm.*, p.title as "positionTitle"
      FROM "JobMatch" jm
      LEFT JOIN "Position" p ON jm."jobId" = p.id
      WHERE jm.id = $1 AND jm."candidateId" = $2;
    `;
    const jobMatchResult = await client.query(jobMatchQuery, [matchId, id]);
    
    if (jobMatchResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Job match not found' }), { status: 404, headers: handleCors(req) });
    }

    const match = jobMatchResult.rows[0];
    const jobMatch = {
      id: match.id,
      fit_score: match.fit_score,
      job_id: match.jobId,
      match_reasons: match.match_reasons || [],
      position_title: match.positionTitle,
      created_at: match.createdAt,
      updated_at: match.updatedAt,
    };

    return new Response(JSON.stringify({ job_match: jobMatch }), { status: 200, headers: handleCors(req) });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error fetching job match', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string; matchId: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job matches' }), { status: 403, headers: handleCors(req) });
  }

  const { id, matchId } = params;
  let body;
  
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = jobMatchSchema.safeParse(body);
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

    // Check if job match exists
    const existingMatchQuery = 'SELECT id FROM "JobMatch" WHERE id = $1 AND "candidateId" = $2';
    const existingMatchResult = await client.query(existingMatchQuery, [matchId, id]);
    
    if (existingMatchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Job match not found' }), { status: 404, headers: handleCors(req) });
    }

    // Update the job match
    const updateQuery = `
      UPDATE "JobMatch" 
      SET "jobId" = $1, "fitScore" = $2, "matchReasons" = $3, "updatedAt" = NOW()
      WHERE id = $4 AND "candidateId" = $5
      RETURNING *;
    `;
    
    const updateResult = await client.query(updateQuery, [
      job_id,
      fit_score,
      match_reasons || [],
      matchId,
      id,
    ]);

    await client.query('COMMIT');
    
    const updatedMatch = updateResult.rows[0];
    const jobMatch = {
      id: updatedMatch.id,
      fit_score: updatedMatch.fit_score,
      job_id: updatedMatch.jobId,
      match_reasons: updatedMatch.match_reasons || [],
      updated_at: updatedMatch.updatedAt,
    };

    return new Response(JSON.stringify({ 
      message: 'Job match updated successfully', 
      job_match: jobMatch 
    }), { status: 200, headers: handleCors(req) });
    
  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error updating job match', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; matchId: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job matches' }), { status: 403, headers: handleCors(req) });
  }

  const { id, matchId } = params;
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

    // Delete the specific job match
    const deleteResult = await client.query(
      'DELETE FROM "JobMatch" WHERE id = $1 AND "candidateId" = $2 RETURNING id', 
      [matchId, id]
    );
    
    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Job match not found' }), { status: 404, headers: handleCors(req) });
    }
    
    await client.query('COMMIT');
    
    return new Response(JSON.stringify({ 
      message: 'Job match deleted successfully'
    }), { status: 200, headers: handleCors(req) });
    
  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error deleting job match', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 