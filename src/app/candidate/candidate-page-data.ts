import type { PoolClient } from 'pg';
import { getPool } from '../../lib/db';
import type { ApplicantFilterValues } from '../../lib/types';
import {
  getCandidatePageErrorMessage,
  mapCandidateRows,
} from './candidate-page-mappers';
import type { CandidateApplicantRow, CandidatePositionRow, CandidateStageRow } from './candidate-page-types';

export const candidateInitialFilters: ApplicantFilterValues = {
  selectedStatuses: ['Hiring Manager Associate'],
};

const CANDIDATE_STATUS = candidateInitialFilters.selectedStatuses?.[0] || 'Hiring Manager Associate';

export async function loadCandidatePageData(hasSessionUser: boolean) {
  if (!hasSessionUser) {
    return {
      initialApplicants: [],
      initialAvailablePositions: [],
      initialAvailableStages: [],
      initialFetchError: undefined,
    };
  }

  let client: PoolClient | null = null;
  try {
    client = await getPool().connect();
    const applicants = await fetchCandidateApplicants(client);
    const positions = await fetchCandidatePositions(client);
    const stages = await fetchCandidateStages(client);

    return {
      ...mapCandidateRows({ applicants, positions, stages }),
      initialFetchError: undefined,
    };
  } catch (error) {
    console.error('Error fetching candidate page initial data:', error);
    return {
      initialApplicants: [],
      initialAvailablePositions: [],
      initialAvailableStages: [],
      initialFetchError: `Failed to load candidate data: ${getCandidatePageErrorMessage(error)}`,
    };
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing database client for candidate page:', releaseError);
      }
    }
  }
}

async function fetchCandidateApplicants(client: PoolClient): Promise<CandidateApplicantRow[]> {
  try {
    const result = await client.query(`
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c."statusId",
        rs.name as "status",
        c."positionId",
        c."recruiterId",
        c."sourceId",
        c."fitScore",
        c."applicationDate",
        c."updatedAt",
        c."parsedData",
        p.title as "positionTitle",
        r.name as "recruiterName",
        cs.name as "sourceName",
        c."isBlacklisted"
      FROM "Applicant" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" r ON c."recruiterId" = r.id
      LEFT JOIN "ApplicantSource" cs ON c."sourceId" = cs.id
      LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
      WHERE rs.name = $1
      ORDER BY c."applicationDate" DESC
      LIMIT 50;
    `, [CANDIDATE_STATUS]);

    return Array.isArray(result.rows) ? result.rows as CandidateApplicantRow[] : [];
  } catch (error) {
    console.error('Error fetching candidate applicants:', error);
    throw error;
  }
}

async function fetchCandidatePositions(client: PoolClient): Promise<CandidatePositionRow[]> {
  try {
    const result = await client.query(`
      SELECT
        p.id,
        p.title,
        p.department,
        p."isOpen",
        p."createdAt",
        p."updatedAt",
        u.name as "recruiterName",
        g.name as "gradeName",
        g."sla_days" as "gradeSlaDays",
        g.color as "gradeColor"
      FROM "Position" p
      LEFT JOIN "User" u ON p."recruiterId" = u.id
      LEFT JOIN "Grade" g ON p."gradeId" = g.id
      WHERE p."isOpen" = true
      ORDER BY p."createdAt" DESC;
    `);

    return Array.isArray(result.rows) ? result.rows as CandidatePositionRow[] : [];
  } catch (error) {
    console.error('Error fetching positions for candidate page:', error);
    throw error;
  }
}

async function fetchCandidateStages(client: PoolClient): Promise<CandidateStageRow[]> {
  try {
    const result = await client.query('SELECT * FROM "RecruitmentStage" ORDER BY sort_order ASC;');
    return Array.isArray(result.rows) ? result.rows as CandidateStageRow[] : [];
  } catch (error) {
    console.error('Error fetching recruitment stages for candidate page:', error);
    throw error;
  }
}
