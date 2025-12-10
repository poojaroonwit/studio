import prisma from './prisma';

/**
 * Get recruitment stage ID by name (case-insensitive)
 * @server-only This function uses Prisma and should only be called on the server side
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
 * @server-only This function uses Prisma and should only be called on the server side
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
 * Get recruitment stage names by IDs (client-side safe)
 * This function uses the API endpoint and can be called from client components
 */
export async function getRecruitmentStageNamesByIds(ids: string[]): Promise<Record<string, string>> {
  try {
    if (ids.length === 0) return {};

    const response = await fetch(`/api/settings/recruitment-stages?ids=${ids.join(',')}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stage names: ${response.statusText}`);
    }

    const stages = await response.json();
    const nameMap: Record<string, string> = {};
    stages.forEach((stage: any) => {
      nameMap[stage.id] = stage.name;
    });

    return nameMap;
  } catch (error) {
    console.error('Error fetching recruitment stage names:', error);
    return {};
  }
}

/**
 * Get recruitment stage name by ID (client-side safe)
 * This function uses the API endpoint and can be called from client components
 */
export async function getRecruitmentStageNameClient(id: string): Promise<string | null> {
  try {
    const nameMap = await getRecruitmentStageNamesByIds([id]);
    return nameMap[id] || null;
  } catch (error) {
    console.error(`Error finding recruitment stage name by ID '${id}':`, error);
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
    data: { statusId: stage }
  });
}

/**
 * Get common stage IDs for frequently used statuses
 */
export async function getCommonStageIds() {
  const stages = await getAllRecruitmentStages();

  return {
    applied: stages.find((s: any) => s.name.toLowerCase() === 'applied')?.id,
    screening: stages.find((s: any) => s.name.toLowerCase() === 'screening')?.id,
    shortlisted: stages.find((s: any) => s.name.toLowerCase() === 'shortlisted')?.id,
    interviewScheduled: stages.find((s: any) => s.name.toLowerCase() === 'interview scheduled')?.id,
    interviewing: stages.find((s: any) => s.name.toLowerCase() === 'interviewing')?.id,
    offerExtended: stages.find((s: any) => s.name.toLowerCase() === 'offer extended')?.id,
    hired: stages.find((s: any) => s.name.toLowerCase() === 'hired')?.id,
    onHold: stages.find((s: any) => s.name.toLowerCase() === 'on hold')?.id,
    rejected: stages.find((s: any) => s.name.toLowerCase() === 'rejected')?.id,
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
