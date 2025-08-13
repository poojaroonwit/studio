
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
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
import { logAudit } from '@/lib/auditLog';
import { syncRecruiterForCandidate } from '@/lib/recruiterSync';

// These schemas are now imported from ./schemas.ts

const createCandidateSchema = z.object({
  candidate_info: candidateInfoSchema.optional(),
  educationData: z.array(structuredEducationSchema).optional(),
  experienceData: z.array(structuredExperienceSchema).optional(),
  job_applied: z.any().optional(),
  job_matches: z.array(z.any()).optional(),
}).strict().transform((data) => {
  // Ensure candidate_info is always an object
  return {
    candidate_info: data.candidate_info || {},
    educationData: data.educationData || [],
    experienceData: data.experienceData || [],
    job_applied: data.job_applied,
    job_matches: data.job_matches || [],
  };
});

// Helper function to recursively normalize boolean strings and numeric strings
function normalizeDataTypes(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(normalizeDataTypes);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = normalizeDataTypes(value);
    }
    return result;
  }
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if (trimmed === '') return null;
    const lower = trimmed.toLowerCase();
    // Handle boolean strings
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    // Handle numeric strings
    if (!isNaN(Number(trimmed))) {
      return Number(trimmed);
    }
    return trimmed;
  }
  return obj;
}

// Utility to clean payload: remove empty strings, normalize isCurrent, trim/lowercase emails
function cleanPayload(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanPayload);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === "") continue; // Remove empty strings
      if (key === "isCurrent") {
        // Normalize isCurrent to boolean
        if (typeof value === "string") {
          result[key] = value.toLowerCase() === "true";
        } else if (typeof value === "number") {
          result[key] = value === 1;
        } else {
          result[key] = !!value;
        }
      } else if (key === "email" && typeof value === "string") {
        result[key] = value.trim().toLowerCase();
      } else if (typeof value === "string") {
        result[key] = value.trim();
      } else {
        result[key] = cleanPayload(value);
      }
    }
    return result;
  }
  return obj;
}

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
    body = cleanPayload(body); // Use the new cleaning utility
  } catch {
    return handleApiError(request, createValidationError('Invalid JSON body'));
  }

  const validationResult = createCandidateSchema.safeParse(body);
  if (!validationResult.success) {
    console.error('Validation errors:', JSON.stringify(validationResult.error.flatten(), null, 2));
    console.error('Body that failed validation:', JSON.stringify(body, null, 2));
    return handleApiError(request, createValidationError('Invalid input', validationResult.error.flatten().fieldErrors));
  }

  const { candidate_info, educationData, experienceData, job_applied, job_matches } = validationResult.data;
  
  // Handle optional fields with defaults - use validated data structure
  const candidateInfo = candidate_info as any;
  const personalInfo = candidateInfo.personal_info || {};
  const contactInfo = candidateInfo.contact_info || {};
  const name = personalInfo.firstname && personalInfo.lastname 
    ? `${personalInfo.firstname} ${personalInfo.lastname}` 
    : 'Unknown Candidate';
  const email = contactInfo.email || 'no-email@example.com';
  const status = candidateInfo.status || 'new';

  console.log('Creating candidate with data:', {
    name,
    email,
    status,
    personalInfo,
    contactInfo,
    educationDataLength: educationData?.length || 0,
    experienceDataLength: experienceData?.length || 0
  });

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
    experience: experienceData || [],
    job_applied: job_applied || candidateInfo.job_applied,
    job_matches: job_matches || candidateInfo.job_matches || []
  };
  const newCandidateId = uuidv4();

  // Extract fitScore from candidate_info, candidate_info.job_applied, or top-level job_applied
  let fitScore = undefined;
  if (typeof candidateInfo.fitScore === 'number') {
    fitScore = Math.round(candidateInfo.fitScore);
  } else if (candidateInfo.job_applied && typeof candidateInfo.job_applied.fitScore === 'number') {
    fitScore = Math.round(candidateInfo.job_applied.fitScore);
  } else if (job_applied && typeof job_applied.fitScore === 'number') {
    fitScore = Math.round(job_applied.fitScore);
  }

  // Extract positionId from candidate_info.job_applied or job_matches, or from top-level job_applied/job_matches
  let positionId = null;
  if (candidateInfo.job_applied?.jobId) {
    positionId = candidateInfo.job_applied.jobId;
  } else if (job_applied?.jobId) {
    positionId = job_applied.jobId;
  } else if (candidateInfo.job_matches && Array.isArray(candidateInfo.job_matches) && candidateInfo.job_matches.length > 0) {
    const matchWithJobId = candidateInfo.job_matches.find((m: any) => m && m.jobId);
    if (matchWithJobId) {
      positionId = matchWithJobId.jobId;
    }
  } else if (job_matches && Array.isArray(job_matches) && job_matches.length > 0) {
    const matchWithJobId = job_matches.find((m: any) => m && m.jobId);
    if (matchWithJobId) {
      positionId = matchWithJobId.jobId;
    }
  }

  try {
    const newCandidate = await prisma.candidate.create({
      data: {
        id: newCandidateId,
        name: name,
        email: email.toLowerCase(),
        phone: contactInfo.phone || null,
        positionId: positionId, // Store positionId in database
        status: appliedStage,
        fitScore: fitScore, // <-- always set top-level fitScore if present
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
    await logAudit('AUDIT', `Candidate '${name}' created by ${user.name}.`, 'API:V1:Candidates:Create', user.id, { candidateId: newCandidateId, name, email, status: appliedStage });
    
    // Auto-assign recruiter if candidate has a position and no recruiter
    if (positionId && !newCandidate.recruiterId) {
      try {
        const syncSuccess = await syncRecruiterForCandidate(
          newCandidateId,
          positionId,
          user.id,
          user.name || user.email || 'System'
        );
        if (syncSuccess) {
          console.log(`Recruiter auto-assigned to candidate ${newCandidateId} from position ${positionId}`);
        }
      } catch (syncError) {
        console.error('Failed to auto-assign recruiter after candidate creation:', syncError);
        // Don't fail the candidate creation if sync fails
      }
    }
    
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
    await logAudit('ERROR', `Failed to create candidate by ${user?.name || 'Unknown'}. Error: ${(error as Error).message}`, 'API:V1:Candidates:Create', user?.id, { error: (error as Error).message, ...body });
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