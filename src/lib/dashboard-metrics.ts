import { PoolClient } from 'pg';
import { ACTIVE_CANDIDATE_STATUSES } from '@/lib/types';

export async function fetchDashboardMetrics(client: PoolClient, userId: string, canViewAll: boolean) {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. KPI Queries
  const kpiQuery = `
    SELECT
      COUNT(CASE WHEN c.status = ANY($1) THEN 1 END) as "activeCandidates",
      (SELECT COUNT(*) FROM "Headcount" h JOIN "Position" p ON h."positionId" = p.id WHERE p."isOpen" = true AND h.status != 'filled') as "openHeadcounts",
      COUNT(CASE WHEN c.status = 'Hired' AND c."updatedAt" >= $2 THEN 1 END) as "hiredThisMonth",
      COUNT(CASE WHEN c.status = 'Rejected' AND c."updatedAt" >= $2 THEN 1 END) as "rejectedThisMonth",
      COUNT(CASE WHEN c."fitScore" >= 80 AND c.status = ANY($1) THEN 1 END) as "highScoreCandidates",
      COUNT(CASE WHEN c."applicationDate" >= $3 THEN 1 END) as "applicationsThisWeek"
    FROM "Candidate" c
    WHERE ($4 = true OR c."recruiterId" = $5)
  `;
  
  const kpisResult = await client.query(kpiQuery, [
    ACTIVE_CANDIDATE_STATUSES,
    firstDayOfMonth,
    last7Days,
    canViewAll,
    userId
  ]);

  // 2. Average Time to Hire
  const avgTimeQuery = `
    SELECT AVG(EXTRACT(DAY FROM (tr.date - c."applicationDate"))) as "avgDays"
    FROM "Candidate" c
    JOIN "TransitionRecord" tr ON c.id = tr."candidateId"
    WHERE tr.stage = 'Hired'
    AND ($1 = true OR c."recruiterId" = $2)
  `;
  const avgTimeResult = await client.query(avgTimeQuery, [canViewAll, userId]);

  // 3. Time Series Data (New Applications)
  const timeSeriesQuery = `
    SELECT 
      DATE_TRUNC('day', "applicationDate") as date,
      COUNT(*) as count
    FROM "Candidate"
    WHERE "applicationDate" >= CURRENT_DATE - INTERVAL '30 days'
    AND ($1 = true OR "recruiterId" = $2)
    GROUP BY date
    ORDER BY date ASC
  `;
  const timeSeriesResult = await client.query(timeSeriesQuery, [canViewAll, userId]);

  // 4. Score Distribution
  const scoreDistQuery = `
    SELECT 
      CASE 
        WHEN "fitScore" >= 90 THEN 'A (90-100)'
        WHEN "fitScore" >= 80 THEN 'B (80-89)'
        WHEN "fitScore" >= 70 THEN 'C (70-79)'
        WHEN "fitScore" >= 60 THEN 'D (60-69)'
        ELSE 'F (<60)'
      END as range,
      COUNT(*) as count
    FROM "Candidate"
    WHERE status = ANY($1)
    AND ($2 = true OR "recruiterId" = $3)
    GROUP BY range
    ORDER BY range ASC
  `;
  const scoreDistResult = await client.query(scoreDistQuery, [ACTIVE_CANDIDATE_STATUSES, canViewAll, userId]);

  // 5. On-Process by Stage
  const stageDistQuery = `
    SELECT 
      status as stage,
      COUNT(*) as count
    FROM "Candidate"
    WHERE status = ANY($1)
    AND ($2 = true OR "recruiterId" = $3)
    GROUP BY stage
    ORDER BY count DESC
  `;
  const stageDistResult = await client.query(stageDistQuery, [ACTIVE_CANDIDATE_STATUSES, canViewAll, userId]);

  // 6. On-Process by Recruiter
  const recruiterDistQuery = `
    SELECT 
      u.name as recruiter,
      COUNT(c.id) as count
    FROM "Candidate" c
    LEFT JOIN "User" u ON c."recruiterId" = u.id
    WHERE c.status = ANY($1)
    AND ($2 = true OR c."recruiterId" = $3)
    GROUP BY recruiter
    ORDER BY count DESC
  `;
  const recruiterDistResult = await client.query(recruiterDistQuery, [ACTIVE_CANDIDATE_STATUSES, canViewAll, userId]);

  return {
    kpis: {
      activeCandidates: parseInt(kpisResult.rows[0]?.activeCandidates || '0', 10),
      openHeadcounts: parseInt(kpisResult.rows[0]?.openHeadcounts || '0', 10),
      hiredThisMonth: parseInt(kpisResult.rows[0]?.hiredThisMonth || '0', 10),
      rejectedThisMonth: parseInt(kpisResult.rows[0]?.rejectedThisMonth || '0', 10),
      highScoreCandidates: parseInt(kpisResult.rows[0]?.highScoreCandidates || '0', 10),
      applicationsThisWeek: parseInt(kpisResult.rows[0]?.applicationsThisWeek || '0', 10),
      avgTimeToHire: parseFloat(avgTimeResult.rows[0]?.avgDays || '0').toFixed(2)
    },
    timeSeries: timeSeriesResult.rows.map(r => ({
      date: r.date.toISOString(),
      count: parseInt(r.count, 10)
    })),
    scoreDistribution: scoreDistResult.rows.map(r => ({
      range: r.range,
      count: parseInt(r.count, 10)
    })),
    pipelineStages: stageDistResult.rows.map(r => ({
      stage: r.stage,
      count: parseInt(r.count, 10)
    })),
    pipelineRecruiters: recruiterDistResult.rows.map(r => ({
      recruiter: r.recruiter || 'Unassigned',
      count: parseInt(r.count, 10)
    }))
  };
}
