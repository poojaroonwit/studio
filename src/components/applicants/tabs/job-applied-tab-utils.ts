import type { Applicant, Position } from '@/lib/types';

export const JOB_APPLIED_EMPTY_SELECT_VALUE = '__NONE__';

export interface JobAppliedNamedEntity {
  id: string;
  name: string;
}

interface JobAppliedAssignmentInput {
  applicant: Pick<Applicant, 'statusId' | 'recruiterId' | 'sourceId'>;
  stages: readonly JobAppliedNamedEntity[];
  recruiters: readonly JobAppliedNamedEntity[];
  sources: readonly JobAppliedNamedEntity[];
}

export function toJobAppliedSelectValue(value: string | null | undefined) {
  return value || JOB_APPLIED_EMPTY_SELECT_VALUE;
}

export function fromJobAppliedSelectValue(value: string) {
  return value === JOB_APPLIED_EMPTY_SELECT_VALUE ? '' : value;
}

export function toNullableJobAppliedId(value: string | null | undefined) {
  return value ? value : null;
}

export function parseExpectedSalaryInput(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number.parseFloat(trimmedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function getAppliedPosition(positions: Position[], appliedJobId: string | null) {
  if (!appliedJobId || !Array.isArray(positions)) {
    return null;
  }

  return positions.find(position => position.id === appliedJobId) || null;
}

export function getJobAppliedAssignments({
  applicant,
  stages,
  recruiters,
  sources,
}: JobAppliedAssignmentInput) {
  return {
    currentStage: stages.find(stage => stage.id === applicant.statusId) || null,
    currentRecruiter: recruiters.find(recruiter => recruiter.id === applicant.recruiterId) || null,
    currentSource: sources.find(source => source.id === applicant.sourceId) || null,
  };
}

export function formatJobAppliedExpectedSalary(salary: number | null | undefined) {
  return typeof salary === 'number' && Number.isFinite(salary)
    ? `THB ${salary.toLocaleString()}`
    : 'N/A';
}

export function getNonEmptyJobAppliedJustifications(justifications: readonly string[]) {
  return justifications
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

export function getInitialJobAppliedEditState(applicant: Applicant) {
  return {
    status: applicant.statusId || '',
    recruiterId: applicant.recruiterId || '',
    sourceId: applicant.sourceId || '',
    salary: applicant.expectedSalary?.toString() || '',
  };
}

export async function runJobAppliedDialogUpdate({
  update,
  setIsUpdating,
  updateFormValue,
  closeDialog,
  onRefresh,
  showSuccess,
  showError,
  successMessage,
  fallbackErrorMessage,
}: {
  update: () => Promise<unknown>;
  setIsUpdating: (isUpdating: boolean) => void;
  updateFormValue?: () => void;
  closeDialog: () => void;
  onRefresh?: () => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  successMessage: string;
  fallbackErrorMessage: string;
}) {
  setIsUpdating(true);
  try {
    await update();
    updateFormValue?.();
    showSuccess(successMessage);
    closeDialog();
    onRefresh?.();
  } catch (error) {
    showError(error instanceof Error && error.message ? error.message : fallbackErrorMessage);
  } finally {
    setIsUpdating(false);
  }
}
