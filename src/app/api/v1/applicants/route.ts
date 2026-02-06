
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { handleCors } from '@/lib/cors';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import {
  SimpleErrorHandler,
  createUnauthorizedError,
  createForbiddenError,
  createValidationError,
  createConflictError,
  createInternalServerError
} from '@/lib/errors';;
import { normalizePayloadTypes } from '@/lib/apiUtils';
import { ApplicantInfoSchema, structuredEducationSchema, structuredExperienceSchema } from './schemas';
import { logAudit } from '@/lib/auditLog';
import { syncRecruiterForApplicant } from '@/lib/recruiterSync';
import { createDateInTimezone } from '@/lib/dateUtils';
import { NotificationService } from '@/lib/notificationService';

import { normalizeFitScore } from '@/lib/scoreUtils';

export const dynamic = 'force-dynamic';


// These schemas are now imported from ./schemas.ts

const createApplicantSchema = z.object({
  applicant_info: ApplicantInfoSchema.optional().nullable(),
  educationData: z.array(structuredEducationSchema).optional().nullable(),
  experienceData: z.array(structuredExperienceSchema).optional().nullable(),
  job_applied: z.any().optional().nullable(),
  job_matches: z.array(z.any()).optional().nullable(),
  sourceId: z.string().uuid().nullable().optional(),
  subSource: z.string().optional().nullable(),
  expectedSalary: z.number().optional().nullable(),
}).strict().transform((data) => {
  // Ensure applicant_info is always an object
  return {
    applicant_info: data.applicant_info || {},
    educationData: data.educationData || [],
    experienceData: data.experienceData || [],
    job_applied: data.job_applied,
    job_matches: data.job_matches || [],
    sourceId: data.sourceId || null,
    subSource: data.subSource || null,
    expectedSalary: data.expectedSalary || null,
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
    return SimpleErrorHandler.handleApiError(request, createUnauthorizedError('Authentication required'));
  }

  if (!hasPermission(user, 'Applicants_CREATE')) {
    return SimpleErrorHandler.handleApiError(request, createForbiddenError('Insufficient permissions to create Applicants'));
  }

  let body;
  try {
    body = await request.json();
    body = cleanPayload(body); // Use the new cleaning utility
  } catch {
    return SimpleErrorHandler.handleApiError(request, createValidationError('Invalid JSON body'));
  }

  const validationResult = createApplicantSchema.safeParse(body);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    const errorMsg = Object.entries(fieldErrors).map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`).join('; ');
    console.error('Validation errors:', JSON.stringify(validationResult.error.flatten(), null, 2));
    console.error('Body that failed validation:', JSON.stringify(body, null, 2));
    return SimpleErrorHandler.handleApiError(request, createValidationError(`Invalid input - ${errorMsg}`));
  }

  const { applicant_info, educationData, experienceData, job_applied, job_matches, expectedSalary } = validationResult.data;

  // Validate required fields from payload
  const applicantInfo = applicant_info as any;
  const personalInfo = applicantInfo.personal_info || {};
  const contactInfo = applicantInfo.contact_info || {};

  // Use firstname and lastname from payload, or empty strings if not provided
  const firstname = personalInfo.firstname || '';
  const lastname = personalInfo.lastname || '';
  const name = `${firstname} ${lastname}`.trim() || 'Unknown Applicant';

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
    return SimpleErrorHandler.handleApiError(request, createValidationError('Unable to resolve a valid recruitment stage ID'));
  }

  // Flatten parsedData structure to match UI expectations
  const parsedData = {
    ...applicant_info,
    education: educationData || [],
    experience: experienceData || [],
    job_applied: job_applied || applicantInfo.job_applied,
    job_matches: job_matches || applicantInfo.job_matches || []
  };
  const newApplicantId = uuidv4();

  // Extract fitScore from applicant_info, applicant_info.job_applied, or top-level job_applied
  let fitScore = undefined;
  if (typeof applicantInfo.fitScore === 'number') {
    fitScore = Math.round(applicantInfo.fitScore);
  } else if (applicantInfo.job_applied && typeof applicantInfo.job_applied.fitScore === 'number') {
    fitScore = Math.round(applicantInfo.job_applied.fitScore);
  } else if (job_applied && typeof job_applied.fitScore === 'number') {
    fitScore = Math.round(job_applied.fitScore);
  }

  // Extract positionId from applicant_info.job_applied or job_matches, or from top-level job_applied/job_matches
  let positionId = null;
  if (applicantInfo.job_applied?.jobId) {
    positionId = applicantInfo.job_applied.jobId;
  } else if (job_applied?.jobId) {
    positionId = job_applied.jobId;
  } else if (applicantInfo.job_matches && Array.isArray(applicantInfo.job_matches) && applicantInfo.job_matches.length > 0) {
    const matchWithJobId = applicantInfo.job_matches.find((m: any) => m && m.jobId);
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
    const applicantData: any = {
      id: newApplicantId,
      name: name,
      email: email.toLowerCase(),
      phone: contactInfo.phone || null,
      statusId: resolvedStageId,
      fitScore: fitScore, // <-- always set top-level fitScore if present
      parsedData: parsedData,
      source: validationResult.data.sourceId ? { connect: { id: validationResult.data.sourceId } } : undefined,
      subSource: validationResult.data.subSource || null,
      expectedSalary: expectedSalary,
      applicationDate: createDateInTimezone(),
      emailDate: (applicant_info as any).emailDate ? new Date((applicant_info as any).emailDate) : null,
      emailSubject: (applicant_info as any).emailSubject || null,
      emailId: (applicant_info as any).emailId || null,
      emailMetadata: (applicant_info as any).emailMetadata || null,
      createdAt: createDateInTimezone(),
      updatedAt: createDateInTimezone(),
    };

    // Only add position if positionId is valid
    if (positionId) {
      applicantData.position = { connect: { id: positionId } };
    }

    const newApplicant = await prisma.applicant.create({
      data: applicantData,
    });

    // Create initial transition record
    await prisma.transitionRecord.create({
      data: {
        id: uuidv4(),
        applicant: { connect: { id: newApplicantId } },
        stage: resolvedStageId,
        notes: 'Initial creation via API',
        actingUser: { connect: { id: user.id } },
        date: createDateInTimezone(),
      },
    });
    const actingUserName = (user.name || user.email || user.id || 'System') as string;
    await logAudit('AUDIT', `Applicant '${name}' created by ${actingUserName}.`, 'API:V1:Applicants:Create', user.id, { applicantId: newApplicantId, name, email, status: resolvedStageId });



    // Auto-assign recruiter if Applicant has a position
    let finalApplicant = newApplicant;
    if (positionId) {
      try {
        // console.log(`Attempting to auto-assign recruiter for Applicant ${newApplicantId} with positionId: ${positionId}`);

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
          // Update Applicant with recruiter using Prisma
          const updatedApplicant = await prisma.applicant.update({
            where: { id: newApplicantId },
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
              applicant: { connect: { id: newApplicantId } },
              position: positionId ? { connect: { id: positionId } } : undefined,
              stage: resolvedStageId,
              notes: `Recruiter auto-assigned from position: ${position.recruiter.name}`,
              actingUser: { connect: { id: user.id } },
              date: createDateInTimezone(),
            },
          });


          // Send notification to the assigned recruiter
          try {
            await NotificationService.notifyApplicantAdded(
              newApplicantId,
              name,
              positionId,
              position.title,
              position.recruiterId,
              user.id
            );
            // console.log(`✅ Notification sent to recruiter ${position.recruiter.name} for new Applicant ${name}`);
          } catch (notificationError) {
            console.error('Failed to send Applicant added notification:', notificationError);
            // Don't fail the entire operation if notification fails
          }

          // Use the updated Applicant for the response
          finalApplicant = updatedApplicant;
        } else if (position && !position.recruiterId) {
          // console.log(`⚠️ Position ${positionId} exists but has no recruiter assigned`);
        } else if (!position) {
          // console.log(`❌ Position ${positionId} not found in database`);
        }
      } catch (syncError) {
        console.error('Failed to auto-assign recruiter after Applicant creation:', syncError);
        // Don't fail the Applicant creation if sync fails
      }
    }

    return SimpleErrorHandler.createSuccessResponse(request, {
      message: 'Applicant created successfully',
      applicant: {
        id: finalApplicant.id,
        name: finalApplicant.name,
        email: finalApplicant.email,
        phone: finalApplicant.phone,
        expectedSalary: (finalApplicant as any).expectedSalary,
        status: 'Applied', // Use default status since we don't have the actual status name
        parsedData: finalApplicant.parsedData,
        applicationDate: finalApplicant.applicationDate ? new Date(finalApplicant.applicationDate as any).toISOString() : new Date().toISOString(),
        createdAt: finalApplicant.createdAt ? new Date(finalApplicant.createdAt as any).toISOString() : new Date().toISOString(),
        updatedAt: finalApplicant.updatedAt ? new Date(finalApplicant.updatedAt as any).toISOString() : new Date().toISOString(),
        recruiterId: finalApplicant.recruiterId,
      }
    }, 201);

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const actingUserName = user ? (user.name || user.email || user.id || 'System') : 'Unknown';
    await logAudit('ERROR', `Failed to create Applicant by ${actingUserName}. Error: ${errorMessage}`, 'API:V1:Applicants:Create', user?.id, { error: errorMessage, ...body });
    return SimpleErrorHandler.handleApiError(request, createInternalServerError(`Error creating Applicant: ${errorMessage}`));
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;

  if (!user) {
    return SimpleErrorHandler.handleApiError(request, createUnauthorizedError('Authentication required'));
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
      const countQuery = `SELECT COUNT(*) FROM "applicant" c ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get applicants with pagination
      const applicantsQuery = `
        SELECT c.*, rs.name as "statusName", p.title as "positionTitle", p.department as "positionDepartment", r.name as "recruiterName", r."avatarUrl" as "recruiterAvatarUrl",
               cs.name as "sourceName", cs.description as "sourceDescription", cs.email as "sourceEmail", cs.logo as "sourceLogo"
        FROM "applicant" c
        LEFT JOIN "Position" p ON c."positionId" = p.id
        LEFT JOIN "User" r ON c."recruiterId" = r.id
        LEFT JOIN "ApplicantSource" cs ON c."sourceId" = cs.id
        LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
        ${whereClause}
        ORDER BY c."createdAt" DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const applicantsResult = await client.query(applicantsQuery, [...queryParams, limit, offset]);

      const applicants = applicantsResult.rows.map((applicant: any) => ({
        id: applicant.id,
        name: applicant.name,
        email: applicant.email,
        phone: applicant.phone,
        avatarUrl: applicant.avatarUrl,
        positionId: applicant.positionId,
        recruiterId: applicant.recruiterId,
        sourceId: applicant.sourceId,
        subSource: applicant.subSource,
        fitScore: normalizeFitScore(applicant.fitScore),
        status: applicant.statusName || 'Applied',
        applicationDate: applicant.applicationDate,
        createdAt: applicant.createdAt,
        updatedAt: applicant.updatedAt,
        position: applicant.positionId ? {
          title: applicant.positionTitle,
          department: applicant.positionDepartment
        } : null,
        recruiter: applicant.recruiterId ? {
          name: applicant.recruiterName,
          avatarUrl: applicant.recruiterAvatarUrl || null
        } : null,
        source: applicant.sourceId ? {
          id: applicant.sourceId,
          name: applicant.sourceName,
          description: applicant.sourceDescription,
          email: applicant.sourceEmail,
          logo: applicant.sourceLogo
        } : null
      }));

      return SimpleErrorHandler.createSuccessResponse(request, {
        data: applicants,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return SimpleErrorHandler.handleApiError(request, createInternalServerError(`Error fetching Applicants: ${errorMessage}`));
  }
}

export async function OPTIONS(request: NextRequest) {
  // SECURITY: Use proper CORS validation instead of wildcard
  const { getAllowedOrigin } = await import('@/lib/cors');
  const allowedOrigin = getAllowedOrigin(request);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return new Response(null, { status: 200, headers });
} 
