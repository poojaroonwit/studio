import {
  assignApplicantToHeadcountWithClient,
  validateApplicantHiringStatusWithClient,
} from './bulk-action-route-utils';
import type { BulkActionExecutionContext } from './bulk-action-route-types';
import type {
  ApplicantPermissionRow,
  HeadcountValidationResult,
} from './bulk-action-route-status-types';

export async function assignHeadcountsForHiredApplicants(
  context: BulkActionExecutionContext,
  applicantsToUpdate: ApplicantPermissionRow[],
  applicantsToReject: Record<string, unknown>[],
  headcountValidationResults: HeadcountValidationResult[],
  stageName: string | undefined
) {
  const { client } = context;
  const headcountAssignmentResults: Record<string, unknown>[] = [];
  const autoCloseResults: Record<string, unknown>[] = [];

  if (stageName !== 'Hired') {
    return { headcountAssignmentResults, autoCloseResults };
  }

  for (const result of headcountValidationResults) {
    if (!result.willAutoAssign) {
      continue;
    }

    try {
      const positionId = applicantsToUpdate.find((applicant) => applicant.id === result.applicantId)?.positionId;
      if (!positionId) {
        continue;
      }

      const assignmentAllowed = await revalidateHeadcountBeforeAssignment({
        client,
        result,
        positionId,
        applicantsToUpdate,
        applicantsToReject,
      });
      if (!assignmentAllowed) {
        continue;
      }

      const assignmentResult = await assignApplicantToHeadcountWithClient(client, result.applicantId, positionId);
      headcountAssignmentResults.push({
        applicantId: result.applicantId,
        success: assignmentResult.success,
        message: assignmentResult.message,
        headcountId: assignmentResult.headcountId,
      });

      if (assignmentResult.success && assignmentResult.autoCloseResult) {
        autoCloseResults.push({
          applicantId: result.applicantId,
          positionId,
          autoCloseResult: assignmentResult.autoCloseResult,
        });
      }
    } catch (error) {
      console.error(`Error assigning headcount for Applicant ${result.applicantId}:`, error);
      headcountAssignmentResults.push({
        applicantId: result.applicantId,
        success: false,
        message: 'Error assigning headcount',
      });
    }
  }

  return { headcountAssignmentResults, autoCloseResults };
}

async function revalidateHeadcountBeforeAssignment({
  client,
  result,
  positionId,
  applicantsToUpdate,
  applicantsToReject,
}: {
  client: BulkActionExecutionContext['client'];
  result: HeadcountValidationResult;
  positionId: string;
  applicantsToUpdate: ApplicantPermissionRow[];
  applicantsToReject: Record<string, unknown>[];
}) {
  const revalidation = await validateApplicantHiringStatusWithClient(client, result.applicantId, positionId);
  if (revalidation.canHire) {
    return true;
  }

  console.warn(`Race condition detected: Headcount became unavailable for Applicant ${result.applicantId} during assignment. Rejecting Applicant.`, {
    applicantId: result.applicantId,
    positionId,
    originalValidation: result.validation,
    revalidation,
    timestamp: new Date().toISOString(),
  });

  applicantsToReject.push({
    applicantId: result.applicantId,
    reason: revalidation.reason,
    message: `Headcount became unavailable: ${revalidation.message}`,
    headcountStatus: revalidation.headcountStatus,
  });

  const rejectIndex = applicantsToUpdate.findIndex((applicant) => applicant.id === result.applicantId);
  if (rejectIndex !== -1) {
    applicantsToUpdate.splice(rejectIndex, 1);
  }

  return false;
}
