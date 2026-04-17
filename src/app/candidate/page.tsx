import { auth } from '@/auth';
import { ApplicantsPageClient } from '@/components/applicants/ApplicantsPageClient';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import SafeComponentWrapper from '@/components/ui/safe-component-wrapper';
import { getPool } from '@/lib/db';
import { safeJsonParse } from '@/lib/utils';
import type { Applicant, ApplicantFilterValues, Position, RecruitmentStage } from '@/lib/types';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const candidateInitialFilters: ApplicantFilterValues = {
  selectedStatuses: ['Hiring Manager Associate'],
};

export default async function CandidatePageServer() {
  const session = await auth();

  let initialApplicants: Applicant[] = [];
  let initialAvailablePositions: Position[] = [];
  let initialAvailableStages: RecruitmentStage[] = [];
  let initialFetchError: string | undefined = undefined;

  if (session?.user) {
    let client: any = null;
    try {
      client = await getPool().connect();

      let applicantsResult;
      let positionsResult;
      let stagesResult;

      try {
        applicantsResult = await client.query(`
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
        `, [candidateInitialFilters.selectedStatuses?.[0]]);
      } catch (error) {
        console.error('Error fetching candidate applicants:', error);
        throw error;
      }

      try {
        positionsResult = await client.query(`
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
      } catch (error) {
        console.error('Error fetching positions for candidate page:', error);
        throw error;
      }

      try {
        stagesResult = await client.query('SELECT * FROM "RecruitmentStage" ORDER BY sort_order ASC;');
      } catch (error) {
        console.error('Error fetching recruitment stages for candidate page:', error);
        throw error;
      }

      const applicantRows = Array.isArray(applicantsResult?.rows) ? applicantsResult.rows : [];
      initialApplicants = applicantRows.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        statusId: row.statusId,
        status: row.status,
        positionId: row.positionId,
        recruiterId: row.recruiterId,
        sourceId: row.sourceId,
        fitScore: row.fitScore,
        applicationDate: row.applicationDate,
        updatedAt: row.updatedAt,
        parsedData: safeJsonParse(row.parsedData, {}),
        position: row.positionTitle ? { title: row.positionTitle } : null,
        recruiter: row.recruiterName ? { name: row.recruiterName } : null,
        source: row.sourceName ? { name: row.sourceName } : null,
        isBlacklisted: row.isBlacklisted,
        transitionHistory: [],
        jobMatches: [],
        attachments: []
      }));

      const positionRows = Array.isArray(positionsResult?.rows) ? positionsResult.rows : [];
      initialAvailablePositions = positionRows.map((row: any) => ({
        id: row.id,
        title: row.title,
        department: row.department,
        isOpen: row.isOpen,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        recruiterName: row.recruiterName,
        gradeName: row.gradeName,
        gradeSlaDays: row.gradeSlaDays,
        gradeColor: row.gradeColor,
        customAttributes: {}
      }));

      const stageRows = Array.isArray(stagesResult?.rows) ? stagesResult.rows : [];
      initialAvailableStages = stageRows.map((row: any) => ({
        id: row.id,
        name: row.name,
        sort_order: row.sort_order,
        color: row.color,
        color_badge: row.color_badge,
        description: row.description
      }));
    } catch (error) {
      console.error('Error fetching candidate page initial data:', error);
      initialFetchError = `Failed to load candidate data: ${(error as any).message}`;
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

  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading candidates...</div>}>
        <SafeComponentWrapper
          fallbackTitle="Candidate Page Error"
          fallbackDescription="There was an issue loading the candidate page. This may be due to a temporary initialization problem."
        >
          <ErrorBoundary>
            <ApplicantsPageClient
              initialApplicants={initialApplicants}
              initialAvailablePositions={initialAvailablePositions}
              initialAvailableStages={initialAvailableStages}
              initialFetchError={initialFetchError}
              initialFilters={candidateInitialFilters}
            />
          </ErrorBoundary>
        </SafeComponentWrapper>
      </Suspense>
    </ErrorBoundary>
  );
}
