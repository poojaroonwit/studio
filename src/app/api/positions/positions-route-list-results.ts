import type { NextRequest } from 'next/server';
import { handleCors } from '@/lib/cors';
import { getPool } from '@/lib/db';
import { getSystemSetting } from '@/lib/systemSettings';
import type {
  ApplicantStatsRow,
  PositionListItem,
  PositionListQuery,
  PositionListRow,
  PositionStatistics,
  PositionStatsRow,
} from './positions-route-list-types';

export function toInt(value: string | number | null | undefined) {
  return parseInt(String(value || '0'), 10);
}

export function mapPositionRows(rows: PositionListRow[], includeHeadcount: boolean): PositionListItem[] {
  return rows.map(row => {
    const position: PositionListItem = {
      ...row,
      custom_attributes: row.customAttributes || {},
    };

    if (includeHeadcount) {
      position.headcountData = {
        total: toInt(row.totalHeadcount),
        vacant: toInt(row.vacantHeadcount),
        filled: toInt(row.filledHeadcount),
      };
    }

    return position;
  });
}

export async function maybeAttachApplicantStats(positions: PositionListItem[], includeapplicantStats: boolean) {
  if (!includeapplicantStats || positions.length === 0) {
    return positions;
  }

  const jobMatchFeatureEnabled = await getSystemSetting('jobMatchFeatureEnabled');
  const statsMap = await getApplicantStatsByPositionId(
    positions.map(position => position.id),
    jobMatchFeatureEnabled !== 'false'
  );

  return positions.map(position => ({
    ...position,
    applicantStats: statsMap.get(position.id) || {
      totalApplied: 0,
      appliedStatusCount: 0,
      totalMatching: 0,
    },
  }));
}

export async function maybeGetPositionStatistics(query: PositionListQuery): Promise<PositionStatistics | null> {
  if (!query.includeStats) {
    return null;
  }

  try {
    const statsResult = await getPool().query<PositionStatsRow>(query.statsQuery, query.filterParams);
    const stats = statsResult.rows[0];
    return {
      total: toInt(stats?.total),
      open: toInt(stats?.open),
      closed: toInt(stats?.closed),
    };
  } catch {
    return { total: 0, open: 0, closed: 0 };
  }
}

export function getPositionsResponseHeaders(request: NextRequest) {
  return {
    ...handleCors(request),
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };
}

async function getApplicantStatsByPositionId(positionIds: string[], isJobMatchEnabled: boolean) {
  const applicantStatsQuery = `
    WITH position_applied AS (
      SELECT
        p.id as position_id,
        COUNT(c.id) as total_applied,
        COUNT(c.id) as applied_status_count
      FROM "Position" p
      LEFT JOIN "Applicant" c ON p.id = c."positionId"
      WHERE p.id = ANY($1::uuid[])
      GROUP BY p.id
    )
    ${isJobMatchEnabled ? `
    ,position_matching AS (
      SELECT
        p.id as position_id,
        COUNT(DISTINCT jm."applicant_id") as total_matching
      FROM "Position" p
      LEFT JOIN "JobMatch" jm ON p.id = jm."jobId"
      WHERE p.id = ANY($1::uuid[])
      GROUP BY p.id
    )
    ` : ''}
    SELECT
      pa.position_id,
      COALESCE(pa.total_applied, 0) as total_applied,
      COALESCE(pa.applied_status_count, 0) as applied_status_count
      ${isJobMatchEnabled ? ',COALESCE(pm.total_matching, 0) as total_matching' : ',0 as total_matching'}
    FROM position_applied pa
    ${isJobMatchEnabled ? 'LEFT JOIN position_matching pm ON pa.position_id = pm.position_id' : ''}
  `;

  try {
    const statsResult = await getPool().query<ApplicantStatsRow>(applicantStatsQuery, [positionIds]);
    return new Map(statsResult.rows.map(row => [
      row.position_id,
      {
        totalApplied: toInt(row.total_applied),
        appliedStatusCount: toInt(row.applied_status_count),
        totalMatching: isJobMatchEnabled ? toInt(row.total_matching) : 0,
      },
    ]));
  } catch {
    return new Map();
  }
}
