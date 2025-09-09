import type { Position, Grade } from '@/lib/types';
import { getPool } from '@/lib/db';

export interface SLACheckResult {
  isViolated: boolean;
  daysOverdue: number;
  slaDays: number;
  gradeName: string;
  gradeColor: string;
}

export async function checkSLAViolation(position: Position): Promise<SLACheckResult | null> {
  if (!position.grade) {
    return null;
  }

  const effectiveStartDate = await getEffectiveSLAStartDate(position);
  if (!effectiveStartDate) {
    return null;
  }

  const currentDate = new Date();
  const slaDays = position.grade.slaDays;
  
  // Calculate the target completion date
  const targetDate = new Date(effectiveStartDate);
  targetDate.setDate(targetDate.getDate() + slaDays);
  
  // Check if current date is past the target date
  const isViolated = currentDate > targetDate;
  const daysOverdue = isViolated 
    ? Math.floor((currentDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    isViolated,
    daysOverdue,
    slaDays,
    gradeName: position.grade.name,
    gradeColor: position.grade.color || '#3B82F6',
  };
}

export async function getSLARemainingDays(position: Position): Promise<number | null> {
  if (!position.grade) {
    return null;
  }

  const effectiveStartDate = await getEffectiveSLAStartDate(position);
  if (!effectiveStartDate) {
    return null;
  }

  const targetDate = new Date(effectiveStartDate);
  targetDate.setDate(targetDate.getDate() + position.grade.slaDays);
  const currentDate = new Date();
  const diffMs = targetDate.getTime() - currentDate.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getSLABadgeVariant(daysOverdue: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (daysOverdue === 0) return 'default';
  if (daysOverdue <= 7) return 'secondary';
  if (daysOverdue <= 30) return 'outline';
  return 'destructive';
}

export function formatSLAMessage(slaResult: SLACheckResult): string {
  if (!slaResult.isViolated) {
    return `${slaResult.gradeName} - ${slaResult.slaDays} days SLA`;
  }
  
  return `${slaResult.gradeName} - ${slaResult.daysOverdue} days overdue (${slaResult.slaDays} days SLA)`;
}

/**
 * Get the latest hired date for a position when all headcounts are filled
 * @param positionId - The position ID to check
 * @returns The latest hired date or null if not all headcounts are filled
 */
export async function getLatestHiredDateForPosition(positionId: string): Promise<Date | null> {
  const client = await getPool().connect();
  try {
    // First check if all headcounts are filled
    const headcountsQuery = `
      SELECT id, status, "candidateId"
      FROM "Headcount"
      WHERE "positionId" = $1
    `;
    const headcountsResult = await client.query(headcountsQuery, [positionId]);
    const headcounts = headcountsResult.rows;

    if (headcounts.length === 0) {
      return null;
    }

    // Check if all headcounts are filled
    const filledHeadcounts = headcounts.filter(h => h.status === 'filled' && h.candidateId !== null);
    const vacantHeadcounts = headcounts.filter(h => h.status === 'vacant' || h.candidateId === null);
    
    // If there are still vacant headcounts, return null
    if (vacantHeadcounts.length > 0) {
      return null;
    }

    // Get the latest hired date from transition records for candidates in this position
    const latestHiredQuery = `
      SELECT tr.date
      FROM "TransitionRecord" tr
      JOIN "Candidate" c ON tr."candidateId" = c.id
      WHERE tr."positionId" = $1
        AND tr.stage = 'Hired'
        AND c."positionId" = $1
      ORDER BY tr.date DESC
      LIMIT 1
    `;
    const latestHiredResult = await client.query(latestHiredQuery, [positionId]);

    return latestHiredResult.rows[0]?.date || null;
  } catch (error) {
    console.error('Error getting latest hired date for position:', error);
    return null;
  } finally {
    client.release();
  }
}

/**
 * Get the effective SLA start date for a position
 * If all headcounts are filled, use the latest hired date
 * Otherwise, use the position request date (requestDate)
 * @param position - The position object
 * @returns The effective SLA start date or null
 */
export async function getEffectiveSLAStartDate(position: Position): Promise<Date | null> {
  if (!position.requestDate) {
    return null;
  }

  // If position has no ID (e.g., in some contexts), just use requestDate
  if (!position.id) {
    return new Date(position.requestDate);
  }

  try {
    const latestHiredDate = await getLatestHiredDateForPosition(position.id);
    
    // If all headcounts are filled and we have a latest hired date, use it
    if (latestHiredDate) {
      return latestHiredDate;
    }
    
    // Otherwise, use the position request date
    return new Date(position.requestDate);
  } catch (error) {
    console.error('Error getting effective SLA start date:', error);
    // Fallback to position request date
    return new Date(position.requestDate);
  }
}
