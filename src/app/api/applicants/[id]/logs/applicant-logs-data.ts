import prisma from '@/lib/prisma';
import { getApplicantActivityLogs } from './applicant-logs-format-utils';

export async function fetchApplicantActivityLogs(applicantId: string) {
  const applicant = await prisma.applicant.findUnique({ where: { id: applicantId }, select: { id: true } });
  if (!applicant) {
    return null;
  }

  const [transitions, recruitmentStages, resumes] = await Promise.all([
    prisma.transitionRecord.findMany({
      where: { applicantId },
      orderBy: { date: 'desc' },
      include: { actingUser: true },
    }),
    prisma.recruitmentStage.findMany({
      select: { id: true, name: true },
    }),
    prisma.attachment.findMany({
      where: { applicantId, label: 'resume' },
      orderBy: { uploadedAt: 'desc' },
      include: { uploadedBy: true },
    }),
  ]);

  return getApplicantActivityLogs({ recruitmentStages, resumes, transitions });
}
