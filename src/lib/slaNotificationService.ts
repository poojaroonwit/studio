import { getPool } from '@/lib/db';
import type { Position, Grade } from '@/lib/types';
import { checkSLAViolation } from './slaUtils';

export interface SLAViolationNotification {
  positionId: string;
  positionTitle: string;
  recruiterId: string | null;
  recruiterName: string | null;
  gradeName: string;
  daysOverdue: number;
  slaDays: number;
  hiringDate: string;
  createdAt: string;
}

export interface SLAPositionData {
  positionId: string;
  positionTitle: string;
  department: string;
  recruiterId: string | null;
  recruiterName: string | null;
  gradeName: string;
  gradeColor: string;
  slaDays: number;
  hiringDate: string;
  isViolated: boolean;
  daysOverdue: number;
  daysRemaining: number;
  status: 'on_track' | 'warning' | 'critical' | 'urgent';
  createdAt: string;
}

export interface SLAStatistics {
  total: number;
  onTrack: number;
  warning: number;
  critical: number;
  urgent: number;
  complianceRate: number;
  averageDaysOverdue: number;
  totalDaysOverdue: number;
  byGrade: {
    [gradeName: string]: {
      total: number;
      violations: number;
      complianceRate: number;
    };
  };
  byRecruiter: {
    [recruiterName: string]: {
      total: number;
      violations: number;
      complianceRate: number;
    };
  };
}

export async function checkAndNotifySLAViolations(): Promise<SLAViolationNotification[]> {
  const client = await getPool().connect();
  
  try {
    // Get all positions with grades and hiring dates
    const query = `
      SELECT 
        p.id,
        p.title,
        p."hiringDate",
        p."recruiterId",
        u.name as "recruiterName",
        g.name as "gradeName",
        g."sla_days" as "slaDays",
        g.color as "gradeColor"
      FROM "Position" p
      LEFT JOIN "User" u ON p."recruiterId" = u.id
      LEFT JOIN "Grade" g ON p."gradeId" = g.id
      WHERE p."hiringDate" IS NOT NULL 
        AND p."gradeId" IS NOT NULL
        AND p."isOpen" = true
    `;
    
    const result = await client.query(query);
    const violations: SLAViolationNotification[] = [];
    
    for (const row of result.rows) {
      const position: Position = {
        id: row.id,
        title: row.title,
        department: '',
        isOpen: true,
        hiringDate: row.hiringDate,
        grade: {
          id: '',
          name: row.gradeName,
          slaDays: row.slaDays,
          color: row.gradeColor,
          isActive: true,
          sortOrder: 0,
          minLevel: 0,
          maxLevel: 0,
        },
        recruiterId: row.recruiterId,
        recruiterName: row.recruiterName,
      };
      
      const slaResult = checkSLAViolation(position);
      if (slaResult && slaResult.isViolated) {
        violations.push({
          positionId: position.id,
          positionTitle: position.title,
          recruiterId: position.recruiterId || null,
          recruiterName: position.recruiterName || null,
          gradeName: slaResult.gradeName,
          daysOverdue: slaResult.daysOverdue,
          slaDays: slaResult.slaDays,
          hiringDate: position.hiringDate!,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    return violations;
  } finally {
    client.release();
  }
}

export async function getAllSLAPositions(recruiterId?: string): Promise<SLAPositionData[]> {
  const client = await getPool().connect();
  
  try {
    let query = `
      SELECT 
        p.id,
        p.title,
        p.department,
        p."hiringDate",
        p."recruiterId",
        u.name as "recruiterName",
        g.name as "gradeName",
        g."sla_days" as "slaDays",
        g.color as "gradeColor",
        p."createdAt"
      FROM "Position" p
      LEFT JOIN "User" u ON p."recruiterId" = u.id
      LEFT JOIN "Grade" g ON p."gradeId" = g.id
      WHERE p."hiringDate" IS NOT NULL 
        AND p."gradeId" IS NOT NULL
        AND p."isOpen" = true
    `;
    
    const params: any[] = [];
    if (recruiterId) {
      query += ` AND p."recruiterId" = $1`;
      params.push(recruiterId);
    }
    
    query += ` ORDER BY p."hiringDate" ASC`;
    
    const result = await client.query(query, params);
    const slaPositions: SLAPositionData[] = [];
    
    for (const row of result.rows) {
      const position: Position = {
        id: row.id,
        title: row.title,
        department: row.department,
        isOpen: true,
        hiringDate: row.hiringDate,
        grade: {
          id: '',
          name: row.gradeName,
          slaDays: row.slaDays,
          color: row.gradeColor,
          isActive: true,
          sortOrder: 0,
          minLevel: 0,
          maxLevel: 0,
        },
        recruiterId: row.recruiterId,
        recruiterName: row.recruiterName,
      };
      
      const slaResult = checkSLAViolation(position);
      const daysRemaining = slaResult && !slaResult.isViolated 
        ? Math.max(0, slaResult.slaDays - Math.floor((new Date().getTime() - new Date(position.hiringDate!).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      
      let status: 'on_track' | 'warning' | 'critical' | 'urgent' = 'on_track';
      if (slaResult && slaResult.isViolated) {
        if (slaResult.daysOverdue <= 7) status = 'warning';
        else if (slaResult.daysOverdue <= 30) status = 'critical';
        else status = 'urgent';
      } else if (daysRemaining <= 7) {
        status = 'warning';
      }
      
      slaPositions.push({
        positionId: position.id,
        positionTitle: position.title,
        department: position.department,
        recruiterId: position.recruiterId || null,
        recruiterName: position.recruiterName || null,
        gradeName: row.gradeName,
        gradeColor: row.gradeColor,
        slaDays: row.slaDays,
        hiringDate: position.hiringDate!,
        isViolated: slaResult ? slaResult.isViolated : false,
        daysOverdue: slaResult ? slaResult.daysOverdue : 0,
        daysRemaining,
        status,
        createdAt: row.createdAt,
      });
    }
    
    return slaPositions;
  } finally {
    client.release();
  }
}

export async function getSLAStatistics(recruiterId?: string): Promise<SLAStatistics> {
  const positions = await getAllSLAPositions(recruiterId);
  
  const stats: SLAStatistics = {
    total: positions.length,
    onTrack: 0,
    warning: 0,
    critical: 0,
    urgent: 0,
    complianceRate: 0,
    averageDaysOverdue: 0,
    totalDaysOverdue: 0,
    byGrade: {},
    byRecruiter: {},
  };
  
  let totalDaysOverdue = 0;
  let violationCount = 0;
  
  for (const position of positions) {
    // Count by status
    switch (position.status) {
      case 'on_track':
        stats.onTrack++;
        break;
      case 'warning':
        stats.warning++;
        break;
      case 'critical':
        stats.critical++;
        break;
      case 'urgent':
        stats.urgent++;
        break;
    }
    
    // Track overdue days
    if (position.isViolated) {
      totalDaysOverdue += position.daysOverdue;
      violationCount++;
    }
    
    // Group by grade
    if (!stats.byGrade[position.gradeName]) {
      stats.byGrade[position.gradeName] = { total: 0, violations: 0, complianceRate: 0 };
    }
    stats.byGrade[position.gradeName].total++;
    if (position.isViolated) {
      stats.byGrade[position.gradeName].violations++;
    }
    
    // Group by recruiter
    const recruiterName = position.recruiterName || 'Unassigned';
    if (!stats.byRecruiter[recruiterName]) {
      stats.byRecruiter[recruiterName] = { total: 0, violations: 0, complianceRate: 0 };
    }
    stats.byRecruiter[recruiterName].total++;
    if (position.isViolated) {
      stats.byRecruiter[recruiterName].violations++;
    }
  }
  
  // Calculate compliance rate
  stats.complianceRate = stats.total > 0 ? Math.round(((stats.total - violationCount) / stats.total) * 100) : 100;
  stats.averageDaysOverdue = violationCount > 0 ? Math.round(totalDaysOverdue / violationCount) : 0;
  stats.totalDaysOverdue = totalDaysOverdue;
  
  // Calculate compliance rates for grades and recruiters
  Object.keys(stats.byGrade).forEach(gradeName => {
    const grade = stats.byGrade[gradeName];
    grade.complianceRate = grade.total > 0 ? Math.round(((grade.total - grade.violations) / grade.total) * 100) : 100;
  });
  
  Object.keys(stats.byRecruiter).forEach(recruiterName => {
    const recruiter = stats.byRecruiter[recruiterName];
    recruiter.complianceRate = recruiter.total > 0 ? Math.round(((recruiter.total - recruiter.violations) / recruiter.total) * 100) : 100;
  });
  
  return stats;
}

export async function sendSLAViolationNotifications(violations: SLAViolationNotification[]): Promise<void> {
  // This would integrate with your notification system
  // For now, we'll just log the violations
  for (const violation of violations) {
    console.log(`SLA Violation Alert: Position "${violation.positionTitle}" is ${violation.daysOverdue} days overdue.`);
    console.log(`Recruiter: ${violation.recruiterName || 'Unassigned'}`);
    console.log(`Grade: ${violation.gradeName} (${violation.slaDays} days SLA)`);
    console.log(`Hiring Date: ${violation.hiringDate}`);
    console.log('---');
  }
  
  // TODO: Integrate with your notification system
  // - Send email notifications to recruiters
  // - Send in-app notifications
  // - Send Slack/Teams notifications
  // - Create dashboard alerts
}

export async function getSLAViolationsForRecruiter(recruiterId: string): Promise<SLAViolationNotification[]> {
  const client = await getPool().connect();
  
  try {
    const query = `
      SELECT 
        p.id,
        p.title,
        p."hiringDate",
        p."recruiterId",
        u.name as "recruiterName",
        g.name as "gradeName",
        g."sla_days" as "slaDays",
        g.color as "gradeColor"
      FROM "Position" p
      LEFT JOIN "User" u ON p."recruiterId" = u.id
      LEFT JOIN "Grade" g ON p."gradeId" = g.id
      WHERE p."recruiterId" = $1
        AND p."hiringDate" IS NOT NULL 
        AND p."gradeId" IS NOT NULL
        AND p."isOpen" = true
    `;
    
    const result = await client.query(query, [recruiterId]);
    const violations: SLAViolationNotification[] = [];
    
    for (const row of result.rows) {
      const position: Position = {
        id: row.id,
        title: row.title,
        department: '',
        isOpen: true,
        hiringDate: row.hiringDate,
        grade: {
          id: '',
          name: row.gradeName,
          slaDays: row.slaDays,
          color: row.gradeColor,
          isActive: true,
          sortOrder: 0,
          minLevel: 0,
          maxLevel: 0,
        },
        recruiterId: row.recruiterId,
        recruiterName: row.recruiterName,
      };
      
      const slaResult = checkSLAViolation(position);
      if (slaResult && slaResult.isViolated) {
        violations.push({
          positionId: position.id,
          positionTitle: position.title,
          recruiterId: position.recruiterId || null,
          recruiterName: position.recruiterName || null,
          gradeName: slaResult.gradeName,
          daysOverdue: slaResult.daysOverdue,
          slaDays: slaResult.slaDays,
          hiringDate: position.hiringDate!,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    return violations;
  } finally {
    client.release();
  }
}
