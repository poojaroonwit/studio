// src/app/api/candidates/bulk-action/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { broadcastCandidateUpdate, broadcastCandidateStatusChanged } from '@/lib/simple-broadcaster';
import { hasAnyPermission } from '@/lib/permissions';

const bulkActionSchema = z.object({
  action: z.enum(['delete', 'change_status', 'assign_recruiter', 'reprocess']),
  candidateIds: z.array(z.string().uuid()).min(1, "At least one candidate ID is required."),
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
async function validateCandidateHiringStatusWithClient(client: any, candidateId: string, positionId: string) {
  try {
    console.log(`Validating headcount for candidate ${candidateId} in position ${positionId}`);
    
    // Check if position has any headcounts
    const headcountsResult = await client.query(
      'SELECT id, status, "candidateId" FROM "Headcount" WHERE "positionId" = $1',
      [positionId]
    );
    const headcounts = headcountsResult.rows;
    
    console.log(`Found ${headcounts.length} headcounts for position ${positionId}:`, headcounts);

    if (headcounts.length === 0) {
      return {
        canHire: false,
        reason: 'NO_HEADCOUNT',
        message: 'This position has no headcount defined. Cannot hire candidate without available headcount.',
        headcountStatus: {
          hasHeadcounts: false,
          totalHeadcounts: 0,
          vacantHeadcounts: 0,
          filledHeadcounts: 0,
        },
      };
    }

    // A headcount is only considered filled if it has status 'filled' AND has a candidate assigned
    const vacantHeadcounts = headcounts.filter((h: any) => h.status === 'vacant' || h.candidateId === null);
    const filledHeadcounts = headcounts.filter((h: any) => h.status === 'filled' && h.candidateId !== null);

    if (vacantHeadcounts.length === 0) {
      return {
        canHire: false,
        reason: 'NO_VACANT_HEADCOUNT',
        message: 'All headcounts for this position are already filled. Cannot hire candidate without available headcount.',
        headcountStatus: {
          hasHeadcounts: true,
          totalHeadcounts: headcounts.length,
          vacantHeadcounts: 0,
          filledHeadcounts: filledHeadcounts.length,
        },
      };
    }

    // Check if candidate is already assigned to a headcount
    const existingAssignment = headcounts.find((h: any) => h.candidateId === candidateId);
    if (existingAssignment) {
      return {
        canHire: true,
        reason: 'ALREADY_ASSIGNED',
        message: 'Candidate is already assigned to a headcount.',
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
    console.error('Error validating candidate hiring status:', error);
    throw error;
  }
}

// OPTIMIZED: Inline headcount assignment using single connection
async function assignCandidateToHeadcountWithClient(client: any, candidateId: string, positionId: string, actingUserId: string, actingUserName: string) {
  try {
    // Find vacant headcount for this position (status is vacant OR no candidate assigned)
    const vacantHeadcountResult = await client.query(
      `SELECT id FROM "Headcount" 
       WHERE "positionId" = $1 AND (status = 'vacant' OR "candidateId" IS NULL)
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

    // Update the headcount to assign this candidate
    await client.query(
      'UPDATE "Headcount" SET status = $1, "candidateId" = $2 WHERE id = $3',
      ['filled', candidateId, vacantHeadcount.id]
    );

    // Check if all headcounts are now filled and auto-close position if needed
    let autoCloseResult = null;
    try {
      const allHeadcountsResult = await client.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status = $1 AND "candidateId" IS NOT NULL THEN 1 END) as filled FROM "Headcount" WHERE "positionId" = $2',
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
      message: 'Candidate automatically assigned to headcount',
      headcountId: vacantHeadcount.id,
      autoCloseResult,
    };
  } catch (error) {
    console.error('Error assigning candidate to headcount:', error);
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
    
    const query = `
      INSERT INTO "LogEntry" (id, timestamp, level, message, source, "actingUserId", details, "createdAt")
      VALUES ($1, NOW(), $2, $3, $4, $5, $6, NOW());
    `;
    await client.query(query, [uuidv4(), level, message, source, sanitizedActingUserId, details]);
  } catch (error) {
    // If the log itself fails, we log to the console as a fallback.
    console.error('CRITICAL: Failed to write to LogEntry table:', error);
    console.error('Fallback Log:', { level, message, source, actingUserId, details });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to manage candidates
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
      hasPermission = hasAnyPermission(session.user, ['CANDIDATES_RECRUITER_ASSIGN']);
      break;
    case 'change_status':
      hasPermission = hasAnyPermission(session.user, ['CANDIDATES_PIPELINE_STAGE_BULK_UPDATE']);
      break;
    case 'delete':
      hasPermission = hasAnyPermission(session.user, ['CANDIDATES_DELETE']);
      break;
    case 'reprocess':
      hasPermission = hasAnyPermission(session.user, ['CANDIDATES_EDIT_BASIC']);
      break;
    default:
      hasPermission = false;
  }
  
  if (!hasPermission) {
    let specificMessage = 'Forbidden: Insufficient permissions to perform this bulk candidate action';
    
    switch (actionType) {
      case 'change_status':
        specificMessage = 'Forbidden: You do not have permission to update candidate status. Please contact your administrator to request the "CANDIDATES_PIPELINE_STAGE_BULK_UPDATE" permission.';
        break;
      case 'assign_recruiter':
        specificMessage = 'Forbidden: You do not have permission to assign recruiters to candidates. Please contact your administrator to request the "CANDIDATES_RECRUITER_ASSIGN" permission.';
        break;
      case 'delete':
        specificMessage = 'Forbidden: You do not have permission to delete candidates. Please contact your administrator to request the "CANDIDATES_DELETE" permission.';
        break;
      case 'reprocess':
        specificMessage = 'Forbidden: You do not have permission to re-process candidates. Please contact your administrator to request the "CANDIDATES_EDIT_BASIC" permission.';
        break;
      default:
        specificMessage = 'Forbidden: You do not have permission to perform this action on candidates. Please contact your administrator.';
    }
    
    return NextResponse.json({ message: specificMessage }, { status: 403 });
  }

  // Validate the request body
  const validationResult = bulkActionSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }

  const { action, candidateIds, newStatus, newRecruiterId, transitionNotes } = validationResult.data;

  // Before using candidateIds in queries, validate:
  const candidateIdsSchema = z.string().uuid().array();
  if (!candidateIdsSchema.safeParse(candidateIds).success) {
    throw new Error('Invalid candidateIds array: must be array of UUID strings');
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
        const deleteResult = await client.query('DELETE FROM "Candidate" WHERE id = ANY($1::uuid[]) RETURNING id', [candidateIds]);
        result = { deletedCount: deleteResult.rowCount };
        auditMessage = `Bulk deleted ${deleteResult.rowCount} candidates`;
        break;

      case 'change_status':
        // Validate that newStatus is a valid UUID that references a RecruitmentStage
        try {
          const statusCheck = await client.query('SELECT id, name FROM "RecruitmentStage" WHERE id = $1::uuid', [newStatus]);
          if (statusCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ message: 'Invalid status: Status must reference a valid recruitment stage' }, { status: 400 });
          }
          console.log(`Status validation passed - status: ${newStatus}`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error('Error validating status:', error);
          return NextResponse.json({ message: 'Error validating status' }, { status: 500 });
        }

        const oldStatusesResult = await client.query('SELECT id, "statusId", "positionId" FROM "Candidate" WHERE id = ANY($1::uuid[])', [candidateIds]);
        const oldStatuses = oldStatusesResult.rows;
        
        // Get the stage name for comparison
        const stageResult = await client.query('SELECT name FROM "RecruitmentStage" WHERE id = $1::uuid', [newStatus]);
        const stageName = stageResult.rows[0]?.name;
        
        // If changing to "Hired" status, validate headcount availability for each candidate
        const headcountValidationResults = [];
        const candidatesToUpdate = [];
        const candidatesToReject = [];
        
        if (stageName === 'Hired') {
          for (const candidate of oldStatuses) {
            if (candidate.statusId !== newStatus && candidate.positionId) {
              try {
                // OPTIMIZED: Use inline validation with same connection
                const validation = await validateCandidateHiringStatusWithClient(client, candidate.id, candidate.positionId);
                if (validation.canHire) {
                  candidatesToUpdate.push(candidate);
                  headcountValidationResults.push({
                    candidateId: candidate.id,
                    validation,
                    willAutoAssign: validation.reason === 'VACANT_HEADCOUNT_AVAILABLE'
                  });
                } else {
                  candidatesToReject.push({
                    candidateId: candidate.id,
                    reason: validation.reason,
                    message: validation.message,
                    headcountStatus: validation.headcountStatus
                  });
                }
              } catch (error) {
                console.error(`Error validating headcount for candidate ${candidate.id}:`, error);
                
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
                
                candidatesToReject.push({
                  candidateId: candidate.id,
                  reason: errorReason,
                  message: errorMessage,
                  headcountStatus: null,
                  originalError: error instanceof Error ? error.message : String(error)
                });
              }
            } else if (candidate.statusId !== newStatus) {
              // Candidate has no position, cannot be hired
              candidatesToReject.push({
                candidateId: candidate.id,
                reason: 'NO_POSITION',
                message: 'Candidate must be assigned to a position to be hired'
              });
            } else {
              // Status is already "Hired", no change needed
              candidatesToUpdate.push(candidate);
            }
          }
        } else {
          // For non-"Hired" status changes, update all candidates
          candidatesToUpdate.push(...oldStatuses);
        }
        
        // Update candidates that passed validation
        if (candidatesToUpdate.length > 0) {
          const candidateIdsToUpdate = candidatesToUpdate.map(c => c.id);
          const updateStatusResult = await client.query(
            'UPDATE "Candidate" SET "statusId" = $1, "updatedAt" = NOW() WHERE id = ANY($2::uuid[]) RETURNING id',
            [newStatus, candidateIdsToUpdate]
          );

          // Create transition records and handle headcount assignments for status changes
          for (const candidate of candidatesToUpdate) {
            if (candidate.statusId !== newStatus) {
              const newTransitionId = uuidv4();
              await client.query(
                'INSERT INTO "TransitionRecord" (id, "candidateId", stage, notes, "actingUserId", date, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())',
                [newTransitionId, candidate.id, newStatus, transitionNotes || null, actingUserId]
              );
              
              // Get the created transition record to broadcast
              const getTransitionQuery = 'SELECT * FROM "TransitionRecord" WHERE id = $1';
              const transitionResult = await client.query(getTransitionQuery, [newTransitionId]);
              if (transitionResult.rows.length > 0) {
                const newTransition = transitionResult.rows[0];
                // Broadcast the updated candidate with new status
                const updatedCandidate = { ...candidate, status: newStatus };
                broadcastCandidateUpdate(updatedCandidate, actingUserId);
                
                // Also broadcast status change
                if (candidate.statusId) {
                  broadcastCandidateStatusChanged(updatedCandidate, candidate.statusId, String(newStatus), actingUserId);
                }
              }
            }
          }
        }

        // Handle headcount assignments for candidates changing to "Hired" status
        const headcountAssignmentResults = [];
        const autoCloseResults = [];
        if (stageName === 'Hired') {
          for (const result of headcountValidationResults) {
            if (result.willAutoAssign) {
              try {
                // Double-check headcount availability right before assignment to prevent race conditions
                const positionId = candidatesToUpdate.find(c => c.id === result.candidateId)?.positionId!;
                const revalidation = await validateCandidateHiringStatusWithClient(client, result.candidateId, positionId);
                
                if (!revalidation.canHire) {
                  // Headcount became unavailable between validation and assignment
                  console.warn(`Race condition detected: Headcount became unavailable for candidate ${result.candidateId} during assignment. Rejecting candidate.`, {
                    candidateId: result.candidateId,
                    positionId,
                    originalValidation: result.validation,
                    revalidation,
                    timestamp: new Date().toISOString()
                  });
                  candidatesToReject.push({
                    candidateId: result.candidateId,
                    reason: revalidation.reason,
                    message: `Headcount became unavailable: ${revalidation.message}`,
                    headcountStatus: revalidation.headcountStatus
                  });
                  
                  // Remove from candidatesToUpdate since we can't proceed
                  const rejectIndex = candidatesToUpdate.findIndex(c => c.id === result.candidateId);
                  if (rejectIndex !== -1) {
                    candidatesToUpdate.splice(rejectIndex, 1);
                  }
                  
                  continue;
                }
                
                // OPTIMIZED: Use inline assignment with same connection
                const assignmentResult = await assignCandidateToHeadcountWithClient(
                  client,
                  result.candidateId,
                  positionId,
                  actingUserId,
                  actingUserName
                );
                headcountAssignmentResults.push({
                  candidateId: result.candidateId,
                  success: assignmentResult.success,
                  message: assignmentResult.message,
                  headcountId: assignmentResult.headcountId
                });

                // Check if position should be auto-closed after headcount assignment
                if (assignmentResult.success && assignmentResult.autoCloseResult) {
                  autoCloseResults.push({
                    candidateId: result.candidateId,
                    positionId: candidatesToUpdate.find(c => c.id === result.candidateId)?.positionId!,
                    autoCloseResult: assignmentResult.autoCloseResult
                  });
                }
              } catch (error) {
                console.error(`Error assigning headcount for candidate ${result.candidateId}:`, error);
                headcountAssignmentResults.push({
                  candidateId: result.candidateId,
                  success: false,
                  message: 'Error assigning headcount'
                });
              }
            }
          }
        }

        // Update counts after potential race condition rejections
        const finalUpdatedCount = candidatesToUpdate.length;
        const finalRejectedCount = candidatesToReject.length;
        
        result = { 
          updatedCount: finalUpdatedCount,
          rejectedCount: finalRejectedCount,
          headcountAssignments: headcountAssignmentResults,
          autoCloseResults: autoCloseResults,
          rejectedCandidates: candidatesToReject
        };
        
        const successMessage = `Updated status to ${newStatus} for ${candidatesToUpdate.length} candidates`;
        const rejectMessage = candidatesToReject.length > 0 ? `, rejected ${candidatesToReject.length} candidates due to headcount constraints` : '';
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
          'SELECT id, "recruiterId", "positionId", "statusId" FROM "Candidate" WHERE id = ANY($1::uuid[])',
          [candidateIds]
        );
        const currentRecruiter = currentRecruiterResult.rows;

        const assignRecruiterResult = await client.query(
          'UPDATE "Candidate" SET "recruiterId" = $1, "updatedAt" = NOW() WHERE id = ANY($2::uuid[]) RETURNING id',
          [newRecruiterId, candidateIds]
        );

        // Create transition records for recruiter changes
        for (const candidate of currentRecruiter) {
          if (candidate.recruiterId !== newRecruiterId) {
            const newTransitionId = uuidv4();
            const transitionMessage = newRecruiterId 
              ? `Recruiter assigned: ${newRecruiterId}` 
              : 'Recruiter unassigned';
            
            await client.query(`
              INSERT INTO "TransitionRecord" (id, "candidateId", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
              VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
            `, [
              newTransitionId,
              candidate.id,
              candidate.positionId,
              'Applied', // Use default status since we don't have the actual status name
              transitionMessage,
              actingUserId
            ]);
            
            // Broadcast the updated candidate with new recruiter
            const updatedCandidate = { ...candidate, recruiterId: newRecruiterId };
            broadcastCandidateUpdate(updatedCandidate, actingUserId);
          }
        }

        result = { updatedCount: assignRecruiterResult.rowCount };
        auditMessage = `Bulk assigned recruiter for ${assignRecruiterResult.rowCount} candidates`;
        break;

      case 'reprocess':
        // Get candidates with their attachments and applied positions
        const candidatesResult = await client.query(`
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
          FROM "Candidate" c
          LEFT JOIN "Attachment" a ON c.id = a."candidateId"
          WHERE c.id = ANY($1::uuid[])
          GROUP BY c.id, c.name, c."positionId", c."sourceId", c."parsedData"
        `, [candidateIds]);

        const candidates = candidatesResult.rows;
        const reprocessResults = [];
        const reprocessErrors = [];

        for (const candidate of candidates) {
          try {
            // Find resume file with 'resume' tag, or use first file as fallback
            let selectedAttachment = null;
            const attachments = candidate.attachments || [];
            
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
                candidateId: candidate.id,
                candidateName: candidate.name,
                error: 'No attachments found for re-processing'
              });
              continue;
            }

            // Get the applied position ID from parsedData or positionId
            let appliedPositionId = candidate.positionId;
            if (candidate.parsedData && candidate.parsedData.job_applied && candidate.parsedData.job_applied.jobId) {
              appliedPositionId = candidate.parsedData.job_applied.jobId;
            }

            if (!appliedPositionId) {
              reprocessErrors.push({
                candidateId: candidate.id,
                candidateName: candidate.name,
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
                candidate_id: candidate.id,
                request_type: 'update',
                source: 'reprocess',
                attachment_id: selectedAttachment.id,
                sourceId: candidate.sourceId
              }),
              appliedPositionId,
              candidate.sourceId,
              null // sub_source is optional and can be null for reprocess jobs
            ]);

            reprocessResults.push({
              candidateId: candidate.id,
              candidateName: candidate.name,
              attachmentName: selectedAttachment.fileName,
              positionId: appliedPositionId,
              jobId: jobId
            });

          } catch (error) {
            console.error(`Error creating reprocess job for candidate ${candidate.id}:`, error);
            reprocessErrors.push({
              candidateId: candidate.id,
              candidateName: candidate.name,
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
        auditMessage = `Bulk re-processed ${reprocessResults.length} candidates, ${reprocessErrors.length} failed`;
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
    await logAuditWithClient(client, 'AUDIT', `${auditMessage} by ${actingUserName}.`, 'API:Candidates:BulkAction', actingUserId, { 
      action, 
      candidateIds, 
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
      candidateIds: body?.candidateIds
    });
    
    // OPTIMIZED: Use inline audit logging with same connection
    if (actingUserId && client) {
      try {
        await logAuditWithClient(client, 'ERROR', `Bulk action failed. Error: ${error.message}`, 'API:Candidates:BulkAction', actingUserId, { 
          action: body?.action, 
          candidateIds: body?.candidateIds, 
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
