import { safeJsonParse } from '../../lib/utils/core';
import type { Applicant, Position, RecruitmentStage } from '../../lib/types';
import type { CandidateApplicantRow, CandidatePositionRow, CandidateStageRow, DbDateValue } from './candidate-page-types';

export function toCandidateIsoString(value: DbDateValue) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.trim() !== '') return value;
  return new Date().toISOString();
}

export function toOptionalCandidateIsoString(value: DbDateValue) {
  if (!value) return undefined;
  return toCandidateIsoString(value);
}

export function getCandidatePageErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function mapCandidateApplicantRow(row: CandidateApplicantRow): Applicant {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || null,
    statusId: row.statusId || '',
    status: row.status,
    positionId: row.positionId || null,
    recruiterId: row.recruiterId || null,
    sourceId: row.sourceId || null,
    fitScore: row.fitScore || 0,
    applicationDate: toCandidateIsoString(row.applicationDate),
    updatedAt: toOptionalCandidateIsoString(row.updatedAt),
    parsedData: safeJsonParse(row.parsedData, {}),
    position: row.positionId && row.positionTitle ? {
      id: row.positionId,
      title: row.positionTitle,
      department: '',
      isOpen: true,
    } : null,
    recruiter: row.recruiterId && row.recruiterName ? {
      id: row.recruiterId,
      name: row.recruiterName,
      email: '',
    } : null,
    source: row.sourceId && row.sourceName ? {
      id: row.sourceId,
      name: row.sourceName,
      allowSubSource: false,
      sortOrder: 0,
      isActive: true,
    } : null,
    isBlacklisted: row.isBlacklisted || false,
    transitionHistory: [],
    jobMatches: [],
  };
}

export function mapCandidatePositionRow(row: CandidatePositionRow): Position {
  return {
    id: row.id,
    title: row.title,
    department: row.department || '',
    isOpen: row.isOpen !== false,
    createdAt: toOptionalCandidateIsoString(row.createdAt),
    updatedAt: toOptionalCandidateIsoString(row.updatedAt),
    recruiterName: row.recruiterName,
    grade: row.gradeName ? {
      id: '',
      name: row.gradeName,
      minLevel: 0,
      maxLevel: 0,
      slaDays: row.gradeSlaDays || 0,
      color: row.gradeColor || null,
      isActive: true,
      sortOrder: 0,
    } : null,
    customAttributes: {},
  };
}

export function mapCandidateStageRow(row: CandidateStageRow): RecruitmentStage {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder ?? row.sort_order ?? null,
    isSystem: row.isSystem || false,
    color_complete: row.color,
    color_badge: row.color_badge,
    description: row.description,
    createdAt: toOptionalCandidateIsoString(row.createdAt),
    updatedAt: toOptionalCandidateIsoString(row.updatedAt),
  };
}

export function mapCandidateRows({
  applicants,
  positions,
  stages,
}: {
  applicants: CandidateApplicantRow[];
  positions: CandidatePositionRow[];
  stages: CandidateStageRow[];
}) {
  return {
    initialApplicants: applicants.map(mapCandidateApplicantRow),
    initialAvailablePositions: positions.map(mapCandidatePositionRow),
    initialAvailableStages: stages.map(mapCandidateStageRow),
  };
}
