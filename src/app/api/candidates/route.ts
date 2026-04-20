import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { auth } from '@/auth';
import { normalizeFitScore } from '@/lib/scoreUtils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CandidatePositionRow = {
  id: string;
  [key: string]: any;
};

type CandidateApplicantRow = {
  positionId: string;
  fitScore?: number | string | null;
  [key: string]: any;
};

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const isOpenParam = searchParams.get('isOpen');
  const mineOnlyParam = searchParams.get('mineOnly');
  const pipelineOnlyParam = searchParams.get('pipelineOnly');
  
  const isOpen = isOpenParam === 'any' ? 'any' : (isOpenParam === null ? true : isOpenParam === 'true'); 
  const mineOnly = mineOnlyParam === null ? true : mineOnlyParam === 'true';

  // We check permissions
  const canViewAll = hasPermission(session.user, 'applicantS_VIEW_ALL');
  const isAdmin = session.user.role === 'Admin';
  const hasFullView = canViewAll || isAdmin;
  
  // If user doesn't have full view, forcing mineOnly to true
  const effectivelyMineOnly = !hasFullView || mineOnly;

  let client;
  try {
    client = await getPool().connect();
    
    let positionQuery: string;
    let queryParams: any[] = [];
    let whereClauses: string[] = [];
    
    // Status filter (isOpen)
    if (isOpenParam !== 'any') {
      whereClauses.push(`p."isOpen" = $${queryParams.length + 1}`);
      queryParams.push(isOpen === 'any' ? true : isOpen); // fallback if logic above fails
    }

    // Association filter
    if (effectivelyMineOnly) {
      whereClauses.push(`(pi."userId" = $${queryParams.length + 1} OR p."recruiterId" = $${queryParams.length + 1})`);
      queryParams.push(session.user.id);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    positionQuery = `
      SELECT DISTINCT p.*, g.name as "gradeName", g.color as "gradeColor"
      FROM "Position" p
      LEFT JOIN "Grade" g ON p."gradeId" = g.id
      LEFT JOIN "PositionInterviewer" pi ON p.id = pi."positionId"
      ${whereString}
      ORDER BY p."createdAt" DESC
    `;
    
    const positionResult = await client.query(positionQuery, queryParams);
    const positions = positionResult.rows as CandidatePositionRow[];

    if (positions.length === 0) {
      return NextResponse.json({ positions: [] });
    }

    const positionIds = positions.map(p => p.id);

    // 2. Fetch recruitment stages to filter by status if pipelineOnly is requested
    const hasPipelineFocus = pipelineOnlyParam && pipelineOnlyParam !== 'false';
    let pipelineFilterClause = '';
    let applicantQueryParams: any[] = [positionIds];

    if (hasPipelineFocus) {
      const statusIds = pipelineOnlyParam.split(',').filter(id => id.length > 0);
      if (statusIds.length > 0) {
        pipelineFilterClause = `AND c."statusId" = ANY($2::uuid[])`;
        applicantQueryParams.push(statusIds);
      }
    }

    // 3. Fetch applicants for these positions
    const applicantQuery = `
      SELECT c.*, rs.name as "statusName", rs.color_badge as "statusColor", rs.sort_order as "statusOrder"
      FROM "Applicant" c
      LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
      WHERE c."positionId" = ANY($1::uuid[])
      ${pipelineFilterClause}
      ORDER BY c."applicationDate" DESC
    `;

    const applicantResult = await client.query(applicantQuery, applicantQueryParams);
    const applicants = applicantResult.rows as CandidateApplicantRow[];

    // 4. Group applicants by position
    const groupedData = positions.map(pos => {
      const posApplicants = applicants
        .filter(app => app.positionId === pos.id)
        .map(app => ({
          ...app,
          fitScore: app.fitScore === null || app.fitScore === undefined
            ? null
            : normalizeFitScore(Number(app.fitScore)),
        }));
      return {
        ...pos,
        applicants: posApplicants
      };
    }).filter(pos => !hasPipelineFocus || pos.applicants.length > 0); // If pipelineOnly, don't show empty positions

    return NextResponse.json({ positions: groupedData });

  } catch (error: any) {
    console.error('[Candidates API] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
