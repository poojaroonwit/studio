// src/app/Applicants/page.tsx - Server Component
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { ApplicantsPageClient } from '@/components/applicants/ApplicantsPageClient';
import type { Applicant, Position, RecruitmentStage, UserProfile } from '@/lib/types';
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import SafeComponentWrapper from '@/components/ui/safe-component-wrapper';
import { getPool } from '@/lib/db';
import { safeJsonParse } from '@/lib/utils';

export default async function ApplicantsPageServer() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session.user, 'applicantS_VIEW')) {
    redirect('/unauthorized');
  }

  let initialApplicants: Applicant[] = [];
  let initialAvailablePositions: Position[] = [];
  let initialAvailableStages: RecruitmentStage[] = [];
  let initialFetchError: string | undefined = undefined;

  // Only fetch data if user is authenticated
  if (session?.user) {
    let client: any = null;
    try {
      client = await getPool().connect();

      // OPTIMIZED: Fetch only essential data for filters and initial display
      let applicantsResult, positionsResult, stagesResult;

      try {
        // Simplified query - only fetch basic Applicant data needed for filters
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
          ORDER BY c."applicationDate" DESC
          LIMIT 50; -- Only fetch first 50 for initial display
        `);
      } catch (error) {
        console.error('Error fetching Applicants:', error);
        throw error;
      }

      try {
        // Fetch positions for filters
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
        console.error('Error fetching positions:', error);
        throw error;
      }

      try {
        // Fetch recruitment stages for filters
        stagesResult = await client.query('SELECT * FROM "RecruitmentStage" ORDER BY sort_order ASC;');
      } catch (error) {
        console.error('Error fetching recruitment stages:', error);
        throw error;
      }

      // Transform Applicants data - minimal transformation
      const applicantRows = Array.isArray(applicantsResult?.rows) ? applicantsResult.rows : []
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
        // Remove complex data that's not needed for initial display
        transitionHistory: [],
        jobMatches: [],
        attachments: []
      }));

      // Transform positions data - minimal transformation
      const positionRows = Array.isArray(positionsResult?.rows) ? positionsResult.rows : []
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

      // Transform stages data
      const stageRows = Array.isArray(stagesResult?.rows) ? stagesResult.rows : []
      initialAvailableStages = stageRows.map((row: any) => ({
        id: row.id,
        name: row.name,
        sort_order: row.sort_order,
        color: row.color,
        color_badge: row.color_badge,
        description: row.description
      }));

    } catch (error) {
      console.error('Error fetching initial data:', error);
      console.error('Error details:', {
        message: (error as any).message,
        code: (error as any).code,
        detail: (error as any).detail,
        hint: (error as any).hint,
        position: (error as any).position,
        where: (error as any).where
      });
      initialFetchError = `Failed to load initial data: ${(error as any).message}`;
    } finally {
      // ✅ CRITICAL FIX: Always release the database client
      if (client) {
        try {
          client.release();
        } catch (releaseError) {
          console.error('Error releasing database client:', releaseError);
        }
      }
    }
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading applicants...</div>}>
        <SafeComponentWrapper
          fallbackTitle="Applicants Page Error"
          fallbackDescription="There was an issue loading the applicants page. This may be due to a temporary initialization problem."
        >
          <ErrorBoundary>
            <ApplicantsPageClient
              initialApplicants={initialApplicants}
              initialAvailablePositions={initialAvailablePositions}
              initialAvailableStages={initialAvailableStages}
              initialFetchError={initialFetchError}
            />
          </ErrorBoundary>
        </SafeComponentWrapper>
      </Suspense>
    </ErrorBoundary>
  );
}
