
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { 
  createSuccessResponse, 
  handleApiError, 
  createUnauthorizedError, 
  createForbiddenError, 
  createValidationError, 
  createConflictError, 
  createInternalServerError 
} from '@/lib/apiErrorHandler';
import { normalizePayloadTypes } from '@/lib/apiUtils';
import { candidateInfoSchema, structuredEducationSchema, structuredExperienceSchema } from './schemas';

const prisma = new PrismaClient();

// These schemas are now imported from ./schemas.ts

const createCandidateSchema = z.object({
  candidate_info: candidateInfoSchema.optional(),
  educationData: z.array(structuredEducationSchema).optional(),
  experienceData: z.array(structuredExperienceSchema).optional(),
}).strict();

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return handleApiError(request, createUnauthorizedError('Authentication required'));
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return handleApiError(request, createForbiddenError('Insufficient permissions to create candidates'));
  }

  let body;
  try {
    body = await request.json();
    body = normalizePayloadTypes(body);
  } catch {
    return handleApiError(request, createValidationError('Invalid JSON body'));
  }

  const validationResult = createCandidateSchema.safeParse(body);
  if (!validationResult.success) {
    return handleApiError(request, createValidationError('Invalid input', validationResult.error.flatten().fieldErrors));
  }

  const { candidate_info, educationData, experienceData } = validationResult.data;
  
  // Handle optional fields with defaults
  const personalInfo = candidate_info?.personal_info || {};
  const contactInfo = candidate_info?.contact_info || {};
  const name = personalInfo.firstname && personalInfo.lastname 
    ? `${personalInfo.firstname} ${personalInfo.lastname}` 
    : 'Unknown Candidate';
  const email = contactInfo.email || 'no-email@example.com';
  const status = candidate_info?.status || 'new';

  // Fetch the first recruitment stage (by sortOrder ASC)
  let appliedStage = 'Applied';
  try {
    const firstStage = await prisma.recruitmentStage.findFirst({
      orderBy: { sortOrder: 'asc' },
    });
    if (firstStage && firstStage.name) {
      appliedStage = firstStage.name;
    }
  } catch (e) {
    // fallback to default 'Applied'
  }

  // Flatten parsedData structure to match UI expectations
  const parsedData = {
    ...candidate_info,
    education: educationData || [],
    experience: experienceData || []
  };
  const newCandidateId = uuidv4();

  try {
    const newCandidate = await prisma.candidate.create({
      data: {
        id: newCandidateId,
        name: name,
        email: email.toLowerCase(),
        phone: contactInfo.phone || null,
        status: appliedStage,
        parsedData: parsedData,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create initial transition record
    await prisma.transitionRecord.create({
      data: {
        id: uuidv4(),
        candidateId: newCandidateId,
        stage: appliedStage,
        notes: 'Initial creation via API',
        actingUserId: user.id,
        date: new Date(),
      },
    });

    return createSuccessResponse(request, {
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
    }, 201);

  } catch (error: any) {
    // Handle unique constraint violation for email
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return handleApiError(request, createConflictError('A candidate with this email already exists.'));
    }
    // Enhanced error logging for debugging
    return handleApiError(request, createInternalServerError('Error creating candidate', {
      originalError: (error as Error).message,
      stack: (error as Error).stack,
    }));
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return handleApiError(request, createUnauthorizedError('Authentication required'));
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';

  const offset = (page - 1) * limit;

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

    const client = await getPool().connect();
    
    try {
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

      return createSuccessResponse(request, {
        data: candidates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }, 200);
    } finally {
      client.release();
    }

  } catch (error) {
    return handleApiError(request, createInternalServerError('Error fetching candidates', { 
      originalError: (error as Error).message 
    }));
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