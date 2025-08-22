// src/app/candidates/page.tsx - Server Component
import { getServerSession } from 'next-auth/next';
import { CandidatesPageClient } from '@/components/candidates/CandidatesPageClient';
import type { Candidate, Position, RecruitmentStage, UserProfile } from '@/lib/types';
import { authOptions } from '@/lib/auth';
import { CandidateQueueProvider } from "@/components/candidates/CandidateImportUploadQueue";
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import SafeComponentWrapper from '@/components/ui/safe-component-wrapper';
import { getPool } from '@/lib/db';

export default async function CandidatesPageServer() {
  const session = await getServerSession(authOptions);
  
  let initialCandidates: Candidate[] = [];
  let initialAvailablePositions: Position[] = [];
  let initialAvailableStages: RecruitmentStage[] = [];
  let initialFetchError: string | undefined = undefined;

  // Only fetch data if user is authenticated
  if (session?.user) {
    try {
      const client = await getPool().connect();
      try {
        // Fetch initial data in parallel using direct database queries
        const [candidatesResult, positionsResult, stagesResult] = await Promise.all([
          // Fetch candidates with basic info
          client.query(`
            SELECT c.*, p.id as "positionId", p.title as "positionTitle", p.department as "positionDepartment", p."positionLevel" as "positionLevel", p."isOpen" as "positionIsOpen",
                   r.id as "recruiterId", r.name as "recruiterName", r.email as "recruiterEmail", r."avatarUrl" as "recruiterAvatarUrl",
                   cs.id as "sourceId", cs.name as "sourceName", cs.description as "sourceDescription",
                   COALESCE(th_data.history, '[]'::json) as "transitionHistory",
                   COALESCE(jm_data.jobMatches, '[]'::json) as "jobMatches"
            FROM "Candidate" c
            LEFT JOIN "Position" p ON c."positionId" = p.id
            LEFT JOIN "User" r ON c."recruiterId" = r.id
            LEFT JOIN "CandidateSource" cs ON c."sourceId" = cs.id
            LEFT JOIN LATERAL (
              SELECT json_agg(
                json_build_object(
                  'id', th.id, 'date', th.date, 'stage', th.stage, 'notes', th.notes
                ) ORDER BY th.date DESC
              ) AS history
              FROM "TransitionRecord" th
              WHERE th."candidateId" = c.id
            ) AS th_data ON true
            LEFT JOIN LATERAL (
              SELECT json_agg(
                json_build_object(
                  'id', jm.id, 'jobId', jm."jobId", 'jobTitle', jm."jobTitle", 'fitScore', jm."fitScore", 
                                  'matchReasons', jm."matchReasons", 'jobDescriptionSummary', jm."job_description_summary",
                  'createdAt', jm."createdAt", 'updatedAt', jm."updatedAt"
                ) ORDER BY jm."fitScore" DESC
              ) AS jobMatches
              FROM "JobMatch" jm
              WHERE jm."candidateId" = c.id
            ) AS jm_data ON true
            ORDER BY c."lastUpdate" DESC
            LIMIT 50;
          `),
          
          // Fetch positions
          client.query(`
            SELECT p.*, u.name as "recruiterName", g.name as "gradeName", g."sla_days" as "gradeSlaDays", g.color as "gradeColor",
                   json_build_object(
                     'id', p."gradeId",
                     'name', g.name,
                     'label', g.label,
                     'slaDays', g."sla_days",
                     'color', g.color
                   ) as grade
            FROM "Position" p 
            LEFT JOIN "User" u ON p."recruiterId" = u.id
            LEFT JOIN "Grade" g ON p."gradeId" = g.id
            ORDER BY p."createdAt" DESC;
          `),
          
          // Fetch recruitment stages
          client.query('SELECT * FROM "RecruitmentStage" ORDER BY "order" ASC;')
        ]);

        // Transform candidates data
        initialCandidates = candidatesResult.rows.map((row: any) => ({
          ...row,
          transitionHistory: Array.isArray(row.transitionHistory) ? row.transitionHistory : [],
          jobMatches: Array.isArray(row.jobMatches) ? row.jobMatches : [],
          parsedData: row.parsedData ? JSON.parse(row.parsedData) : null,
          customAttributes: row.customAttributes ? JSON.parse(row.customAttributes) : {},
          attachments: [] // Will be fetched separately if needed
        }));

        // Transform positions data
        initialAvailablePositions = positionsResult.rows.map((row: any) => ({
          ...row,
          customAttributes: row.customAttributes ? JSON.parse(row.customAttributes) : {},
          grade: row.grade ? JSON.parse(row.grade) : null
        }));

        // Transform stages data
        initialAvailableStages = stagesResult.rows.map((row: any) => ({
          ...row,
          color: row.color || '#3B82F6'
        }));

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error fetching initial data:', error);
      initialFetchError = 'Failed to load initial data';
    }
  }
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading candidates...</div>}>
        <SafeComponentWrapper 
          fallbackTitle="Candidates Page Error"
          fallbackDescription="There was an issue loading the candidates page. This may be due to a temporary initialization problem."
        >
          <CandidateQueueProvider>
            <ErrorBoundary>
              <CandidatesPageClient
                initialCandidates={initialCandidates}
                initialAvailablePositions={initialAvailablePositions}
                initialAvailableStages={initialAvailableStages}
                initialFetchError={initialFetchError}
              />
            </ErrorBoundary>
          </CandidateQueueProvider>
        </SafeComponentWrapper>
      </Suspense>
    </ErrorBoundary>
  );
}
