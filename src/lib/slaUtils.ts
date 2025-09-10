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

export function getSLABadgeVariant(daysOverdue: number): 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' {
  if (daysOverdue === 0) return 'default';
  // Any overdue SLA should show as red (destructive)
  if (daysOverdue > 0) return 'destructive';
  return 'default';
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
 * Get the earliest request date for a position across all its headcounts
 * @param positionId - The position ID
 * @returns The earliest request date or null if no headcounts have request dates
 */
export async function getEarliestRequestDateForPosition(positionId: string): Promise<Date | null> {
  try {
    const client = await getPool().connect();
    try {
      const query = `
        SELECT MIN(h."requestDate") as earliest_request_date
        FROM "Headcount" h
        WHERE h."positionId" = $1 
        AND h."requestDate" IS NOT NULL
      `;
      
      const result = await client.query(query, [positionId]);
      const earliestRequestDate = result.rows[0]?.earliest_request_date;
      
      return earliestRequestDate ? new Date(earliestRequestDate) : null;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting earliest request date for position:', error);
    return null;
  }
}

/**
 * Check SLA violation for a specific headcount
 * For vacant headcounts: Calculate (now - request_date) and compare with grade SLA
 * For filled headcounts: Calculate (hired_date - request_date) and compare with grade SLA
 * @param headcount - The headcount object with position grade information
 * @returns SLA violation result or null
 */
export async function checkSLAViolationForHeadcount(headcount: any): Promise<any> {
  if (!headcount.requestDate) {
    return null;
  }

  // Get the grade SLA days from the position
  const grade = headcount.position?.grade;
  if (!grade || !grade.slaDays) {
    return null;
  }

  const requestDate = new Date(headcount.requestDate);
  let endDate: Date;
  let calculationType: string;

  if (headcount.status === 'filled' && headcount.candidateId) {
    // For filled headcounts: use hired date
    const hiredDate = await getHiredDateForHeadcount(headcount);
    if (!hiredDate) {
      // If no hired date found, fall back to current date
      endDate = new Date();
      calculationType = 'filled_no_hired_date';
    } else {
      endDate = hiredDate;
      calculationType = 'filled_with_hired_date';
    }
  } else {
    // For vacant headcounts: use current date
    endDate = new Date();
    calculationType = 'vacant';
  }

  const daysDiff = Math.floor((endDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
  const isViolated = daysDiff > grade.slaDays;

  return {
    isViolated,
    daysOverdue: isViolated ? daysDiff - grade.slaDays : 0,
    daysRemaining: isViolated ? 0 : grade.slaDays - daysDiff,
    slaDays: grade.slaDays,
    gradeName: grade.name,
    requestDate: requestDate.toISOString(),
    endDate: endDate.toISOString(),
    calculationType,
    daysElapsed: daysDiff
  };
}

/**
 * Get SLA remaining days for a specific headcount
 * @param headcount - The headcount object with position grade information
 * @returns Number of days remaining or null
 */
export async function getSLARemainingDaysForHeadcount(headcount: any): Promise<number | null> {
  const violationResult = await checkSLAViolationForHeadcount(headcount);
  return violationResult ? violationResult.daysRemaining : null;
}

/**
 * Get the hired date for a specific headcount's candidate
 * @param headcount - The headcount object with candidateId
 * @returns The hired date or null if not found
 */
export async function getHiredDateForHeadcount(headcount: any): Promise<Date | null> {
  if (!headcount.candidateId) {
    return null;
  }

  const client = await getPool().connect();
  try {
    const query = `
      SELECT tr.date
      FROM "TransitionRecord" tr
      WHERE tr."candidateId" = $1
        AND tr.stage = 'Hired'
      ORDER BY tr.date DESC
      LIMIT 1
    `;
    
    const result = await client.query(query, [headcount.candidateId]);
    return result.rows[0]?.date || null;
  } catch (error) {
    console.error('Error getting hired date for headcount:', error);
    return null;
  } finally {
    client.release();
  }
}

/**
 * Get the effective SLA start date for a headcount
 * For filled headcounts, use the onboarding date
 * For vacant headcounts, use the request date
 * @param headcount - The headcount object
 * @returns The effective SLA start date or null
 */
export function getEffectiveSLAStartDateForHeadcount(headcount: any): Date | null {
  // If headcount is filled and has onboarding date, use that
  if (headcount.status === 'filled' && headcount.onboardingDate) {
    return new Date(headcount.onboardingDate);
  }
  
  // Otherwise, use the request date
  if (headcount.requestDate) {
    return new Date(headcount.requestDate);
  }
  
  return null;
}

/**
 * Get the effective SLA start date for a position (legacy function for backward compatibility)
 * This now returns the earliest request date from all headcounts
 * @param position - The position object
 * @returns The effective SLA start date or null
 */
export async function getEffectiveSLAStartDate(position: Position): Promise<Date | null> {
  // If position has no ID, we can't get headcount data
  if (!position.id) {
    return null;
  }

  try {
    // Get the earliest request date from headcounts
    const earliestRequestDate = await getEarliestRequestDateForPosition(position.id);
    return earliestRequestDate;
  } catch (error) {
    console.error('Error getting effective SLA start date:', error);
    return null;
  }
}
