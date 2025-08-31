import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { normalizePayloadTypes } from '@/lib/apiUtils';

const jobAppliedSchema = z.object({
  fitScore: z.number().min(0).max(1),
  jobId: z.string().uuid(),
  justification: z.array(z.string()).optional().default([]),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }
  
  const { id } = await params;
  const client = await getPool().connect();
  
  try {
    // Check if candidate exists
    const candidateQuery = 'SELECT id, "parsedData", "assignmentJustification" FROM "Candidate" WHERE id = $1';
    const candidateResult = await client.query(candidateQuery, [id]);
    
    if (candidateResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404, headers: handleCors(req) });
    }

    const candidate = candidateResult.rows[0];
    const parsedData = candidate.parsedData || {};
    const jobApplied = parsedData.job_applied || null;
    
    // Ensure assignmentJustification is properly formatted as an array
    const assignmentJustification = candidate.assignmentJustification
      ? (Array.isArray(candidate.assignmentJustification)
          ? candidate.assignmentJustification
          : typeof candidate.assignmentJustification === 'string'
            ? candidate.assignmentJustification.split(/[\n\r]+/).filter((item: string) => item.trim() !== '')
            : [])
      : [];

    return new Response(JSON.stringify({ 
      job_applied: jobApplied,
      assignmentJustification: assignmentJustification
    }), { status: 200, headers: handleCors(req) });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error fetching job_applied data', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
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
  
  if (user.role !== 'Admin' &&  !user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job_applied data' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = await params;
  let body;
  
  try {
    body = await req.json();
    body = normalizePayloadTypes(body);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/candidates/[id]/job-applied', details: { message: 'Invalid JSON body' } }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = jobAppliedSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/candidates/[id]/job-applied', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }

  const { fitScore, jobId, justification } = validationResult.data;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if candidate exists
    const candidateQuery = 'SELECT id, "parsedData" FROM "Candidate" WHERE id = $1';
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

    const candidate = candidateResult.rows[0];
    const parsedData = candidate.parsedData || {};
    
    // Update job_applied in parsedData
    parsedData.job_applied = {
      fitScore,
      jobId,
      justification: justification || [],
    };

    // Ensure justification is always an array for consistency
    const justificationArray = Array.isArray(justification) ? justification : 
                              (justification ? String(justification).split(/[\n\r]+/).filter((item: string) => item.trim() !== '') : []);

    // Update candidate with new parsedData and top-level fields
    const updateQuery = `
      UPDATE "Candidate" 
      SET "parsedData" = $1, "fitScore" = $2, "positionId" = $3, "assignmentJustification" = $4
      WHERE id = $5
      RETURNING *;
    `;
    const assignmentJustificationStr = justificationArray.join('\n');
    const updateResult = await client.query(updateQuery, [parsedData, fitScore, jobId, assignmentJustificationStr, id]);

    await client.query('COMMIT');
    
    const updatedCandidate = updateResult.rows[0];
    const updatedParsedData = updatedCandidate.parsedData || {};
    const jobApplied = updatedParsedData.job_applied || null;
    
    // Ensure assignmentJustification is properly formatted as an array
    const assignmentJustification = updatedCandidate.assignmentJustification
      ? (Array.isArray(updatedCandidate.assignmentJustification)
          ? updatedCandidate.assignmentJustification
          : typeof updatedCandidate.assignmentJustification === 'string'
            ? updatedCandidate.assignmentJustification.split(/[\n\r]+/).filter((item: string) => item.trim() !== '')
            : [])
      : [];
    
    // Include both the job_applied and the formatted assignmentJustification in the response
    return new Response(JSON.stringify({ 
      message: 'Job applied data updated successfully', 
      job_applied: jobApplied,
      assignmentJustification: assignmentJustification
    }), { status: 200, headers: handleCors(req) });
    
  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error updating job_applied data', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
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
  
  if (user.role !== 'Admin' &&  !user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job_applied data' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = await params;
  let body;
  
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/candidates/[id]/job-applied', details: { message: 'Invalid JSON body' } }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = jobAppliedSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', code: 'BAD_REQUEST', endpoint: '/api/v1/candidates/[id]/job-applied', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }

  const { fitScore, jobId, justification } = validationResult.data;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if candidate exists
    const candidateQuery = 'SELECT id, "parsedData" FROM "Candidate" WHERE id = $1';
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

    const candidate = candidateResult.rows[0];
    const parsedData = candidate.parsedData || {};
    
    // Update job_applied in parsedData
    parsedData.job_applied = {
      fitScore,
      jobId,
      justification: justification || [],
    };

    // Ensure justification is always an array for consistency
    const justificationArray = Array.isArray(justification) ? justification : 
                              (justification ? String(justification).split(/[\n\r]+/).filter((item: string) => item.trim() !== '') : []);

    // Update candidate with new parsedData and top-level fields
    const updateQuery = `
      UPDATE "Candidate" 
      SET "parsedData" = $1, "fitScore" = $2, "positionId" = $3, "assignmentJustification" = $4
      WHERE id = $5
      RETURNING *;
    `;
    const assignmentJustificationStr = justificationArray.join('\n');
    const updateResult = await client.query(updateQuery, [parsedData, fitScore, jobId, assignmentJustificationStr, id]);

    await client.query('COMMIT');
    
    const updatedCandidate = updateResult.rows[0];
    const updatedParsedData = updatedCandidate.parsedData || {};
    const jobApplied = updatedParsedData.job_applied || null;
    
    // Ensure assignmentJustification is properly formatted as an array
    const assignmentJustification = updatedCandidate.assignmentJustification
      ? (Array.isArray(updatedCandidate.assignmentJustification)
          ? updatedCandidate.assignmentJustification
          : typeof updatedCandidate.assignmentJustification === 'string'
            ? updatedCandidate.assignmentJustification.split(/[\n\r]+/).filter((item: string) => item.trim() !== '')
            : [])
      : [];
    
    // Include both the job_applied and the formatted assignmentJustification in the response
    return new Response(JSON.stringify({ 
      message: 'Job applied data updated successfully', 
      job_applied: jobApplied,
      assignmentJustification: assignmentJustification
    }), { status: 200, headers: handleCors(req) });
    
  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error updating job_applied data', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
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
  
  if (user.role !== 'Admin' &&  !user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to manage job_applied data' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = await params;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if candidate exists
    const candidateQuery = 'SELECT id, "parsedData" FROM "Candidate" WHERE id = $1';
    const candidateResult = await client.query(candidateQuery, [id]);
    
    if (candidateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404, headers: handleCors(req) });
    }

    const candidate = candidateResult.rows[0];
    const parsedData = candidate.parsedData || {};
    
    // Remove job_applied from parsedData
    if (parsedData.job_applied) {
      delete parsedData.job_applied;
    }

    // Update candidate with new parsedData
    const updateQuery = `
      UPDATE "Candidate" 
      SET "parsedData" = $1
      WHERE id = $2
      RETURNING *;
    `;
    
    await client.query(updateQuery, [parsedData, id]);

    await client.query('COMMIT');
    
    return new Response(JSON.stringify({ 
      message: 'Job applied data deleted successfully'
    }), { status: 200, headers: handleCors(req) });
    
  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error deleting job_applied data', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 