"use client";

import DashboardPageClient from '@/components/dashboard/DashboardPageClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import type { Candidate, Position, UserProfile } from '@/lib/types';
import './dashboard.css';

export default async function DashboardPage() {
  let initialCandidates: Candidate[] = [];
  let initialPositions: Position[] = [];
  let initialUsers: UserProfile[] = [];
  let fetchError: string | undefined = undefined;

  try {
    // Only fetch session on the server side, not during build
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return <DashboardPageClient 
               initialCandidates={[]} 
               initialPositions={[]} 
               initialUsers={[]} 
               authError={true} 
             />;
    }
    
    // Fetch data on server side
    const client = await getPool().connect();
    try {
      // Fetch candidates
      const candidatesQuery = `
        SELECT c.*, p.id as "positionId", p.title as "positionTitle", p.department as "positionDepartment", p."positionLevel" as "positionLevel", p."isOpen" as "positionIsOpen",
               r.id as "recruiterId", r.name as "recruiterName", r.email as "recruiterEmail",
               COALESCE(th_data.history, '[]'::json) as "transitionHistory"
        FROM "Candidate" c
        LEFT JOIN "Position" p ON c."positionId" = p.id
        LEFT JOIN "User" r ON c."recruiterId" = r.id
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
      initialCandidates = candidatesResult.rows.map(row => {
        let customAttributes = row.customAttributes || {};
        if (typeof customAttributes === 'string') {
          try {
            customAttributes = JSON.parse(customAttributes);
          } catch {
            customAttributes = {};
          }
        }
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone || null,
          avatarUrl: row.avatarUrl || null,
          dataAiHint: row.dataAiHint || null,
          resumePath: row.resumePath || null,
          parsedData: row.parsedData || { personal_info: {}, contact_info: {} },
          customAttributes,
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
          status: row.status,
          applicationDate: row.applicationDate ? row.applicationDate.toISOString() : new Date().toISOString(),
          recruiterId: row.recruiterId || null,
          recruiter: row.recruiterId ? {
            id: row.recruiterId,
            name: row.recruiterName,
            email: row.recruiterEmail || ''
          } : null,
          createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
          transitionHistory: row.transitionHistory || [],
        };
      });

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
        avatarUrl: row.avatarUrl,
        createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
      }));

    } finally {
      client.release();
    }
    
    return <DashboardPageClient 
             initialCandidates={initialCandidates} 
             initialPositions={initialPositions} 
             initialUsers={initialUsers} 
             initialFetchError={undefined}
           />;
           
  } catch (error) {
    fetchError = (error as Error).message || "Failed to load initial dashboard data.";
    return <DashboardPageClient 
             initialCandidates={[]} 
             initialPositions={[]} 
             initialUsers={[]} 
             initialFetchError={fetchError}
           />;
  }
}
