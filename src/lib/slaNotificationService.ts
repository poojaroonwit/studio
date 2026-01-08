<<<<<<< HEAD
import { getPool } from '@/lib/db';
import type { Position, Grade } from '@/lib/types';
import { checkSLAViolation, getSLARemainingDays, checkSLAViolationForHeadcount } from './slaUtils';
import { indexLogToElasticsearch } from './elasticsearch';
import { sendLogToSignoz } from './signoz';
import { randomUUID } from 'crypto';

export interface SLAViolationNotification {
  positionId: string;
  positionTitle: string;
  recruiterId: string | null;
  recruiterName: string | null;
  gradeName: string;
  daysOverdue: number;
  slaDays: number;
  requestDate: string;
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
  requestDate: string;
  isViolated: boolean;
  daysOverdue: number;
  daysRemaining: number;
  status: 'on_track' | 'warning' | 'critical' | 'urgent';
  createdAt: string;
}

export interface PositionWithoutSLA {
  positionId: string;
  positionTitle: string;
  department: string;
  recruiterId: string | null;
  recruiterName: string | null;
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
    // Get all headcounts with position and grade information
    const query = `
      SELECT 
        h.id as "headcountId",
        h."positionId",
        h.type as "headcountType",
        h.status as "headcountStatus",
        h."candidateId",
        h."requestDate",
        h."onboardingDate",
        p.title as "positionTitle",
        p."recruiterId",
        u.name as "recruiterName",
        g.name as "gradeName",
        g."sla_days" as "slaDays",
        g.color as "gradeColor"
      FROM "Headcount" h
      LEFT JOIN "Position" p ON h."positionId" = p.id
      LEFT JOIN "User" u ON p."recruiterId" = u.id
      LEFT JOIN "Grade" g ON p."gradeId" = g.id
      WHERE p."gradeId" IS NOT NULL
        AND p."isOpen" = true
        AND h."requestDate" IS NOT NULL
    `;
    
    const result = await client.query(query);
    const violations: SLAViolationNotification[] = [];
    
    for (const row of result.rows) {
      const headcount = {
        id: row.headcountId,
        positionId: row.positionId,
        type: row.headcountType,
        status: row.headcountStatus,
        candidateId: row.candidateId,
        requestDate: row.requestDate,
        onboardingDate: row.onboardingDate,
        position: {
          id: row.positionId,
          title: row.positionTitle,
          recruiterId: row.recruiterId,
          recruiterName: row.recruiterName,
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
        },
      };
      
      const slaResult = await checkSLAViolationForHeadcount(headcount);
      if (slaResult && slaResult.isViolated) {
        violations.push({
          positionId: headcount.positionId,
          positionTitle: headcount.position.title,
          recruiterId: headcount.position.recruiterId || null,
          recruiterName: headcount.position.recruiterName || null,
          gradeName: slaResult.gradeName,
          daysOverdue: slaResult.daysOverdue,
          slaDays: slaResult.slaDays,
          requestDate: headcount.requestDate!,
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
        MIN(h."requestDate") as "requestDate",
        p."recruiterId",
        u.name as "recruiterName",
        g.name as "gradeName",
        g."sla_days" as "slaDays",
        g.color as "gradeColor",
        p."createdAt"
      FROM "Position" p
      LEFT JOIN "User" u ON p."recruiterId" = u.id
      LEFT JOIN "Grade" g ON p."gradeId" = g.id
      LEFT JOIN "Headcount" h ON p.id = h."positionId"
      WHERE p."gradeId" IS NOT NULL
        AND p."isOpen" = true
        AND h."requestDate" IS NOT NULL
      GROUP BY p.id, p.title, p.department, p."recruiterId", u.name, g.name, g."sla_days", g.color, p."createdAt"
    `;
    
    const params: any[] = [];
    if (recruiterId) {
      query += ` AND p."recruiterId" = $1`;
      params.push(recruiterId);
    }
    
    query += ` ORDER BY MIN(h."requestDate") ASC`;
    
    const result = await client.query(query, params);
    const slaPositions: SLAPositionData[] = [];
    
    for (const row of result.rows) {
      const position: Position = {
        id: row.id,
        title: row.title,
        department: row.department,
        isOpen: true,
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
      
      const slaResult = await checkSLAViolation(position);
      const daysRemaining = slaResult && !slaResult.isViolated 
        ? await getSLARemainingDays(position) || 0
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
        requestDate: row.requestDate,
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

export async function getPositionsWithoutSLA(recruiterId?: string): Promise<PositionWithoutSLA[]> {
  const client = await getPool().connect();
  
  try {
    let query = `
      SELECT 
        p.id as "positionId",
        p.title as "positionTitle",
        p.department,
        p."recruiterId",
        u.name as "recruiterName",
        p."createdAt"
      FROM "Position" p
      LEFT JOIN "User" u ON p."recruiterId" = u.id
      WHERE p."gradeId" IS NULL
        AND p."isOpen" = true
    `;
    
    const params: any[] = [];
    if (recruiterId) {
      query += ` AND p."recruiterId" = $1`;
      params.push(recruiterId);
    }
    
    query += ` ORDER BY p."createdAt" DESC`;
    
    const result = await client.query(query, params);
    
    return result.rows.map((row: any) => ({
      positionId: row.positionId,
      positionTitle: row.positionTitle,
      department: row.department,
      recruiterId: row.recruiterId,
      recruiterName: row.recruiterName,
      createdAt: row.createdAt,
    }));
  } finally {
    client.release();
  }
}

export async function getAllSLAHeadcounts(recruiterId?: string): Promise<any[]> {
  const client = await getPool().connect();
  
  try {
    let query = `
      SELECT 
        h.id as "headcountId",
        h."positionId",
        h.type as "headcountType",
        h.status as "headcountStatus",
        h."candidateId",
        h."requestDate",
        h."onboardingDate",
        p.title as "positionTitle",
        p.department as "positionDepartment",
        p."recruiterId",
        u.name as "recruiterName",
        g.name as "gradeName",
        g."sla_days" as "slaDays",
        g.color as "gradeColor",
        h."createdAt"
      FROM "Headcount" h
      LEFT JOIN "Position" p ON h."positionId" = p.id
      LEFT JOIN "User" u ON p."recruiterId" = u.id
      LEFT JOIN "Grade" g ON p."gradeId" = g.id
      WHERE p."gradeId" IS NOT NULL
        AND p."isOpen" = true
        AND h."requestDate" IS NOT NULL
    `;
    
    const params: any[] = [];
    if (recruiterId) {
      query += ` AND p."recruiterId" = $1`;
      params.push(recruiterId);
    }
    
    query += ` ORDER BY h."requestDate" ASC`;
    
    const result = await client.query(query, params);
    const slaHeadcounts: any[] = [];
    
    for (const row of result.rows) {
      const headcount = {
        id: row.headcountId,
        positionId: row.positionId,
        type: row.headcountType,
        status: row.headcountStatus,
        candidateId: row.candidateId,
        requestDate: row.requestDate,
        onboardingDate: row.onboardingDate,
        position: {
          id: row.positionId,
          title: row.positionTitle,
          department: row.positionDepartment,
          recruiterId: row.recruiterId,
          recruiterName: row.recruiterName,
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
        },
      };
      
      const slaResult = await checkSLAViolationForHeadcount(headcount);
      
      // Determine status based on SLA
      let status: 'on_track' | 'warning' | 'critical' | 'urgent' = 'on_track';
      if (slaResult && slaResult.isViolated) {
        if (slaResult.daysOverdue <= 7) status = 'warning';
        else if (slaResult.daysOverdue <= 30) status = 'critical';
        else status = 'urgent';
      } else if (slaResult && slaResult.daysRemaining <= 7) {
        status = 'warning';
      }
      
      slaHeadcounts.push({
        headcountId: headcount.id,
        positionId: headcount.positionId,
        headcountType: headcount.type,
        headcountStatus: headcount.status,
        positionTitle: headcount.position.title,
        department: headcount.position.department,
        recruiterId: headcount.position.recruiterId || null,
        recruiterName: headcount.position.recruiterName || null,
        gradeName: row.gradeName,
        gradeColor: row.gradeColor,
        slaDays: row.slaDays,
        requestDate: headcount.requestDate!,
        isViolated: slaResult ? slaResult.isViolated : false,
        daysOverdue: slaResult ? slaResult.daysOverdue : 0,
        daysRemaining: slaResult ? slaResult.daysRemaining : null,
        status,
        createdAt: row.createdAt,
      });
    }
    
    return slaHeadcounts;
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
  if (violations.length === 0) return;

  const client = await getPool().connect();
  
  try {
    // Create in-app notifications for each violation
    for (const violation of violations) {
      // Create notification for the recruiter
      if (violation.recruiterId) {
        await client.query(`
          INSERT INTO "Notification" (id, "userId", type, title, message, data, "isRead", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          crypto.randomUUID(),
          violation.recruiterId,
          'sla_violation',
          `SLA Violation: ${violation.positionTitle}`,
          `Position "${violation.positionTitle}" has exceeded its SLA by ${violation.daysOverdue} days. Grade: ${violation.gradeName} (${violation.slaDays} days)`,
          JSON.stringify({
            positionId: violation.positionId,
            positionTitle: violation.positionTitle,
            daysOverdue: violation.daysOverdue,
            slaDays: violation.slaDays,
            gradeName: violation.gradeName,
            requestDate: violation.requestDate,
            severity: violation.daysOverdue > 30 ? 'urgent' : violation.daysOverdue > 7 ? 'critical' : 'warning'
          }),
          false,
          new Date(),
          new Date()
        ]);
      }

      // Create notification for admins (users with admin role)
      const adminUsers = await client.query(`
        SELECT id FROM "User" WHERE role = 'admin' AND "isActive" = true
      `);

      for (const admin of adminUsers.rows) {
        await client.query(`
          INSERT INTO "Notification" (id, "userId", type, title, message, data, "isRead", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          crypto.randomUUID(),
          admin.id,
          'sla_violation_admin',
          `SLA Violation Alert: ${violation.positionTitle}`,
          `Position "${violation.positionTitle}" assigned to ${violation.recruiterName || 'Unassigned'} has exceeded its SLA by ${violation.daysOverdue} days. Grade: ${violation.gradeName} (${violation.slaDays} days)`,
          JSON.stringify({
            positionId: violation.positionId,
            positionTitle: violation.positionTitle,
            recruiterId: violation.recruiterId,
            recruiterName: violation.recruiterName,
            daysOverdue: violation.daysOverdue,
            slaDays: violation.slaDays,
            gradeName: violation.gradeName,
            requestDate: violation.requestDate,
            severity: violation.daysOverdue > 30 ? 'urgent' : violation.daysOverdue > 7 ? 'critical' : 'warning'
          }),
          false,
          new Date(),
          new Date()
        ]);
      }
    }

    // Log audit trail
    const auditLogId = randomUUID();
    const auditTimestamp = new Date();
    const auditMessage = `SLA violation notifications sent for ${violations.length} positions`;
    const auditDetails = {
      violationCount: violations.length,
      positions: violations.map(v => ({
        positionId: v.positionId,
        positionTitle: v.positionTitle,
        daysOverdue: v.daysOverdue
      }))
    };
    
    await client.query(`
      INSERT INTO "AuditLog" (id, level, message, source, "actingUserId", details, timestamp, action, entity, "entity_id")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      auditLogId,
      'WARN',
      auditMessage,
      'SLA:NotificationService',
      null,
      JSON.stringify(auditDetails),
      auditTimestamp,
      'sla_notification_sent',
      'sla_violations',
      null
    ]);
    
    // Map AuditLog format to LogEntry format for indexing
    const logEntry = {
      id: auditLogId,
      timestamp: auditTimestamp,
      level: 'WARN',
      message: auditMessage,
      source: 'SLA:NotificationService',
      actingUserId: null,
      details: auditDetails,
    };
    
    // Index to Elasticsearch asynchronously (don't await to avoid blocking)
    indexLogToElasticsearch(logEntry).catch((esError) => {
      // Silently fail - Elasticsearch indexing should not break logging
      console.error('Failed to index AuditLog to Elasticsearch:', esError);
    });
    
    // Send to SigNoz asynchronously (don't await to avoid blocking)
    // sendLogToSignoz handles its own checks for SigNoz configuration
    sendLogToSignoz(logEntry).catch((signozError) => {
      // Silently fail - SigNoz logging should not break logging
      console.error('Failed to send AuditLog to SigNoz:', signozError);
    });

  } finally {
    client.release();
  }
}

export async function getSLAViolationsForRecruiter(recruiterId: string): Promise<SLAViolationNotification[]> {
  const client = await getPool().connect();
  
  try {
    const query = `
      SELECT 
        p.id,
        p.title,
        MIN(h."requestDate") as "requestDate",
        p."recruiterId",
        u.name as "recruiterName",
        g.name as "gradeName",
        g."sla_days" as "slaDays",
        g.color as "gradeColor"
      FROM "Position" p
      LEFT JOIN "User" u ON p."recruiterId" = u.id
      LEFT JOIN "Grade" g ON p."gradeId" = g.id
      LEFT JOIN "Headcount" h ON p.id = h."positionId"
      WHERE p."recruiterId" = $1
        AND p."gradeId" IS NOT NULL
        AND p."isOpen" = true
        AND h."requestDate" IS NOT NULL
      GROUP BY p.id, p.title, p."recruiterId", u.name, g.name, g."sla_days", g.color
    `;
    
    const result = await client.query(query, [recruiterId]);
    const violations: SLAViolationNotification[] = [];
    
    for (const row of result.rows) {
      const position: Position = {
        id: row.id,
        title: row.title,
        department: '',
        isOpen: true,
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
      
      const slaResult = await checkSLAViolation(position);
      if (slaResult && slaResult.isViolated) {
        violations.push({
          positionId: position.id,
          positionTitle: position.title,
          recruiterId: position.recruiterId || null,
          recruiterName: position.recruiterName || null,
          gradeName: slaResult.gradeName,
          daysOverdue: slaResult.daysOverdue,
          slaDays: slaResult.slaDays,
          requestDate: row.requestDate,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    return violations;
  } finally {
    client.release();
  }
}
=======
/**
 * SLA Notification Service
 * 
 * This file re-exports all functions from the sla module for backward compatibility.
 * New code should import directly from '@/lib/sla' instead.
 * 
 * @deprecated Import from '@/lib/sla' instead
 * @module slaNotificationService
 */

// Re-export everything from the sla module
export {
  // Types
  type SLAViolationNotification,
  type SLAPositionData,
  type PositionWithoutSLA,
  type SLAStatistics,
  type SLAHeadcountData,
  type SLAStatus,
  determineSLAStatus,
  
  // Query functions
  getAllSLAPositions,
  getPositionsWithoutSLA,
  getAllSLAHeadcounts,
  getSLAViolationsForRecruiter,
  
  // Notification functions
  checkAndNotifySLAViolations,
  logSLAViolationsToAudit,
  
  // Statistics functions
  getSLAStatistics,
} from './sla';
>>>>>>> ca51ac36
