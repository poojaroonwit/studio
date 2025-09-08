import type { Position, Grade } from '@/lib/types';

export interface SLACheckResult {
  isViolated: boolean;
  daysOverdue: number;
  slaDays: number;
  gradeName: string;
  gradeColor: string;
}

export function checkSLAViolation(position: Position): SLACheckResult | null {
  // Use position.hiringDate as the SLA start date, which is now the
  // Position Request Date or earliest candidate application date from caller
  if (!position.hiringDate || !position.grade) {
    return null;
  }

  const hiringDate = new Date(position.hiringDate);
  const currentDate = new Date();
  const slaDays = position.grade.slaDays;
  
  // Calculate the target completion date
  const targetDate = new Date(hiringDate);
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

export function getSLARemainingDays(position: Position): number | null {
  // Uses the same SLA start date semantics as checkSLAViolation
  if (!position.hiringDate || !position.grade) {
    return null;
  }

  const hiringDate = new Date(position.hiringDate);
  const targetDate = new Date(hiringDate);
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
