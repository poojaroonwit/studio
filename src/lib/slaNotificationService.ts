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
          recruiterId: position.recruiterId,
          recruiterName: position.recruiterName,
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
          recruiterId: position.recruiterId,
          recruiterName: position.recruiterName,
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
