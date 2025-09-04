
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
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
import { createDateInTimezone } from '@/lib/dateUtils';
import { NotificationService } from '@/lib/notificationService';
import { SimpleWarningService } from '@/lib/warnings';
import { normalizeFitScore } from '@/lib/scoreUtils';

export const dynamic = 'force-dynamic';


// These schemas are now imported from ./schemas.ts

const createCandidateSchema = z.object({
  candidate_info: candidateInfoSchema.optional(),
  educationData: z.array(structuredEducationSchema).optional(),
  experienceData: z.array(structuredExperienceSchema).optional(),
  job_applied: z.any().optional(),
  job_matches: z.array(z.any()).optional(),
  sourceId: z.string().uuid().nullable().optional(),
  subSource: z.string().optional().nullable(),
}).strict().transform((data) => {
  // Ensure candidate_info is always an object
  return {
    candidate_info: data.candidate_info || {},
    educationData: data.educationData || [],
    experienceData: data.experienceData || [],
    job_applied: data.job_applied,
    job_matches: data.job_matches || [],
    sourceId: data.sourceId || null,
    subSource: data.subSource || null,
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

  if (!hasPermission(user, 'CANDIDATES_CREATE')) {
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
  
  // Validate required fields from payload
  const candidateInfo = candidate_info as any;
  const personalInfo = candidateInfo.personal_info || {};
  const contactInfo = candidateInfo.contact_info || {};
  
  // Use firstname and lastname from payload, or empty strings if not provided
  const firstname = personalInfo.firstname || '';
  const lastname = personalInfo.lastname || '';
  const name = `${firstname} ${lastname}`.trim() || 'Unknown Candidate';
  
  // Use email from payload, or default to unknown@email.com if missing
  const email = contactInfo.email || 'unknown@email.com';
  
  // Always default to "Applied" stage regardless of input
  let resolvedStageId: string | null = null;
  
  try {
    const appliedStage = await prisma.recruitmentStage.findFirst({
      where: { 
        OR: [
          { name: { equals: 'Applied', mode: 'insensitive' } },
          { name: { equals: 'applied', mode: 'insensitive' } }
        ]
      },
      select: { id: true }
    });
    
    if (appliedStage?.id) {
      resolvedStageId = appliedStage.id;
    } else {
      // Fallback to first stage by sortOrder if "Applied" not found
      const firstStage = await prisma.recruitmentStage.findFirst({
        orderBy: { sortOrder: 'asc' },
        select: { id: true }
      });
      resolvedStageId = firstStage?.id || null;
    }
  } catch {
    resolvedStageId = null;
  }
  
  if (!resolvedStageId) {
    return handleApiError(request, createValidationError('Unable to resolve a valid recruitment stage ID'));
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
  let isUpdate = false; // Declare isUpdate at function scope

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

  // Validate positionId format if present
  if (positionId && typeof positionId === 'string') {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(positionId)) {
      console.warn(`Invalid positionId format: ${positionId}`);
      positionId = null;
    }
  }

  try {
    // Check for existing candidate with same email and positionId
    let existingCandidate = null;
    if (positionId) {
      existingCandidate = await prisma.candidate.findFirst({
        where: {
          email: email.toLowerCase(),
          positionId: positionId
        },
        include: {
          recruiter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    }

    let candidate;

    if (existingCandidate) {
      // Update existing candidate
      isUpdate = true;
      const updateData: any = {
        name: name,
        phone: contactInfo.phone || null,
        statusId: resolvedStageId,
        fitScore: fitScore,
        parsedData: parsedData,
        source: validationResult.data.sourceId ? { connect: { id: validationResult.data.sourceId } } : undefined,
        subSource: validationResult.data.subSource || null,
        updatedAt: createDateInTimezone(),
      };

      candidate = await prisma.candidate.update({
        where: { id: existingCandidate.id },
        data: updateData,
        include: {
          recruiter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    } else {
      // Create new candidate
      const candidateData: any = {
        id: newCandidateId,
        name: name,
        email: email.toLowerCase(),
        phone: contactInfo.phone || null,
        statusId: resolvedStageId,
        fitScore: fitScore, // <-- always set top-level fitScore if present
        parsedData: parsedData,
        source: validationResult.data.sourceId ? { connect: { id: validationResult.data.sourceId } } : undefined,
        subSource: validationResult.data.subSource || null,
        applicationDate: createDateInTimezone(),
        createdAt: createDateInTimezone(),
        updatedAt: createDateInTimezone(),
      };

      // Only add position if positionId is valid
      if (positionId) {
        candidateData.position = { connect: { id: positionId } };
      }

      candidate = await prisma.candidate.create({
        data: candidateData,
      });
    }

    // Create transition record
    await prisma.transitionRecord.create({
      data: {
        id: uuidv4(),
        candidate: { connect: { id: candidate.id } },
        stage: resolvedStageId,
        notes: isUpdate ? 'Updated via API' : 'Initial creation via API',
        actingUser: { connect: { id: user.id } },
        date: createDateInTimezone(),
      },
    });

    // Log audit for create or update
    const auditMessage = isUpdate 
      ? `Candidate '${name}' updated by ${user.name}.` 
      : `Candidate '${name}' created by ${user.name}.`;
    const auditAction = isUpdate 
      ? 'API:V1:Candidates:Update' 
      : 'API:V1:Candidates:Create';
    
    await logAudit('AUDIT', auditMessage, auditAction, user.id, { 
      candidateId: candidate.id, 
      name, 
      email, 
      status: resolvedStageId,
      isUpdate 
    });
    
    // Check for warnings after candidate creation/update
    try {
      await SimpleWarningService.createOrUpdateWarnings('candidate', candidate.id, user.id);
    } catch (warningError) {
      console.error('Failed to check warnings for candidate:', warningError);
      // Don't fail the request if warning check fails
    }
    
    // Auto-assign recruiter if candidate has a position and no existing recruiter
    let finalCandidate = candidate;
    if (positionId && !candidate.recruiterId) {
      try {
        // console.log(`Attempting to auto-assign recruiter for candidate ${candidate.id} with positionId: ${positionId}`);
        
        // Get position with recruiter using Prisma
        const position = await prisma.position.findUnique({
          where: { id: positionId },
          include: { 
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        if (position && position.recruiterId && position.recruiter) {
          // Update candidate with recruiter using Prisma
          const updatedCandidate = await prisma.candidate.update({
            where: { id: candidate.id },
            data: { 
              recruiter: { connect: { id: position.recruiterId } },
              updatedAt: createDateInTimezone()
            },
            include: {
              recruiter: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          });

          // Create transition record for recruiter assignment
          await prisma.transitionRecord.create({
            data: {
              id: uuidv4(),
              candidate: { connect: { id: candidate.id } },
              position: positionId ? { connect: { id: positionId } } : undefined,
              stage: resolvedStageId,
              notes: `Recruiter auto-assigned from position: ${position.recruiter.name}`,
              actingUser: { connect: { id: user.id } },
              date: createDateInTimezone(),
            },
          });

          // Send notification to the assigned recruiter (only for new candidates)
          if (!isUpdate) {
            try {
              await NotificationService.notifyCandidateAdded(
                candidate.id,
                name,
                positionId,
                position.title,
                position.recruiterId,
                user.id
              );
              // console.log(`✅ Notification sent to recruiter ${position.recruiter.name} for new candidate ${name}`);
            } catch (notificationError) {
              console.error('Failed to send candidate added notification:', notificationError);
              // Don't fail the entire operation if notification fails
            }
          }
          
          // Use the updated candidate for the response
          finalCandidate = updatedCandidate;
        } else if (position && !position.recruiterId) {
          // console.log(`⚠️ Position ${positionId} exists but has no recruiter assigned`);
        } else if (!position) {
          // console.log(`❌ Position ${positionId} not found in database`);
        }
      } catch (syncError) {
        console.error('Failed to auto-assign recruiter after candidate creation/update:', syncError);
        // Don't fail the candidate creation/update if sync fails
      }
    }
    
    return createSuccessResponse(request, {
      message: isUpdate ? 'Candidate updated successfully' : 'Candidate created successfully',
      candidate: {
        id: finalCandidate.id,
        name: finalCandidate.name,
        email: finalCandidate.email,
        phone: finalCandidate.phone,
        status: 'Applied', // Use default status since we don't have the actual status name
        parsedData: finalCandidate.parsedData,
        applicationDate: finalCandidate.applicationDate ? new Date(finalCandidate.applicationDate as any).toISOString() : new Date().toISOString(),
        createdAt: finalCandidate.createdAt ? new Date(finalCandidate.createdAt as any).toISOString() : new Date().toISOString(),
        updatedAt: finalCandidate.updatedAt ? new Date(finalCandidate.updatedAt as any).toISOString() : new Date().toISOString(),
        recruiterId: finalCandidate.recruiterId,
      },
      isUpdate: isUpdate
    }, isUpdate ? 200 : 201);

  } catch (error: any) {
    const errorAction = isUpdate ? 'API:V1:Candidates:Update' : 'API:V1:Candidates:Create';
    const errorMessage = isUpdate 
      ? `Failed to update candidate by ${user?.name || 'Unknown'}. Error: ${(error as Error).message}`
      : `Failed to create candidate by ${user?.name || 'Unknown'}. Error: ${(error as Error).message}`;
    
    await logAudit('ERROR', errorMessage, errorAction, user?.id, { error: (error as Error).message, ...body });
    return handleApiError(request, createInternalServerError(isUpdate ? 'Error updating candidate' : 'Error creating candidate', {
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
      whereClause += ` AND c."statusId" = $${paramIndex}`;
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
        SELECT c.*, rs.name as "statusName", p.title as "positionTitle", p.department as "positionDepartment", r.name as "recruiterName", r."avatarUrl" as "recruiterAvatarUrl",
               cs.name as "sourceName", cs.description as "sourceDescription", cs.email as "sourceEmail", cs.logo as "sourceLogo"
        FROM "Candidate" c
        LEFT JOIN "Position" p ON c."positionId" = p.id
        LEFT JOIN "User" r ON c."recruiterId" = r.id
        LEFT JOIN "CandidateSource" cs ON c."sourceId" = cs.id
        LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
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
        avatarUrl: candidate.avatarUrl,
        positionId: candidate.positionId,
        recruiterId: candidate.recruiterId,
        sourceId: candidate.sourceId,
        subSource: candidate.subSource,
        fitScore: normalizeFitScore(candidate.fitScore),
        status: candidate.statusName || 'Applied',
        applicationDate: candidate.applicationDate,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
        position: candidate.positionId ? {
          title: candidate.positionTitle,
          department: candidate.positionDepartment
        } : null,
        recruiter: candidate.recruiterId ? {
          name: candidate.recruiterName,
          avatarUrl: candidate.recruiterAvatarUrl || null
        } : null,
        source: candidate.sourceId ? {
          id: candidate.sourceId,
          name: candidate.sourceName,
          description: candidate.sourceDescription,
          email: candidate.sourceEmail,
          logo: candidate.sourceLogo
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