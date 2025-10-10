import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { normalizeFitScore } from '@/lib/scoreUtils';

const jobMatchSchema = z.object({
  fitScore: z.number().min(0).max(1),
  jobId: z.string().uuid(),
  matchReasons: z.array(z.string()).optional().default([]),
  // Note: positionTitle, createdAt, and updatedAt are automatically handled
  // - positionTitle: Retrieved from Position table based on jobId
  // - createdAt: Automatically set to current timestamp
  // - updatedAt: Automatically set to current timestamp
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; matchId: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  if (user.role !== 'Admin' &&  !user.modulePermissions?.includes('JOB_MATCH_VIEW')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to view job matches' }), { status: 403, headers: handleCors(req) });
  }

  const { id, matchId } = await params;
  let client: any = null;
  
  try {
    client = await getPool().connect();
    
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
      fitScore: match.fitScore,
      jobId: match.jobId,
      matchReasons: match.matchReasons || [],
      positionTitle: match.positionTitle,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    };

    return new Response(JSON.stringify({ job_match: jobMatch }), { status: 200, headers: handleCors(req) });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error fetching job match', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    // ✅ CRITICAL FIX: Always release the database client
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing database client:', releaseError);
      }
    }
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; matchId: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  if (user.role !== 'Admin' &&  !user.modulePermissions?.includes('JOB_MATCH_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job matches' }), { status: 403, headers: handleCors(req) });
  }

  const { id, matchId } = await params;
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

  const { fitScore, jobId, matchReasons } = validationResult.data;
  let client: any = null;
  
  try {
    client = await getPool().connect();
    
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
      SET "fitScore" = $1, "jobId" = $2, "matchReasons" = $3, "updatedAt" = NOW()
      WHERE id = $4 AND "candidateId" = $5
      RETURNING *
    `;
    const updateResult = await client.query(updateQuery, [fitScore, jobId, matchReasons, matchId, id]);
    
    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Failed to update job match' }), { status: 500, headers: handleCors(req) });
    }

    await client.query('COMMIT');
    
    const updatedMatch = updateResult.rows[0];
    return new Response(JSON.stringify({ 
      message: 'Job match updated successfully',
      job_match: {
        id: updatedMatch.id,
        fitScore: updatedMatch.fitScore,
        jobId: updatedMatch.jobId,
        matchReasons: updatedMatch.matchReasons || [],
        updatedAt: updatedMatch.updatedAt
      }
    }), { status: 200, headers: handleCors(req) });
    
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    return new Response(JSON.stringify({ error: 'Error updating job match', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    // ✅ CRITICAL FIX: Always release the database client
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing database client:', releaseError);
      }
    }
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; matchId: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  if (user.role !== 'Admin' &&  !user.modulePermissions?.includes('JOB_MATCH_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job matches' }), { status: 403, headers: handleCors(req) });
  }

  const { id, matchId } = await params;
  let client: any = null;
  
  try {
    client = await getPool().connect();
    
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

    // Delete the job match
    const deleteQuery = 'DELETE FROM "JobMatch" WHERE id = $1 AND "candidateId" = $2 RETURNING *';
    const deleteResult = await client.query(deleteQuery, [matchId, id]);
    
    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Failed to delete job match' }), { status: 500, headers: handleCors(req) });
    }

    await client.query('COMMIT');
    
    return new Response(JSON.stringify({ 
      message: 'Job match deleted successfully',
      deleted_match: {
        id: deleteResult.rows[0].id,
        candidateId: deleteResult.rows[0].candidateId
      }
    }), { status: 200, headers: handleCors(req) });
    
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    return new Response(JSON.stringify({ error: 'Error deleting job match', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    // ✅ CRITICAL FIX: Always release the database client
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing database client:', releaseError);
      }
    }
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 