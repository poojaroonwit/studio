import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { canEditApplicant, canUpdateApplicantPipelineStage } from '@/lib/permissions';
import { v4 as uuidv4 } from 'uuid';
import { handleCors } from '@/lib/cors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { SimpleErrorHandler,
  createUnauthorizedError,
  createForbiddenError,
  createValidationError,
  createNotFoundError,
  createInternalServerError
} from '@/lib/errors';;
import { normalizeFitScore } from '@/lib/scoreUtils';
import { logAudit } from '@/lib/auditLog';
import prisma from '@/lib/prisma';

const updateApplicantSchema = z.object({
  // Legacy fields for backward compatibility
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  positionId: z.string().uuid().nullable().optional(),
  recruiterId: z.string().uuid().nullable().optional(),
  fitScore: z.number().min(0).max(1).optional(),
  // Status must be a stage UUID in v1 as well
  status: z.string().uuid('Invalid status: must be a stage UUID').optional(),
  parsedData: z.record(z.any()).optional().nullable(),
  custom_attributes: z.record(z.any()).optional().nullable(),
  resumePath: z.string().optional().nullable(),
  transitionNotes: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  sourceId: z.string().uuid().nullable().optional(),
  subSource: z.string().optional().nullable(),
  
  // New applicant_info format
  applicant_info: z.object({
    personal_info: z.object({
      title_honorific: z.string().optional().nullable(),
      firstname: z.string().min(1).optional(),
      lastname: z.string().min(1).optional(),
      nickname: z.string().optional().nullable(),
      location: z.string().optional().nullable(),
      introduction_aboutme: z.string().optional().nullable(),
    }).optional(),
    contact_info: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional().nullable(),
    }).optional(),
    education: z.array(z.any()).optional(),
    experience: z.array(z.any()).optional(),
    skills: z.array(z.any()).optional(),
    job_suitable: z.array(z.any()).optional(),
    cv_language: z.string().optional().nullable(),
    // Status must be a stage UUID
    status: z.string().uuid('Invalid status: must be a stage UUID').optional(),
    fitScore: z.number().min(0).max(1).optional(), // Fixed: Added min/max validation
  }).optional(),
  
  // Job matches and applied job updates
  job_matches: z.array(z.object({
    fitScore: z.number().min(0).max(1),
    jobId: z.string().uuid(),
    matchReasons: z.array(z.string()).optional().default([]),
  })).optional(),
  
  job_applied: z.object({
    fitScore: z.number().min(0).max(1),
    jobId: z.string().uuid(),
    justification: z.array(z.string()).optional().default([]),
  }).optional(),
});

export { updateApplicantSchema };

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }
  const { id } = await params;
  const client = await getPool().connect();
  try {
    const applicantQuery = `
      SELECT c.*, p.title as "positionTitle", p.department as "positionDepartment", r.name as "recruiterName", r."avatarUrl" as "recruiterAvatarUrl",
             cs.name as "sourceName", cs.description as "sourceDescription", cs.email as "sourceEmail", cs.logo as "sourceLogo"
      FROM "Applicant" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" r ON c."recruiterId" = r.id
      LEFT JOIN "ApplicantSource" cs ON c."sourceId" = cs.id
      WHERE c.id = $1;
    `;
    const applicantResult = await client.query(applicantQuery, [id]);
    if (applicantResult.rows.length === 0) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Applicant not found'));
    }
    const applicant = applicantResult.rows[0];
    // Get job matches for this applicant
    const jobMatchesQuery = `
      SELECT 
        jm.*,
        p.title as "positionTitle",
        p.department as "positionDepartment",
        p.description as "positionDescription"
      FROM "JobMatch" jm
      LEFT JOIN "Position" p ON jm."jobId" = p.id
      WHERE jm."applicant_id" = $1
      ORDER BY jm."fitScore" DESC;
    `;
    const jobMatchesResult = await client.query(jobMatchesQuery, [id]);
    // Get resume history for this applicant (using Attachment table)
    const resumeHistoryQuery = `
      SELECT 
        a.id,
        a."applicantId",
        a."filePath",
        a."fileName" as "originalFileName",
        a."uploadedAt" as "uploadedAt",
        a."uploadedAt" as "createdAt",
        a."uploadedById" as "uploadedByUserId",
        a."updatedAt",
        u.name as "uploadedByUserName"
      FROM "Attachment" a
      LEFT JOIN "User" u ON a."uploadedById" = u.id
      WHERE a."applicantId" = $1
      ORDER BY a."uploadedAt" DESC;
    `;
    const resumeHistoryResult = await client.query(resumeHistoryQuery, [id]);
    return SimpleErrorHandler.createSuccessResponse(req, {
      ...applicant,
      custom_attributes: applicant.customAttributes || {},
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
      } : null,
      jobMatches: jobMatchesResult.rows.map((match: any) => ({
        ...match,
        fitScore: match.fitScore,
        jobTitle: match.jobTitle || match.positionTitle || null,
        positionTitle: match.positionTitle || match.jobTitle || null,
      })),
      resumeHistory: resumeHistoryResult.rows,
    }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error fetching Applicant: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  // Initial permission check - we'll do detailed ownership check after retrieving Applicant data
  const hasBasicEditPermission = user?.modulePermissions?.includes('APPLICANTS_EDIT_BASIC') || user?.modulePermissions?.includes('APPLICANTS_EDIT_BASIC_OWN');
  const hasSensitiveEditPermission = user?.modulePermissions?.includes('APPLICANTS_EDIT_SENSITIVE') || user?.modulePermissions?.includes('APPLICANTS_EDIT_SENSITIVE_OWN');
  const hasPipelineUpdatePermission = user?.modulePermissions?.includes('APPLICANTS_PIPELINE_STAGE_UPDATE') || user?.modulePermissions?.includes('APPLICANTS_PIPELINE_STAGE_UPDATE_OWN');
  
  if (!user || (user.role !== 'Admin' && !hasBasicEditPermission && !hasSensitiveEditPermission && !hasPipelineUpdatePermission)) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to update applicants'));
  }
  const { id } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid JSON body'));
  }
  const validationResult = updateApplicantSchema.safeParse(body);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    const errorMsg = Object.entries(fieldErrors).map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`).join('; ');
    return SimpleErrorHandler.handleApiError(req, createValidationError(`Invalid input - ${errorMsg}`));
  }
  
  const updateData = validationResult.data;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    const existingResult = await client.query('SELECT * FROM "Applicant" WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Applicant not found'));
    }
    
    const existingApplicant = existingResult.rows[0];
    const oldStatus = existingApplicant.statusId;
    const existingParsedData = existingApplicant.parsedData || {};

    // Detailed ownership-based permission check
    const editPermission = canEditApplicant(user, existingApplicant.recruiterId, user.id);
    if (!editPermission.canEdit) {
      await client.query('ROLLBACK');
      return SimpleErrorHandler.handleApiError(req, createForbiddenError(editPermission.reason || 'Insufficient permissions to edit this Applicant'));
    }

    // Check pipeline stage update permission if status is being changed
    if (updateData.status !== undefined && updateData.status !== oldStatus) {
      const pipelinePermission = canUpdateApplicantPipelineStage(user, existingApplicant.recruiterId, user.id);
      if (!pipelinePermission.canUpdate) {
        await client.query('ROLLBACK');
        return SimpleErrorHandler.handleApiError(req, createForbiddenError(pipelinePermission.reason || 'Insufficient permissions to update pipeline stage for this Applicant'));
      }
    }
    
    // Build dynamic update query based on provided fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    // Handle legacy fields
    if (updateData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(updateData.name);
    }
    
    if (updateData.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(updateData.email);
    }
    
    if (updateData.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      updateValues.push(updateData.phone);
    }
    
    if (updateData.positionId !== undefined) {
      updateFields.push(`"positionId" = $${paramIndex++}`);
      updateValues.push(updateData.positionId);
    }
    
    if (updateData.recruiterId !== undefined) {
      updateFields.push(`"recruiterId" = $${paramIndex++}`);
      updateValues.push(updateData.recruiterId);
    }
    
    // Extract fitScore from top-level fitScore, or fallback to job_applied.fitScore for backward compatibility
    let fitScoreToUpdate: number | undefined = undefined;
    if (typeof updateData.fitScore === 'number') {
      fitScoreToUpdate = updateData.fitScore;
    } else if (updateData.job_applied && typeof updateData.job_applied.fitScore === 'number') {
      fitScoreToUpdate = updateData.job_applied.fitScore;
    }
    if (typeof fitScoreToUpdate === 'number') {
      updateFields.push(`"fitScore" = $${paramIndex++}`);
      updateValues.push(fitScoreToUpdate);
    }
    
    if (updateData.status !== undefined) {
      updateFields.push(`"statusId" = $${paramIndex++}`);
      updateValues.push(updateData.status);
    }
    
    if (updateData.custom_attributes !== undefined) {
      updateFields.push(`"customAttributes" = $${paramIndex++}`);
      updateValues.push(updateData.custom_attributes);
    }
    
    if (updateData.resumePath !== undefined) {
      updateFields.push(`"resumePath" = $${paramIndex++}`);
      updateValues.push(updateData.resumePath);
    }
    
    if (updateData.avatarUrl !== undefined) {
      updateFields.push(`"avatarUrl" = $${paramIndex++}`);
      updateValues.push(updateData.avatarUrl);
    }
    
    if (updateData.sourceId !== undefined) {
      updateFields.push(`"sourceId" = $${paramIndex++}`);
      updateValues.push(updateData.sourceId);
    }
    
    if (updateData.subSource !== undefined) {
      updateFields.push(`"subSource" = $${paramIndex++}`);
      updateValues.push(updateData.subSource);
    }
    
    // Handle new applicant_info format
    let newParsedData = { ...existingParsedData };
    let hasParsedDataChanges = false;
    
    if (updateData.applicant_info) {
      newParsedData.applicant_info = {
        ...(newParsedData.applicant_info || {}),
        ...updateData.applicant_info
      };
      hasParsedDataChanges = true;
    }
    
    if (updateData.job_matches) {
      newParsedData.job_matches = updateData.job_matches;
      hasParsedDataChanges = true;
    }
    
    if (updateData.job_applied) {
      newParsedData.job_applied = updateData.job_applied;
      hasParsedDataChanges = true;
      // Patch: Sync top-level fields with job_applied
      if (updateData.job_applied.fitScore !== undefined) {
        updateFields.push(`"fitScore" = $${paramIndex++}`);
        updateValues.push(updateData.job_applied.fitScore);
      }
      if (updateData.job_applied.justification !== undefined) {
        // Store as a string (join array with newlines) or as JSON if preferred
        updateFields.push(`"assignmentJustification" = $${paramIndex++}`);
        updateValues.push(Array.isArray(updateData.job_applied.justification) ? updateData.job_applied.justification.join('\n') : updateData.job_applied.justification);
      }
    }
    
    if (updateData.parsedData) {
      newParsedData = { ...newParsedData, ...updateData.parsedData };
      hasParsedDataChanges = true;
    }
    
    if (hasParsedDataChanges) {
      updateFields.push(`"parsedData" = $${paramIndex++}`);
      updateValues.push(newParsedData);
    }
    
    // If no fields to update, return early
    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return SimpleErrorHandler.createSuccessResponse(req, { 
        message: 'No fields to update',
        applicant: {
          ...existingApplicant,
          custom_attributes: existingApplicant.customAttributes || {},
        }
      }, 200);
    }
    
    // Build and execute the update query
    const updateQuery = `
      UPDATE "Applicant" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;
    updateValues.push(id);
    
    const updateResult = await client.query(updateQuery, updateValues);
    
    // Update job matches in JobMatch table if provided
    if (updateData.job_matches) {
      // Delete existing job matches
      await client.query('DELETE FROM "JobMatch" WHERE "applicant_id" = $1', [id]);
      
      // Insert new job matches
      const insertJobMatchQuery = `
        INSERT INTO "JobMatch" (id, "applicant_id", "jobId", "fitScore", "matchReasons", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `;
      
      for (const match of updateData.job_matches) {
        const matchId = uuidv4();
        await client.query(insertJobMatchQuery, [
          matchId,
          id,
          match.jobId,
          match.fitScore, // Already 0-1
          match.matchReasons || [],
        ]);
      }
    }
    
    // Create transition record if status changed
    if (updateData.status !== undefined && oldStatus !== updateData.status) {
      const insertTransitionQuery = `
        INSERT INTO "TransitionRecord" (id, "applicant_id", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW());
      `;
      await client.query(insertTransitionQuery, [
        uuidv4(), id, updateData.positionId || existingApplicant.positionId, updateData.status, 'Status changed via API', user.id
      ]);
    }
    
    await client.query('COMMIT');
    const updatedApplicant = updateResult.rows[0];
    
    // Auto-assign recruiter if position changed
    const oldPositionId = existingApplicant.positionId;
    const newPositionId = updateData.positionId !== undefined ? updateData.positionId : oldPositionId;
    const hasPositionChanged = updateData.positionId !== undefined && updateData.positionId !== oldPositionId;
    
    if (hasPositionChanged && newPositionId) {
      try {
        // console.log(`Position changed for Applicant ${id}: ${oldPositionId} -> ${newPositionId}`);
        
        // Get position with recruiter using Prisma
        const position = await prisma.position.findUnique({
          where: { id: newPositionId },
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
          // Always assign recruiter when position is assigned, regardless of existing recruiter
          // This ensures the position's recruiter takes precedence
          const updatedApplicantWithRecruiter = await prisma.applicant.update({
            where: { id },
            data: { 
              recruiter: { connect: { id: position.recruiterId } },
              updatedAt: new Date()
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

          // Resolve Applied stage ID
          let appliedStageId = null;
          try {
            const appliedStage = await prisma.recruitmentStage.findFirst({
              where: { name: { equals: 'Applied', mode: 'insensitive' } },
              select: { id: true }
            });
            if (appliedStage) {
              appliedStageId = appliedStage.id;
            } else {
              // Fallback to first stage
              const firstStage = await prisma.recruitmentStage.findFirst({
                orderBy: { sortOrder: 'asc' },
                select: { id: true }
              });
              appliedStageId = firstStage?.id;
            }
          } catch (e) {
            console.error('Failed to resolve stage for recruiter assignment transition', e);
          }

          // Create transition record for recruiter assignment
          await prisma.transitionRecord.create({
            data: {
              id: uuidv4(),
              applicant: { connect: { id: id } },
              position: { connect: { id: newPositionId } },
              stage: appliedStageId || 'Applied', // Fallback to string only if DB lookup fails
              notes: `Recruiter auto-assigned from position: ${position.recruiter.name}`,
              actingUser: { connect: { id: user.id } },
              date: new Date(),
            },
          });

          // console.log(`✅ Recruiter auto-assigned to Applicant ${id} from position ${newPositionId}`);
          // console.log(`   Recruiter: ${position.recruiter.name} (${position.recruiter.email})`);
        } else if (position && !position.recruiterId) {
          // console.log(`⚠️ New position ${newPositionId} exists but has no recruiter assigned`);
        } else if (!position) {
          // console.log(`❌ New position ${newPositionId} not found in database`);
        } else if (updatedApplicant.recruiterId) {
          // console.log(`ℹ️ Applicant ${id} already has a recruiter assigned, skipping auto-assignment`);
        }
      } catch (syncError) {
        console.error('Failed to auto-assign recruiter after position update:', syncError);
        // Don't fail the Applicant update if sync fails
      }
    }
    
    const actingUserName = (user.name || user.email || user.id || 'System') as string;
    await logAudit('AUDIT', `Applicant '${updatedApplicant.name}' updated by ${actingUserName}.`, 'API:V1:Applicants:Update', user.id, { applicantId: id, updatedFields: updateData });
    
    // Fetch updated Applicant with source information for response
    const updatedApplicantWithSource = await client.query(`
      SELECT c.*, cs.name as "sourceName", cs.description as "sourceDescription", cs.email as "sourceEmail", cs.logo as "sourceLogo"
      FROM "Applicant" c
      LEFT JOIN "ApplicantSource" cs ON c."sourceId" = cs.id
      WHERE c.id = $1
    `, [id]);
    
    const applicantWithSource = updatedApplicantWithSource.rows[0];
    
    return SimpleErrorHandler.createSuccessResponse(req, {
      message: 'Applicant updated successfully',
      applicant: {
        ...applicantWithSource,
        custom_attributes: applicantWithSource.customAttributes || {},
        source: applicantWithSource.sourceId ? {
          id: applicantWithSource.sourceId,
          name: applicantWithSource.sourceName,
          description: applicantWithSource.sourceDescription,
          email: applicantWithSource.sourceEmail,
          logo: applicantWithSource.sourceLogo
        } : null,
      },
      updated_fields: Object.keys(updateData).filter(key => updateData[key as keyof typeof updateData] !== undefined)
    }, 200);
    
  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logAudit('ERROR', `Failed to update Applicant (ID: ${id}) by ${user?.name || 'Unknown'}. Error: ${errorMessage}`, 'API:V1:Applicants:Update', user?.id, { applicantId: id, error: errorMessage, ...body });
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error updating Applicant: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user || (user.role !== 'Admin' &&  !user.modulePermissions?.includes('APPLICANTS_DELETE'))) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to delete applicants'));
  }
  const { id } = await params;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const existingResult = await client.query('SELECT * FROM "Applicant" WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Applicant not found'));
    }
    await client.query('DELETE FROM "Applicant" WHERE id = $1', [id]);
    await client.query('COMMIT');
    const actingUserName = (user.name || user.email || user.id || 'System') as string;
    await logAudit('AUDIT', `Applicant '${existingResult.rows[0].name}' deleted by ${actingUserName}.`, 'API:V1:Applicants:Delete', user.id, { applicantId: id });
    return SimpleErrorHandler.createSuccessResponse(req, { message: 'Applicant deleted successfully' }, 200);
  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logAudit('ERROR', `Failed to delete Applicant (ID: ${id}) by ${user?.name || 'Unknown'}. Error: ${errorMessage}`, 'API:V1:Applicants:Delete', user?.id, { applicantId: id, error: errorMessage });
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error deleting Applicant: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 