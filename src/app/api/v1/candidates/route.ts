
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

const prisma = new PrismaClient();

const contactInfoSchema = z.object({
  email: z.string(),
  phone: z.string(),
}).strict();

const personalInfoSchema = z.object({
  title_honorific: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  nickname: z.string(),
  location: z.string(),
  introduction_aboutme: z.string(),
}).strict();

const jobSuitableEntrySchema = z.object({
  suitable_career: z.string(),
  suitable_job_level: z.string(),
  suitable_job_position: z.string(),
  suitable_salary_bath_month: z.string(),
}).strict();

const skillsEntrySchema = z.object({
  segment_skill: z.string(),
  skill: z.array(z.string()),
}).strict();

const candidateInfoSchema = z.object({
  personal_info: personalInfoSchema,
  contact_info: contactInfoSchema,
  cv_language: z.string(),
  skills: z.array(skillsEntrySchema),
  job_suitable: z.array(jobSuitableEntrySchema),
  status: z.string(),
}).strict();

const structuredEducationSchema = z.object({
  university: z.string(),
  major: z.string(),
  startMonth: z.number(),
  startYear: z.number(),
  endMonth: z.number(),
  endYear: z.number(),
  isCurrent: z.boolean(),
  GPA: z.string(),
}).strict();

const structuredExperienceSchema = z.object({
  company: z.string(),
  position: z.string(),
  startMonth: z.number(),
  startYear: z.number(),
  endMonth: z.number().nullable(),
  endYear: z.number().nullable(),
  isCurrent: z.boolean(),
  description: z.string(),
}).strict();

const createCandidateSchema = z.object({
  candidate_info: candidateInfoSchema,
  educationData: z.array(structuredEducationSchema).min(1),
  experienceData: z.array(structuredExperienceSchema).min(1),
}).strict();

export { candidateInfoSchema, structuredEducationSchema, structuredExperienceSchema };

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
  } catch {
    return handleApiError(request, createValidationError('Invalid JSON body'));
  }

  // Convert 'true'/'false' strings to booleans in educationData and experienceData
  function convertBooleans(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(convertBooleans);
    } else if (obj && typeof obj === 'object') {
      const newObj: any = {};
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          if (obj[key] === 'true') newObj[key] = true;
          else if (obj[key] === 'false') newObj[key] = false;
          else newObj[key] = obj[key];
        } else {
          newObj[key] = convertBooleans(obj[key]);
        }
      }
      return newObj;
    }
    return obj;
  }

  if (body.educationData) {
    body.educationData = convertBooleans(body.educationData);
  }
  if (body.experienceData) {
    body.experienceData = convertBooleans(body.experienceData);
  }

  const validationResult = createCandidateSchema.safeParse(body);
  if (!validationResult.success) {
    return handleApiError(request, createValidationError('Invalid input', validationResult.error.flatten().fieldErrors));
  }

  const { candidate_info, educationData, experienceData } = validationResult.data;
  const name = `${candidate_info.personal_info.firstname} ${candidate_info.personal_info.lastname}`;
  const email = candidate_info.contact_info.email;
  const status = candidate_info.status || 'new';

  // Flatten parsedData structure to match UI expectations
  const parsedData = {
    ...candidate_info,
    education: educationData,
    experience: experienceData
  };
  const newCandidateId = uuidv4();

  try {
    const newCandidate = await prisma.candidate.create({
      data: {
        id: newCandidateId,
        name: name,
        email: email.toLowerCase(),
        status: status,
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
        stage: status,
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