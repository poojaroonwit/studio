// src/app/page.tsx (Server Component)
import { getServerSession } from 'next-auth/next';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { authOptions } from '@/lib/auth';
import DashboardPageClient from '@/components/dashboard/DashboardPageClient';
import type { Candidate, Position, UserProfile } from '@/lib/types';
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { getPool } from '@/lib/db';
import { safeJsonParse } from '@/lib/utils';

export default async function DashboardPageServer() {
  let session: any = null;
  let initialCandidates: Candidate[] = [];
  let initialPositions: Position[] = [];
  let initialUsers: UserProfile[] = [];
  let fetchError: string | undefined = undefined;
  let stageIds: Record<string, string | undefined> = {};
  let stageNames: Record<string, string> = {};

  try {
    // Only fetch session on the server side, not during build
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return <DashboardPageClient 
               initialCandidates={[]} 
               initialPositions={[]} 
               initialUsers={[]} 
               authError={true} 
               initialStageIds={{}}
               initialStageNames={{}}
             />;
    }
    
    // Fetch data on server side
    let client: any = null;
    try {
      client = await getPool().connect();
      
      // Fetch candidates
      const candidatesQuery = `
        SELECT c.*, p.id as "positionId", p.title as "positionTitle", p.department as "positionDepartment", p."positionLevel" as "positionLevel", p."isOpen" as "positionIsOpen",
               r.id as "recruiterId", r.name as "recruiterName", r.email as "recruiterEmail", r."avatarUrl" as "recruiterAvatarUrl",
               rs.id as "statusId", rs.name as "status",
               COALESCE(th_data.history, '[]'::json) as "transitionHistory"
        FROM "Candidate" c
        LEFT JOIN "Position" p ON c."positionId" = p.id
        LEFT JOIN "User" r ON c."recruiterId" = r.id
        LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
        LEFT JOIN LATERAL (
          SELECT json_agg(
            json_build_object(
              'id', th.id, 'date', th.date, 'stage', th.stage, 'notes', th.notes
            ) ORDER BY th.date DESC
          ) AS history
          FROM "TransitionRecord" th
          WHERE th."candidateId" = c.id
        ) AS th_data ON true
        ORDER BY c."applicationDate" DESC;
      `;
      const candidatesResult = await client.query(candidatesQuery);
      
      // Fetch positions
      const positionsQuery = 'SELECT * FROM "Position" ORDER BY "createdAt" DESC;';
      const positionsResult = await client.query(positionsQuery);
      
      // Fetch users
      const usersQuery = 'SELECT * FROM "User" ORDER BY "createdAt" DESC;';
      const usersResult = await client.query(usersQuery);

      // Transform candidates data
      initialCandidates = candidatesResult.rows.map(row => ({
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
          fitScore: (() => {
            let score = row.fitScore ?? 0;
            // Check if there's a score in parsedData.job_applied and use it if it's different
            if (row.parsedData && typeof row.parsedData === 'object' && row.parsedData.job_applied && typeof row.parsedData.job_applied.fitScore === 'number') {
              score = row.parsedData.job_applied.fitScore;
            }
            // Normalize the score to handle decimal scores properly
            if (score === null || score === undefined) return 0;
            if (score > 0 && score < 1) return Math.round(score * 100);
            if (score >= 0 && score <= 100) return Math.round(score);
            return Math.max(0, Math.min(100, Math.round(score)));
          })(),
          statusId: row.statusId || null,
          status: row.status || 'Unknown', // Ensure status is never null for backward compatibility
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
          transitionHistory: row.transitionHistory || [],
        }));

      // Transform positions data
      initialPositions = positionsResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        department: row.department,
        description: row.description,
        requirements: row.requirements,
        isOpen: row.isOpen,
        positionLevel: row.positionLevel,
        createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
      }));

      // Transform users data
      initialUsers = usersResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        avatarUrl: row.avatarUrl || null,
        createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
      }));

      // Fetch recruitment stages for stage IDs
      const stagesQuery = 'SELECT id, name FROM "RecruitmentStage" ORDER BY "sort_order" ASC;';
      const stagesResult = await client.query(stagesQuery);
      
      // Create stage IDs mapping
      stagesResult.rows.forEach(row => {
        const name = row.name.toLowerCase();
        stageIds[name] = row.id;
        stageNames[row.id] = row.name;
        
        // Map specific stage names to their IDs
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
      fetchError = `Failed to load initial data: ${(error as any).message}`;
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
    
    return <DashboardPageClient 
             initialCandidates={initialCandidates} 
             initialPositions={initialPositions} 
             initialUsers={initialUsers} 
             initialFetchError={fetchError}
             initialStageIds={stageIds}
             initialStageNames={stageNames}
           />;
           
  } catch (error) {
    fetchError = (error as Error).message || "Failed to load initial dashboard data.";
    return <DashboardPageClient 
             initialCandidates={[]} 
             initialPositions={[]} 
             initialUsers={[]} 
             initialFetchError={fetchError}
             initialStageIds={{}}
             initialStageNames={{}}
           />;
  }
}
