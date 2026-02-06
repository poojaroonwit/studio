/**
 * SLA Database Queries
 * Database query functions for SLA data
 */

import { getPool } from '@/lib/db';
import type { Position } from '@/lib/types';
import { checkSLAViolation, getSLARemainingDays, checkSLAViolationForHeadcount } from '../slaUtils';
import type { 
  SLAPositionData, 
  PositionWithoutSLA, 
  SLAHeadcountData,
  SLAViolationNotification 
} from './types';
import { determineSLAStatus } from './types';

/**
 * Get all positions with SLA tracking data
 */
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
      
      const isViolated = slaResult ? slaResult.isViolated : false;
      const daysOverdue = slaResult ? slaResult.daysOverdue : 0;
      const status = determineSLAStatus(isViolated, daysOverdue, daysRemaining);
      
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
        isViolated,
        daysOverdue,
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

/**
 * Get positions without SLA (no grade assigned)
 */
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

/**
 * Get all headcounts with SLA tracking data
 */
export async function getAllSLAHeadcounts(recruiterId?: string): Promise<SLAHeadcountData[]> {
  const client = await getPool().connect();
  
  try {
    let query = `
      SELECT 
        h.id as "headcountId",
        h."positionId",
        h.type as "headcountType",
        h.status as "headcountStatus",
        h."applicantId",
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
    const slaHeadcounts: SLAHeadcountData[] = [];
    
    for (const row of result.rows) {
      const headcount = {
        id: row.headcountId,
        positionId: row.positionId,
        type: row.headcountType,
        status: row.headcountStatus,
        applicantId: row.applicantId,
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
      
      const isViolated = slaResult ? slaResult.isViolated : false;
      const daysOverdue = slaResult ? slaResult.daysOverdue : 0;
      const daysRemaining = slaResult ? slaResult.daysRemaining : 0;
      const status = determineSLAStatus(isViolated, daysOverdue, daysRemaining);
      
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
        requestDate: row.requestDate,
        onboardingDate: row.onboardingDate,
        isViolated,
        daysOverdue,
        daysRemaining,
        status,
        createdAt: row.createdAt,
      });
    }
    
    return slaHeadcounts;
  } finally {
    client.release();
  }
}

/**
 * Get SLA violations for a specific recruiter
 */
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
