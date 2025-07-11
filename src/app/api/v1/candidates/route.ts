
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { v4 as uuidv4 } from 'uuid';

// Schema for candidate creation with the new format
const candidateInfoSchema = z.object({
  personal_info: z.object({
    title_honorific: z.string().optional().nullable(),
    firstname: z.string().min(1, "First name is required"),
    lastname: z.string().min(1, "Last name is required"),
    nickname: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    introduction_aboutme: z.string().optional().nullable(),
  }),
  contact_info: z.object({
    email: z.string().email("Invalid email address"),
    phone: z.string().optional().nullable(),
  }),
  education: z.array(z.any()).optional(),
  experience: z.array(z.any()).optional(),
  skills: z.array(z.any()).optional(),
  job_suitable: z.array(z.any()).optional(),
  cv_language: z.string().optional().nullable(),
  status: z.string().optional(),
});

const createCandidateSchema = z.object({
  candidate_info: candidateInfoSchema,
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

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(request) });
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to create candidates' }), { status: 403, headers: handleCors(request) });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: handleCors(request) });
  }

  const validationResult = createCandidateSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(request) });
  }

  const { candidate_info, job_matches, job_applied } = validationResult.data;
  const name = `${candidate_info.personal_info.firstname} ${candidate_info.personal_info.lastname}`;
  const email = candidate_info.contact_info.email;
  const status = candidate_info.status || 'new';
  const parsedData = { candidate_info, job_matches, job_applied };
  const newCandidateId = uuidv4();

  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');

    // Check if candidate with same email already exists
    const existingQuery = 'SELECT id FROM "Candidate" WHERE email = $1';
    const existingResult = await client.query(existingQuery, [email.toLowerCase()]);
    
    if (existingResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'Candidate with this email already exists' }), { status: 409, headers: handleCors(request) });
    }

    // Create candidate
    const insertCandidateQuery = `
      INSERT INTO "Candidate" (id, name, email, phone, status, "parsedData", "applicationDate", "updatedAt", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
      RETURNING *;
    `;
    
    const candidateResult = await client.query(insertCandidateQuery, [
      newCandidateId,
      name,
      email.toLowerCase(),
      candidate_info.contact_info.phone || null,
      status,
      parsedData
    ]);

    const newCandidate = candidateResult.rows[0];

    // Create job matches if provided
    if (job_matches && job_matches.length > 0) {
      const insertJobMatchQuery = `
        INSERT INTO "JobMatch" (id, "candidateId", "jobId", "fitScore", "matchReasons", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `;

      for (const match of job_matches) {
        const matchId = uuidv4();
        await client.query(insertJobMatchQuery, [
          matchId,
          newCandidateId,
          match.job_id,
          match.fit_score,
          match.match_reasons || [],
        ]);
      }
    }

    // Create initial transition record
    const insertTransitionQuery = `
      INSERT INTO "TransitionRecord" (id, "candidateId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW());
    `;
    
    await client.query(insertTransitionQuery, [
      uuidv4(),
      newCandidateId,
      status,
      'Initial creation via API',
      user.id
    ]);

    await client.query('COMMIT');

    return new Response(JSON.stringify({
      message: 'Candidate created successfully',
      candidate: {
        id: newCandidate.id,
        name: newCandidate.name,
        email: newCandidate.email,
        phone: newCandidate.phone,
        status: newCandidate.status,
        parsedData: newCandidate.parsedData,
        applicationDate: newCandidate.applicationDate,
        createdAt: newCandidate.createdAt,
        updatedAt: newCandidate.updatedAt,
      }
    }), { status: 201, headers: handleCors(request) });

  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error creating candidate', details: (error as Error).message }), { status: 500, headers: handleCors(request) });
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(request) });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';

  const offset = (page - 1) * limit;

  const client = await getPool().connect();
  
  try {
    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND c.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM "Candidate" c ${whereClause}`;
    const countResult = await client.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get candidates with pagination
    const candidatesQuery = `
      SELECT c.*, p.title as "positionTitle", p.department as "positionDepartment", r.name as "recruiterName"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" r ON c."recruiterId" = r.id
      ${whereClause}
      ORDER BY c."createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const candidatesResult = await client.query(candidatesQuery, [...queryParams, limit, offset]);

    const candidates = candidatesResult.rows.map(candidate => ({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      positionId: candidate.positionId,
      recruiterId: candidate.recruiterId,
      fitScore: candidate.fitScore,
      status: candidate.status,
      applicationDate: candidate.applicationDate,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      position: candidate.positionId ? {
        title: candidate.positionTitle,
        department: candidate.positionDepartment
      } : null,
      recruiter: candidate.recruiterId ? {
        name: candidate.recruiterName
      } : null
    }));

    return new Response(JSON.stringify({
      success: true,
      data: candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }), { status: 200, headers: handleCors(request) });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error fetching candidates', details: (error as Error).message }), { status: 500, headers: handleCors(request) });
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  return new Response(null, { status: 200, headers });
} 