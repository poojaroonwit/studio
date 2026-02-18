export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// src/app/api/applicants/bulk-action/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '@/lib/db';
import { broadcastApplicantUpdate, broadcastApplicantStatusChanged } from '@/lib/simple-broadcaster';
import { hasAnyPermission, canUpdateApplicantPipelineStage, canAssignRecruiter, canEditApplicant } from '@/lib/permissions';


import { auth } from '@/auth';
const bulkActionSchema = z.object({
  action: z.enum(['delete', 'change_status', 'assign_recruiter', 'reprocess']),
  applicantIds: z.array(z.string().uuid()).min(1, "At least one Applicant ID is required."),
  newStatus: z.string().optional(), // Required if action is 'change_status'
  newRecruiterId: z.string().uuid().nullable().optional(), // Required if action is 'assign_recruiter'
  transitionNotes: z.string().optional().nullable(), // Optional for 'change_status'
}).refine((data) => {
  // Validate that required fields are present based on action
  if (data.action === 'change_status' && !data.newStatus) {
    return false;
  }
  return true;
}, {
  message: "newStatus is required when action is 'change_status'",
  path: ["newStatus"]
});

// OPTIMIZED: Inline headcount validation using single connection
async function validateApplicantHiringStatusWithClient(client: any, applicantId: string, positionId: string) {
  try {
    // console.log(`Validating headcount for Applicant ${applicantId} in position ${positionId}`);
    
    // Check if position has any headcounts
    const headcountsResult = await client.query(
      'SELECT id, status, "applicantId" FROM "Headcount" WHERE "positionId" = $1',
      [positionId]
    );
    const headcounts = headcountsResult.rows;
    
    // console.log(`Found ${headcounts.length} headcounts for position ${positionId}:`, headcounts);

    if (headcounts.length === 0) {
      return {
        canHire: false,
        reason: 'NO_HEADCOUNT',
        message: 'This position has no headcount defined. Cannot hire Applicant without available headcount.',
        headcountStatus: {
          hasHeadcounts: false,
          totalHeadcounts: 0,
          vacantHeadcounts: 0,
          filledHeadcounts: 0,
        },
      };
    }

    // A headcount is only considered filled if it has status 'filled' AND has a Applicant assigned
    const vacantHeadcounts = headcounts.filter((h: any) => h.status === 'vacant' || h.applicantId === null);
    const filledHeadcounts = headcounts.filter((h: any) => h.status === 'filled' && h.applicantId !== null);

    if (vacantHeadcounts.length === 0) {
      return {
        canHire: false,
        reason: 'NO_VACANT_HEADCOUNT',
        message: 'All headcounts for this position are already filled. Cannot hire Applicant without available headcount.',
        headcountStatus: {
          hasHeadcounts: true,
          totalHeadcounts: headcounts.length,
          vacantHeadcounts: 0,
          filledHeadcounts: filledHeadcounts.length,
        },
      };
    }

    // Check if Applicant is already assigned to a headcount
    const existingAssignment = headcounts.find((h: any) => h.applicantId === applicantId);
    if (existingAssignment) {
      return {
        canHire: true,
        reason: 'ALREADY_ASSIGNED',
        message: 'Applicant is already assigned to a headcount.',
        headcountId: existingAssignment.id,
        headcountStatus: {
          hasHeadcounts: true,
          totalHeadcounts: headcounts.length,
          vacantHeadcounts: vacantHeadcounts.length,
          filledHeadcounts: filledHeadcounts.length,
        },
      };
    }

    return {
      canHire: true,
      reason: 'VACANT_HEADCOUNT_AVAILABLE',
      message: 'Vacant headcount available for hiring.',
      availableHeadcountId: vacantHeadcounts[0].id, // Return the first available headcount
      headcountStatus: {
        hasHeadcounts: true,
        totalHeadcounts: headcounts.length,
        vacantHeadcounts: vacantHeadcounts.length,
        filledHeadcounts: filledHeadcounts.length,
      },
    };
  } catch (error) {
    console.error('Error validating Applicant hiring status:', error);
    throw error;
  }
}

// OPTIMIZED: Inline headcount assignment using single connection
async function assignApplicantToHeadcountWithClient(client: any, applicantId: string, positionId: string, actingUserId: string, actingUserName: string) {
  try {
    // Find vacant headcount for this position (status is vacant OR no Applicant assigned)
    const vacantHeadcountResult = await client.query(
      `SELECT id FROM "Headcount" 
       WHERE "positionId" = $1 AND (status = 'vacant' OR "applicantId" IS NULL)
       ORDER BY "createdAt" ASC 
       LIMIT 1`,
      [positionId]
    );

    if (vacantHeadcountResult.rows.length === 0) {
      return {
        success: false,
        message: 'No vacant headcount available for this position',
      };
    }

    const vacantHeadcount = vacantHeadcountResult.rows[0];

    // Update the headcount to assign this Applicant
    await client.query(
      'UPDATE "Headcount" SET status = $1, "applicantId" = $2 WHERE id = $3',
      ['filled', applicantId, vacantHeadcount.id]
    );

    // Check if all headcounts are now filled and auto-close position if needed
    let autoCloseResult = null;
    try {
      const allHeadcountsResult = await client.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status = $1 AND "applicantId" IS NOT NULL THEN 1 END) as filled FROM "Headcount" WHERE "positionId" = $2',
        ['filled', positionId]
      );
      
      const { total, filled } = allHeadcountsResult.rows[0];
      
      if (parseInt(total) > 0 && parseInt(total) === parseInt(filled)) {
        // All headcounts are filled, close the position
        await client.query(
          'UPDATE "Position" SET "isOpen" = false, "updatedAt" = NOW() WHERE id = $1',
          [positionId]
        );
        
        autoCloseResult = {
          action: 'closed',
          message: 'Position automatically closed as all headcounts are filled'
        };
      }
    } catch (autoCloseError) {
      console.error('Error auto-closing position:', autoCloseError);
      // Don't fail the headcount assignment if auto-close fails
    }

    return {
      success: true,
      message: 'Applicant automatically assigned to headcount',
      headcountId: vacantHeadcount.id,
      autoCloseResult,
    };
  } catch (error) {
    console.error('Error assigning Applicant to headcount:', error);
    throw error;
  }
}

// OPTIMIZED: Inline audit logging using existing connection
async function logAuditWithClient(client: any, level: string, message: string, source: string, actingUserId: string | null, details: any = null) {
  try {
    // Ensure actingUserId refers to an existing user; otherwise set to null to avoid FK errors
    let sanitizedActingUserId: string | null = actingUserId;
    if (sanitizedActingUserId) {
      try {
        const check = await client.query('SELECT 1 FROM "User" WHERE id = $1 LIMIT 1', [sanitizedActingUserId]);
        if (check.rowCount === 0) {
          sanitizedActingUserId = null;
        }
      } catch (_) {
        sanitizedActingUserId = null;
      }
    }
    
    const logId = uuidv4();
    const query = `
      INSERT INTO "LogEntry" (id, timestamp, level, message, source, "actingUserId", details, "createdAt")
      VALUES ($1, NOW(), $2, $3, $4, $5, $6, NOW());
    `;
    await client.query(query, [logId, level, message, source, sanitizedActingUserId, details]);
    
    const logEntry = {
      id: logId,
      timestamp: new Date(),
      level,
      message,
      source,
      actingUserId: sanitizedActingUserId,
      details,
    };
    

  } catch (error) {
    // If the log itself fails, we log to the console as a fallback.
    console.error('CRITICAL: Failed to write to LogEntry table:', error);
    console.error('Fallback Log:', { level, message, source, actingUserId, details });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const actingUserId = session?.user?.id;
  const actingUserName = (session?.user?.name || session?.user?.email || actingUserId || 'System') as string;

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to manage Applicants
  // Check permissions based on the action being performed
  let hasPermission = false;
  
  // Read the request body first to check permissions
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  
  // Check specific permissions based on action
  const actionType = body.action;
  
  switch (actionType) {
    case 'assign_recruiter':
      hasPermission = hasAnyPermission(session.user, ['Applicants_RECRUITER_ASSIGN', 'Applicants_RECRUITER_ASSIGN_OWN']);
      break;
    case 'change_status':
      hasPermission = hasAnyPermission(session.user, ['Applicants_PIPELINE_STAGE_BULK_UPDATE', 'Applicants_PIPELINE_STAGE_UPDATE_OWN']);
      break;
    case 'delete':
      hasPermission = hasAnyPermission(session.user, ['Applicants_DELETE']);
      break;
    case 'reprocess':
      hasPermission = hasAnyPermission(session.user, ['Applicants_EDIT_BASIC', 'Applicants_EDIT_BASIC_OWN']);
      break;
    default:
      hasPermission = false;
  }
  
  if (!hasPermission) {
    let specificMessage = 'Forbidden: Insufficient permissions to perform this bulk Applicant action';
    
    switch (actionType) {
      case 'change_status':
        specificMessage = 'Forbidden: You do not have permission to update Applicant status. Please contact your administrator to request the "Applicants_PIPELINE_STAGE_BULK_UPDATE" permission.';
        break;
      case 'assign_recruiter':
        specificMessage = 'Forbidden: You do not have permission to assign recruiters to Applicants. Please contact your administrator to request the "Applicants_RECRUITER_ASSIGN" permission.';
        break;
      case 'delete':
        specificMessage = 'Forbidden: You do not have permission to delete Applicants. Please contact your administrator to request the "Applicants_DELETE" permission.';
        break;
      case 'reprocess':
        specificMessage = 'Forbidden: You do not have permission to re-process Applicants. Please contact your administrator to request the "Applicants_EDIT_BASIC" permission.';
        break;
      default:
        specificMessage = 'Forbidden: You do not have permission to perform this action on Applicants. Please contact your administrator.';
    }
    
    return NextResponse.json({ message: specificMessage }, { status: 403 });
  }

  // Validate the request body
  const validationResult = bulkActionSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }

    const validatedData = validationResult.data;
  const action = validatedData.action;
  const applicantIds = validatedData.applicantIds;
  const newStatus = validatedData.newStatus;
  const newRecruiterId = validatedData.newRecruiterId;
  const transitionNotes = validatedData.transitionNotes;

  // Before using applicantIds in queries, validate:
  const applicantIdsSchema = z.string().uuid().array();
  if (!applicantIdsSchema.safeParse(applicantIds).success) {
    throw new Error('Invalid applicantIds array: must be array of UUID strings');
  }

  // OPTIMIZED: Use single database connection for entire operation
  let client;
  try {
    client = await getPool().connect();
    // Set transaction isolation level to prevent race conditions
    await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    await client.query('BEGIN');

    let result;
    let auditMessage = '';

    switch (action) {
      case 'delete':
        const deleteResult = await client.query('DELETE FROM "Applicant" WHERE id = ANY($1::uuid[]) RETURNING id', [applicantIds]);
        result = { deletedCount: deleteResult.rowCount };
        auditMessage = `Bulk deleted ${deleteResult.rowCount} Applicants`;
        break;

      case 'change_status':
        // Validate that newStatus is a valid UUID that references a RecruitmentStage
        try {
          const statusCheck = await client.query('SELECT id, name FROM "RecruitmentStage" WHERE id = $1::uuid', [newStatus]);
          if (statusCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ message: 'Invalid status: Status must reference a valid recruitment stage' }, { status: 400 });
          }
          // console.log(`Status validation passed - status: ${newStatus}`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error('Error validating status:', error);
          return NextResponse.json({ message: 'Error validating status' }, { status: 500 });
        }

        const oldStatusesResult = await client.query('SELECT id, "statusId", "positionId", "recruiterId" FROM "Applicant" WHERE id = ANY($1::uuid[])', [applicantIds]);
        const oldStatuses = oldStatusesResult.rows;

        // Check ownership permissions for each Applicant
        const applicantsWithPermission = [];
        const applicantsWithoutPermission = [];
        
        for (const applicant of oldStatuses) {
          const pipelinePermission = canUpdateApplicantPipelineStage(session.user, applicant.recruiterId, actingUserId);
          if (pipelinePermission.canUpdate) {
            applicantsWithPermission.push(applicant);
          } else {
            applicantsWithoutPermission.push({
              applicantId: applicant.id,
              reason: pipelinePermission.reason
            });
          }
        }

        // If any Applicants don't have permission, return error
        if (applicantsWithoutPermission.length > 0) {
          await client.query('ROLLBACK');
          const deniedApplicants = applicantsWithoutPermission.map(c => c.applicantId).join(', ');
          await logAuditWithClient(client, 'WARN', `Bulk status update denied for Applicants: ${deniedApplicants} by ${actingUserName}`, 'API:Applicants:BulkAction', actingUserId);
          return NextResponse.json({ 
            message: `Forbidden: You don't have permission to update status for some Applicants. Denied Applicants: ${deniedApplicants}`,
            deniedApplicants: applicantsWithoutPermission
          }, { status: 403 });
        }

        // Use only Applicants with permission
        const applicantsToProcess = applicantsWithPermission;
        
        // Get the stage name for comparison
        const stageResult = await client.query('SELECT name FROM "RecruitmentStage" WHERE id = $1::uuid', [newStatus]);
        const stageName = stageResult.rows[0]?.name;
        
        // If changing to "Hired" status, validate headcount availability for each Applicant
        const headcountValidationResults = [];
        const applicantsToUpdate = [];
        const applicantsToReject = [];
        
        if (stageName === 'Hired') {
          for (const applicant of applicantsToProcess) {
            if (applicant.statusId !== newStatus && applicant.positionId) {
              try {
                // OPTIMIZED: Use inline validation with same connection
                const validation = await validateApplicantHiringStatusWithClient(client, applicant.id, applicant.positionId);
                if (validation.canHire) {
                  applicantsToUpdate.push(applicant);
                  headcountValidationResults.push({
                    applicantId: applicant.id,
                    validation,
                    willAutoAssign: validation.reason === 'VACANT_HEADCOUNT_AVAILABLE'
                  });
                } else {
                  applicantsToReject.push({
                    applicantId: applicant.id,
                    reason: validation.reason,
                    message: validation.message,
                    headcountStatus: validation.headcountStatus
                  });
                }
              } catch (error) {
                console.error(`Error validating headcount for Applicant ${applicant.id}:`, error);
                
                // Provide more specific error messages based on the error type
                let errorMessage = 'Error validating headcount availability';
                let errorReason = 'VALIDATION_ERROR';
                
                if (error instanceof Error) {
                  if (error.message.includes('connection') || error.message.includes('timeout')) {
                    errorMessage = 'Database connection error during headcount validation';
                    errorReason = 'CONNECTION_ERROR';
                  } else if (error.message.includes('permission') || error.message.includes('access')) {
                    errorMessage = 'Permission denied during headcount validation';
                    errorReason = 'PERMISSION_ERROR';
                  } else if (error.message.includes('constraint') || error.message.includes('foreign key')) {
                    errorMessage = 'Data integrity error during headcount validation';
                    errorReason = 'DATA_INTEGRITY_ERROR';
                  } else {
                    // Use the actual error message if it's meaningful
                    errorMessage = `Headcount validation error: ${error.message}`;
                  }
                }
                
                applicantsToReject.push({
                  applicantId: applicant.id,
                  reason: errorReason,
                  message: errorMessage,
                  headcountStatus: null,
                  originalError: error instanceof Error ? error.message : String(error)
                });
              }
            } else if (applicant.statusId !== newStatus) {
              // Applicant has no position, cannot be hired
              applicantsToReject.push({
                applicantId: applicant.id,
                reason: 'NO_POSITION',
                message: 'Applicant must be assigned to a position to be hired'
              });
            } else {
              // Status is already "Hired", no change needed
              applicantsToUpdate.push(applicant);
            }
          }
        } else {
          // For non-"Hired" status changes, update all Applicants
          applicantsToUpdate.push(...applicantsToProcess);
        }
        
        // Update Applicants that passed validation
        if (applicantsToUpdate.length > 0) {
          const applicantIdsToUpdate = applicantsToUpdate.map(c => c.id);
          const updateStatusResult = await client.query(
            'UPDATE "Applicant" SET "statusId" = $1, "updatedAt" = NOW() WHERE id = ANY($2::uuid[]) RETURNING id',
            [newStatus, applicantIdsToUpdate]
          );

          // Create transition records and handle headcount assignments for status changes
          for (const applicant of applicantsToUpdate) {
            if (applicant.statusId !== newStatus) {
              const newTransitionId = uuidv4();
              await client.query(
                'INSERT INTO "TransitionRecord" (id, "applicantId", stage, notes, "actingUserId", date, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())',
                [newTransitionId, applicant.id, newStatus, transitionNotes || null, actingUserId]
              );
              
              // Get the created transition record to broadcast
              const getTransitionQuery = 'SELECT * FROM "TransitionRecord" WHERE id = $1';
              const transitionResult = await client.query(getTransitionQuery, [newTransitionId]);
              if (transitionResult.rows.length > 0) {
                const newTransition = transitionResult.rows[0];
                // Broadcast the updated Applicant with new status
                const updatedApplicant = { ...applicant, status: newStatus };
                broadcastApplicantUpdate(updatedApplicant, actingUserId);
                
                // Also broadcast status change
                if (applicant.statusId) {
                  broadcastApplicantStatusChanged(updatedApplicant, applicant.statusId, String(newStatus), actingUserId);
                }
              }
            }
          }
        }

        // Handle headcount assignments for Applicants changing to "Hired" status
        const headcountAssignmentResults = [];
        const autoCloseResults = [];
        if (stageName === 'Hired') {
          for (const result of headcountValidationResults) {
            if (result.willAutoAssign) {
              try {
                // Double-check headcount availability right before assignment to prevent race conditions
                const positionId = applicantsToUpdate.find(c => c.id === result.applicantId)?.positionId!;
                const revalidation = await validateApplicantHiringStatusWithClient(client, result.applicantId, positionId);
                
                if (!revalidation.canHire) {
                  // Headcount became unavailable between validation and assignment
                  console.warn(`Race condition detected: Headcount became unavailable for Applicant ${result.applicantId} during assignment. Rejecting Applicant.`, {
                    applicantId: result.applicantId,
                    positionId,
                    originalValidation: result.validation,
                    revalidation,
                    timestamp: new Date().toISOString()
                  });
                  applicantsToReject.push({
                    applicantId: result.applicantId,
                    reason: revalidation.reason,
                    message: `Headcount became unavailable: ${revalidation.message}`,
                    headcountStatus: revalidation.headcountStatus
                  });
                  
                  // Remove from applicantsToUpdate since we can't proceed
                  const rejectIndex = applicantsToUpdate.findIndex(c => c.id === result.applicantId);
                  if (rejectIndex !== -1) {
                    applicantsToUpdate.splice(rejectIndex, 1);
                  }
                  
                  continue;
                }
                
                // OPTIMIZED: Use inline assignment with same connection
                const assignmentResult = await assignApplicantToHeadcountWithClient(
                  client,
                  result.applicantId,
                  positionId,
                  actingUserId,
                  actingUserName
                );
                headcountAssignmentResults.push({
                  applicantId: result.applicantId,
                  success: assignmentResult.success,
                  message: assignmentResult.message,
                  headcountId: assignmentResult.headcountId
                });

                // Check if position should be auto-closed after headcount assignment
                if (assignmentResult.success && assignmentResult.autoCloseResult) {
                  autoCloseResults.push({
                    applicantId: result.applicantId,
                    positionId: applicantsToUpdate.find(c => c.id === result.applicantId)?.positionId!,
                    autoCloseResult: assignmentResult.autoCloseResult
                  });
                }
              } catch (error) {
                console.error(`Error assigning headcount for Applicant ${result.applicantId}:`, error);
                headcountAssignmentResults.push({
                  applicantId: result.applicantId,
                  success: false,
                  message: 'Error assigning headcount'
                });
              }
            }
          }
        }

        // Update counts after potential race condition rejections
        const finalUpdatedCount = applicantsToUpdate.length;
        const finalRejectedCount = applicantsToReject.length;
        
        result = { 
          updatedCount: finalUpdatedCount,
          rejectedCount: finalRejectedCount,
          headcountAssignments: headcountAssignmentResults,
          autoCloseResults: autoCloseResults,
          rejectedApplicants: applicantsToReject
        };
        
        const successMessage = `Updated status to ${newStatus} for ${applicantsToUpdate.length} Applicants`;
        const rejectMessage = applicantsToReject.length > 0 ? `, rejected ${applicantsToReject.length} Applicants due to headcount constraints` : '';
        const autoCloseMessage = autoCloseResults.length > 0 ? `, auto-closed ${autoCloseResults.filter(r => r.autoCloseResult?.action === 'closed').length} positions` : '';
        auditMessage = successMessage + rejectMessage + autoCloseMessage;
        break;

      case 'assign_recruiter':
        // If newRecruiterId is provided, verify it exists and has recruiter role
        if (newRecruiterId !== null && newRecruiterId !== undefined) {
          const recruiterCheck = await client.query('SELECT id FROM "User" WHERE id = $1 AND role = $2', [newRecruiterId, 'Recruiter']);
          if (recruiterCheck.rows.length === 0) {
            throw new Error('Invalid recruiter ID or user is not a recruiter');
          }
        }

        // Get current recruiter assignments for transition records
        const currentRecruiterResult = await client.query(
          'SELECT id, "recruiterId", "positionId", "statusId" FROM "Applicant" WHERE id = ANY($1::uuid[])',
          [applicantIds]
        );
        const currentRecruiter = currentRecruiterResult.rows;

        // Check ownership permissions for each Applicant
        const applicantsWithRecruiterPermission = [];
        const applicantsWithoutRecruiterPermission = [];
        
        for (const applicant of currentRecruiter) {
          const recruiterPermission = canAssignRecruiter(session.user, applicant.recruiterId, actingUserId);
          if (recruiterPermission.canAssign) {
            applicantsWithRecruiterPermission.push(applicant);
          } else {
            applicantsWithoutRecruiterPermission.push({
              applicantId: applicant.id,
              reason: recruiterPermission.reason
            });
          }
        }

        // If any Applicants don't have permission, return error
        if (applicantsWithoutRecruiterPermission.length > 0) {
          await client.query('ROLLBACK');
          const deniedApplicants = applicantsWithoutRecruiterPermission.map(c => c.applicantId).join(', ');
          await logAuditWithClient(client, 'WARN', `Bulk recruiter assignment denied for Applicants: ${deniedApplicants} by ${actingUserName}`, 'API:Applicants:BulkAction', actingUserId);
          return NextResponse.json({ 
            message: `Forbidden: You don't have permission to assign recruiters for some Applicants. Denied Applicants: ${deniedApplicants}`,
            deniedApplicants: applicantsWithoutRecruiterPermission
          }, { status: 403 });
        }

        // Use only Applicants with permission
        const applicantsToAssignRecruiter = applicantsWithRecruiterPermission;
        const applicantIdsToAssign = applicantsToAssignRecruiter.map(c => c.id);

        const assignRecruiterResult = await client.query(
          'UPDATE "Applicant" SET "recruiterId" = $1, "updatedAt" = NOW() WHERE id = ANY($2::uuid[]) RETURNING id',
          [newRecruiterId, applicantIdsToAssign]
        );

        // Create transition records for recruiter changes
        for (const applicant of applicantsToAssignRecruiter) {
          if (applicant.recruiterId !== newRecruiterId) {
            const newTransitionId = uuidv4();
            const transitionMessage = newRecruiterId 
              ? `Recruiter assigned: ${newRecruiterId}` 
              : 'Recruiter unassigned';
            
            await client.query(`
              INSERT INTO "TransitionRecord" (id, "applicantId", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
              VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
            `, [
              newTransitionId,
              applicant.id,
              applicant.positionId,
              'Applied', // Use default status since we don't have the actual status name
              transitionMessage,
              actingUserId
            ]);
            
            // Broadcast the updated Applicant with new recruiter
            const updatedApplicant = { ...applicant, recruiterId: newRecruiterId };
            broadcastApplicantUpdate(updatedApplicant, actingUserId);
          }
        }

        result = { updatedCount: assignRecruiterResult.rowCount };
        auditMessage = `Bulk assigned recruiter for ${assignRecruiterResult.rowCount} Applicants`;
        break;

      case 'reprocess':
        // Get Applicants with their attachments and applied positions
        const applicantsResult = await client.query(`
          SELECT 
            c.id,
            c.name,
            c."positionId",
            c."sourceId",
            c."parsedData",
            COALESCE(
              json_agg(
                json_build_object(
                  'id', a.id,
                  'filePath', a."filePath",
                  'fileName', a."fileName",
                  'label', a.label,
                  'isPrimary', a."isPrimary"
                ) ORDER BY 
                  CASE WHEN a.label = 'resume' THEN 1 ELSE 2 END,
                  a."isPrimary" DESC,
                  a."createdAt" ASC
              ) FILTER (WHERE a.id IS NOT NULL),
              '[]'::json
            ) as attachments
          FROM "Applicant" c
          LEFT JOIN "Attachment" a ON c.id = a."applicantId"
          WHERE c.id = ANY($1::uuid[])
          GROUP BY c.id, c.name, c."positionId", c."sourceId", c."parsedData"
        `, [applicantIds]);

        const applicants = applicantsResult.rows;
        const reprocessResults = [];
        const reprocessErrors = [];

        for (const applicant of applicants) {
          try {
            // Find resume file with 'resume' tag, or use first file as fallback
            let selectedAttachment = null;
            const attachments = applicant.attachments || [];
            
            // First, try to find a file with 'resume' tag
            selectedAttachment = attachments.find((att: any) => 
              att.label && att.label.toLowerCase() === 'resume'
            );
            
            // If no resume tag found, use the first file
            if (!selectedAttachment && attachments.length > 0) {
              selectedAttachment = attachments[0];
            }

            if (!selectedAttachment) {
              reprocessErrors.push({
                applicantId: applicant.id,
                applicantName: applicant.name,
                error: 'No attachments found for re-processing'
              });
              continue;
            }

            // Get the applied position ID from parsedData or positionId
            let appliedPositionId = applicant.positionId;
            if (applicant.parsedData && applicant.parsedData.job_applied && applicant.parsedData.job_applied.jobId) {
              appliedPositionId = applicant.parsedData.job_applied.jobId;
            }

            if (!appliedPositionId) {
              reprocessErrors.push({
                applicantId: applicant.id,
                applicantName: applicant.name,
                error: 'No applied position found for re-processing'
              });
              continue;
            }

            // Create reprocess job in upload queue
            const jobId = uuidv4();
            const uploadId = uuidv4();
            
            await client.query(`
              INSERT INTO upload_queue (
                id, file_name, file_size, status, source, upload_id, 
                created_by, file_path, webhook_payload, position_id, source_id, sub_source
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
              jobId,
              selectedAttachment.fileName,
              0, // File size will be determined from MinIO
              'queued',
              'reprocess',
              uploadId,
              actingUserId,
              selectedAttachment.filePath,
              JSON.stringify({
                Applicant_id: applicant.id,
                request_type: 'update',
                source: 'reprocess',
                attachment_id: selectedAttachment.id,
                sourceId: applicant.sourceId
              }),
              appliedPositionId,
              applicant.sourceId,
              null // sub_source is optional and can be null for reprocess jobs
            ]);

            reprocessResults.push({
              applicantId: applicant.id,
              applicantName: applicant.name,
              attachmentName: selectedAttachment.fileName,
              positionId: appliedPositionId,
              jobId: jobId
            });

          } catch (error) {
            console.error(`Error creating reprocess job for applicant ${applicant.id}:`, error);
            reprocessErrors.push({
              applicantId: applicant.id,
              applicantName: applicant.name,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        result = { 
          reprocessedCount: reprocessResults.length,
          errorCount: reprocessErrors.length,
          reprocessResults,
          reprocessErrors
        };
        auditMessage = `Bulk re-processed ${reprocessResults.length} Applicants, ${reprocessErrors.length} failed`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    await client.query('COMMIT');
    
    // Broadcast real-time updates for headcount changes if any occurred
    if (action === 'change_status' && result && 'headcountAssignments' in result && 'autoCloseResults' in result) {
      try {
        const { broadcastPositionListUpdated, broadcastPositionStatisticsUpdated } = await import('@/lib/simple-broadcaster');
        
        // Broadcast position list update (includes headcount changes)
        broadcastPositionListUpdated();
        
        // Broadcast updated statistics
        const statsQuery = `
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN "isOpen" = TRUE THEN 1 END) as open,
            COUNT(CASE WHEN "isOpen" = FALSE THEN 1 END) as closed
          FROM "Position"
        `;
        const statsResult = await client.query(statsQuery);
        const stats = statsResult.rows[0];
        const statistics = { 
          total: parseInt(stats.total, 10), 
          open: parseInt(stats.open, 10), 
          closed: parseInt(stats.closed, 10) 
        };
        broadcastPositionStatisticsUpdated(statistics);
      } catch (broadcastError) {
        console.error('Failed to broadcast real-time updates:', broadcastError);
        // Don't fail the request if broadcasting fails
      }
    }
    
    // OPTIMIZED: Use inline audit logging with same connection
    await logAuditWithClient(client, 'AUDIT', `${auditMessage} by ${actingUserName}.`, 'API:Applicants:BulkAction', actingUserId, { 
      action, 
      applicantIds, 
      result 
    });

    return NextResponse.json({ 
      message: 'Bulk action completed successfully', 
      ...result 
    });

  } catch (error: any) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }
    
    console.error('Bulk action error details:', {
      error: error.message,
      stack: error.stack,
      action: body?.action,
      applicantIds: body?.applicantIds
    });
    
    // OPTIMIZED: Use inline audit logging with same connection
    if (actingUserId && client) {
      try {
        await logAuditWithClient(client, 'ERROR', `Bulk action failed. Error: ${error.message}`, 'API:Applicants:BulkAction', actingUserId, { 
          action: body?.action, 
          applicantIds: body?.applicantIds, 
          input: body 
        });
      } catch (auditError) {
        console.error('Failed to log audit entry:', auditError);
      }
    }
    
    return NextResponse.json({ 
      message: 'Error performing bulk action', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}
