import prisma from './prisma';

/**
 * Get recruitment stage ID by name (case-insensitive)
 */
export async function getRecruitmentStageByName(name: string): Promise<string | null> {
  try {
    const stage = await prisma.recruitmentStage.findFirst({
      where: { 
        name: { 
          equals: name, 
          mode: 'insensitive' 
        } 
      },
      select: { id: true }
    });
    return stage?.id || null;
  } catch (error) {
    console.error(`Error finding recruitment stage by name '${name}':`, error);
    return null;
  }
}

/**
 * Get recruitment stage name by ID
 */
export async function getRecruitmentStageName(id: string): Promise<string | null> {
  try {
    const stage = await prisma.recruitmentStage.findUnique({
      where: { id },
      select: { name: true }
    });
    return stage?.name || null;
  } catch (error) {
    console.error(`Error finding recruitment stage by ID '${id}':`, error);
    return null;
  }
}

/**
 * Get all recruitment stages
 */
export async function getAllRecruitmentStages() {
  try {
    return await prisma.recruitmentStage.findMany({
      orderBy: { sortOrder: 'asc' }
    });
  } catch (error) {
    console.error('Error fetching recruitment stages:', error);
    return [];
  }
}

/**
 * Update candidate status by stage name
 */
export async function updateCandidateStatus(
  candidateId: string, 
  stageName: string
): Promise<void> {
  const stage = await getRecruitmentStageByName(stageName);
  if (!stage) {
    throw new Error(`Recruitment stage '${stageName}' not found`);
  }
  
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: stage }
  });
}

/**
 * Get common stage IDs for frequently used statuses
 */
export async function getCommonStageIds() {
  const stages = await getAllRecruitmentStages();
  
  return {
    applied: stages.find(s => s.name.toLowerCase() === 'applied')?.id,
    screening: stages.find(s => s.name.toLowerCase() === 'screening')?.id,
    shortlisted: stages.find(s => s.name.toLowerCase() === 'shortlisted')?.id,
    interviewScheduled: stages.find(s => s.name.toLowerCase() === 'interview scheduled')?.id,
    interviewing: stages.find(s => s.name.toLowerCase() === 'interviewing')?.id,
    offerExtended: stages.find(s => s.name.toLowerCase() === 'offer extended')?.id,
    hired: stages.find(s => s.name.toLowerCase() === 'hired')?.id,
    onHold: stages.find(s => s.name.toLowerCase() === 'on hold')?.id,
    rejected: stages.find(s => s.name.toLowerCase() === 'rejected')?.id,
  };
}

/**
 * Check if a candidate status matches a specific stage name
 */
export function isCandidateInStage(candidateStatus: string, stageName: string, stageIds: Record<string, string | undefined>): boolean {
  const stageId = stageIds[stageName.toLowerCase() as keyof typeof stageIds];
  return stageId ? candidateStatus === stageId : false;
}

/**
 * Get stage name from candidate status ID
 */
export async function getStageNameFromStatus(statusId: string): Promise<string | null> {
  return await getRecruitmentStageName(statusId);
}
