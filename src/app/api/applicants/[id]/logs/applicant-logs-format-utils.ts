import type { Prisma } from '@prisma/client';

export type TransitionActivityRow = Prisma.TransitionRecordGetPayload<{
  include: {
    actingUser: true;
  };
}>;

export type ResumeActivityRow = Prisma.AttachmentGetPayload<{
  include: {
    uploadedBy: true;
  };
}>;

export type RecruitmentStageRow = {
  id: string;
  name: string;
};

export type ApplicantActivityLog = {
  id: string;
  action: string;
  user: string;
  time: Date;
  note: string;
  stage?: string;
};

export interface ApplicantLogsPagination {
  limit: number;
  offset: number;
}

export function createApplicantStageNameMap(stages: RecruitmentStageRow[]) {
  return new Map(stages.map((stage) => [stage.id, stage.name]));
}

function getStageName(stageIdToName: Map<string, string>, stageId: string) {
  return stageIdToName.get(stageId) || stageId;
}

export function getTransitionActivityNote({
  currentStage,
  notes,
  previousStage,
  stageIdToName,
}: {
  currentStage: string;
  notes?: string | null;
  previousStage?: string | null;
  stageIdToName: Map<string, string>;
}) {
  const currentStageName = getStageName(stageIdToName, currentStage);
  const previousStageName = previousStage ? getStageName(stageIdToName, previousStage) : null;
  const moveNote = previousStage && previousStage !== currentStage
    ? `Moved from ${previousStageName} to ${currentStageName} stage.`
    : `Entered ${currentStageName} stage.`;
  const trimmedNotes = notes?.trim();

  return trimmedNotes ? `${moveNote} Note: ${trimmedNotes}` : moveNote;
}

export function getTransitionActivityLogs(
  transitions: TransitionActivityRow[],
  stageIdToName: Map<string, string>,
): ApplicantActivityLog[] {
  return transitions.map((transition, index, rows) => ({
    id: transition.id,
    action: 'Stage changed',
    user: transition.actingUser?.name || 'System',
    time: transition.date,
    note: getTransitionActivityNote({
      currentStage: transition.stage,
      notes: transition.notes,
      previousStage: rows[index + 1]?.stage,
      stageIdToName,
    }),
    stage: transition.stage,
  }));
}

export function getResumeActivityLogs(resumes: ResumeActivityRow[]): ApplicantActivityLog[] {
  return resumes.map((resume) => ({
    id: resume.id,
    action: 'Resume uploaded',
    user: resume.uploadedBy?.name || 'Unknown',
    time: resume.uploadedAt,
    note: resume.fileName,
  }));
}

export function compareApplicantActivityLogsByNewest(a: ApplicantActivityLog, b: ApplicantActivityLog) {
  const dateA = new Date(a.time);
  const dateB = new Date(b.time);

  if (Number.isNaN(dateA.getTime()) || Number.isNaN(dateB.getTime())) {
    return 0;
  }

  return dateB.getTime() - dateA.getTime();
}

export function getApplicantActivityLogs({
  recruitmentStages,
  resumes,
  transitions,
}: {
  recruitmentStages: RecruitmentStageRow[];
  resumes: ResumeActivityRow[];
  transitions: TransitionActivityRow[];
}) {
  const stageIdToName = createApplicantStageNameMap(recruitmentStages);
  return [
    ...getTransitionActivityLogs(transitions, stageIdToName),
    ...getResumeActivityLogs(resumes),
  ].sort(compareApplicantActivityLogsByNewest);
}

export function getApplicantActivityLogsPage(logs: ApplicantActivityLog[], { limit, offset }: ApplicantLogsPagination) {
  return {
    data: logs.slice(offset, offset + limit),
    pagination: {
      limit,
      offset,
      hasMore: offset + limit < logs.length,
      total: logs.length,
    },
  };
}
