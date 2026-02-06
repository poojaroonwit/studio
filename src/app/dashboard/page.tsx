// src/app/dashboard/page.tsx - Server Component
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { auth } from '@/auth';
import DashboardPageClient, { DashboardMetrics } from '@/components/dashboard/DashboardPageClient';
import { getPool } from '@/lib/db';
import { safeJsonParse } from '@/lib/utils';
import type { Applicant, Position, UserProfile } from '@/lib/types';
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import SafeComponentWrapper from '@/components/ui/safe-component-wrapper';
import { hasPermission } from '@/lib/permissions';
import { fetchDashboardMetrics } from '@/lib/dashboard-metrics';

export default async function DashboardPageServer() {
  let initialApplicants: Applicant[] = [];
  let initialPositions: Position[] = [];
  let initialUsers: UserProfile[] = [];
  let initialMetrics: DashboardMetrics = {
    kpis: {
      activeApplicants: 0,
      openHeadcounts: 0,
      hiredThisMonth: 0,
      rejectedThisMonth: 0,
      highScoreApplicants: 0,
      applicationsThisWeek: 0,
      avgTimeToHire: '0.00'
    },
    timeSeries: [],
    scoreDistribution: [],
    pipelineStages: [],
    pipelineRecruiters: []
  };
  let initialFetchError: string | undefined = undefined;
  let stageIds: Record<string, string | undefined> = {};
  let stageNames: Record<string, string> = {};

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return (
        <ErrorBoundary>
          <Suspense fallback={<div>Loading dashboard...</div>}>
            <SafeComponentWrapper 
              fallbackTitle="Dashboard Page Error"
              fallbackDescription="There was an issue loading the dashboard page."
            >
              <DashboardPageClient 
                initialApplicants={[]} 
                initialPositions={[]} 
                initialUsers={[]} 
                initialMetrics={initialMetrics}
                authError={true}
                initialStageIds={{}}
                initialStageNames={{}}
              />
            </SafeComponentWrapper>
          </Suspense>
        </ErrorBoundary>
      );
    }
    
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      const userId = session.user.id;
      const canViewAll = hasPermission(session.user, 'Applicants_VIEW');

      // Fetch optimized metrics
      initialMetrics = await fetchDashboardMetrics(client, userId, canViewAll);

      // Fetch other data in parallel
      const applicantsQuery = `
        SELECT c.id, c.name, c.email, c.phone, c."avatarUrl", c."dataAiHint", c."resumePath", c."parsedData", c."customAttributes", c."fitScore", c."applicationDate", c."createdAt", c."updatedAt",
               p.id as "positionId", p.title as "positionTitle", p.department as "positionDepartment", p."positionLevel" as "positionLevel", p."isOpen" as "positionIsOpen",
               r.id as "recruiterId", r.name as "recruiterName", r.email as "recruiterEmail", r."avatarUrl" as "recruiterAvatarUrl",
               rs.id as "statusId", rs.name as "statusName"
        FROM "applicant" c
        LEFT JOIN "Position" p ON c."positionId" = p.id
        LEFT JOIN "User" r ON c."recruiterId" = r.id
        LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
        WHERE ($1 = true OR c."recruiterId" = $2 OR c."recruiterId" IS NULL)
        ORDER BY c."applicationDate" DESC
        LIMIT 200;
      `;
      
      const positionsQuery = 'SELECT * FROM "Position" ORDER BY "createdAt" DESC;';
      const usersQuery = 'SELECT id, name, email, role, "avatarUrl", "createdAt", "updatedAt" FROM "User" ORDER BY "createdAt" DESC;';
      const stagesQuery = 'SELECT id, name FROM "RecruitmentStage" ORDER BY "sort_order" ASC;';

      const [applicantsResult, positionsResult, usersResult, stagesResult] = await Promise.all([
        client.query(applicantsQuery, [canViewAll, userId]),
        client.query(positionsQuery),
        client.query(usersQuery),
        client.query(stagesQuery)
      ]);

      // Transform Applicants data - omitting transitionHistory as it's expensive and now pre-calculated
      initialApplicants = applicantsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone || null,
        avatarUrl: row.avatarUrl || null,
        dataAiHint: row.dataAiHint || null,
        resumePath: row.resumePath || null,
        parsedData: safeJsonParse(row.parsedData, { personal_info: { firstname: '', lastname: '' }, contact_info: { email: '' } }),
        customAttributes: safeJsonParse(row.customAttributes, {}),
        positionId: row.positionId || null,
        position: row.positionId ? {
          id: row.positionId,
          title: row.positionTitle,
          department: row.positionDepartment,
          positionLevel: row.positionLevel,
          isOpen: row.positionIsOpen || false
        } : null,
        fitScore: row.fitScore || 0,
        statusId: row.statusId || null,
        status: row.statusName || 'Unknown',
        applicationDate: row.applicationDate ? row.applicationDate.toISOString() : new Date().toISOString(),
        recruiterId: row.recruiterId || null,
        recruiter: row.recruiterId ? {
          id: row.recruiterId,
          name: row.recruiterName,
          email: row.recruiterEmail || '',
          avatarUrl: row.recruiterAvatarUrl || null
        } : null,
        createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
        transitionHistory: [], // Not needed for primary dashboard display
      }));

      // Transform positions data
      initialPositions = positionsResult.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        department: row.department,
        isOpen: row.isOpen,
        positionLevel: row.positionLevel,
        createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
      }));

      // Transform users data
      initialUsers = usersResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        avatarUrl: row.avatarUrl,
        createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
      }));

      // Create stage IDs mapping
      stagesResult.rows.forEach((row: any) => {
        const name = row.name.toLowerCase();
        stageIds[name] = row.id;
        stageNames[row.id] = row.name;
        
        if (name === 'applied') stageIds.applied = row.id;
        if (name === 'screening') stageIds.screening = row.id;
        if (name === 'shortlisted') stageIds.shortlisted = row.id;
        if (name === 'interview scheduled') stageIds.interviewScheduled = row.id;
        if (name === 'interviewing') stageIds.interviewing = row.id;
        if (name === 'offer extended') stageIds.offerExtended = row.id;
        if (name === 'hired') stageIds.hired = row.id;
        if (name === 'on hold') stageIds.onHold = row.id;
        if (name === 'rejected') stageIds.rejected = row.id;
      });

    } finally {
      client.release();
    }
    
    return (
      <ErrorBoundary>
        <Suspense fallback={<div>Loading dashboard...</div>}>
          <SafeComponentWrapper 
            fallbackTitle="Dashboard Page Error"
            fallbackDescription="There was an issue loading the dashboard page."
          >
            <DashboardPageClient 
              initialApplicants={initialApplicants} 
              initialPositions={initialPositions} 
              initialUsers={initialUsers} 
              initialMetrics={initialMetrics}
              initialFetchError={undefined}
              initialStageIds={stageIds}
              initialStageNames={stageNames}
            />
          </SafeComponentWrapper>
        </Suspense>
      </ErrorBoundary>
    );
           
  } catch (error) {
    initialFetchError = (error as Error).message || "Failed to load initial dashboard data.";
    return (
      <ErrorBoundary>
        <Suspense fallback={<div>Loading dashboard...</div>}>
          <SafeComponentWrapper 
            fallbackTitle="Dashboard Page Error"
            fallbackDescription="There was an issue loading the dashboard page."
          >
            <DashboardPageClient 
              initialApplicants={[]} 
              initialPositions={[]} 
              initialUsers={[]} 
              initialMetrics={initialMetrics}
              initialFetchError={initialFetchError}
              initialStageIds={{}}
              initialStageNames={{}}
            />
          </SafeComponentWrapper>
        </Suspense>
      </ErrorBoundary>
    );
  }
}
