// src/app/page.tsx (Server Component)
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import DashboardPageClient from '@/components/dashboard/DashboardPageClient';
import type { Candidate, Position, UserProfile } from '@/lib/types';
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { getPool } from '@/lib/db';

export default async function DashboardPageServer() {
  let session: any = null;
  let initialCandidates: Candidate[] = [];
  let initialPositions: Position[] = [];
  let initialUsers: UserProfile[] = [];
  let fetchError: string | undefined = undefined;

  try {
    // Only fetch session on the server side, not during build
    session = await getServerSession(authOptions);
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
               r.id as "recruiterId", r.name as "recruiterName", r.email as "recruiterEmail"
        FROM "Candidate" c
        LEFT JOIN "Position" p ON c."positionId" = p.id
        LEFT JOIN "User" r ON c."recruiterId" = r.id
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
          fitScore: row.fitScore || null,
          status: row.status,
          applicationDate: row.applicationDate,
          recruiterId: row.recruiterId || null,
          recruiter: row.recruiterId ? {
            id: row.recruiterId,
            name: row.recruiterName,
            email: row.recruiterEmail || ''
          } : null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
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
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));

      // Transform users data
      initialUsers = usersResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        avatarUrl: row.avatarUrl,
        modulePermissions: row.modulePermissions || [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
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
