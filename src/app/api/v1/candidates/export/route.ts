export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';

// Helper function to format assignment justification
function formatAssignmentJustification(justification: any): string {
  if (!justification) return '';
  
  if (Array.isArray(justification)) {
    return justification.filter(Boolean).join('; ');
  }
  
  if (typeof justification === 'string') {
    return justification.split('\n').map(s => s.trim()).filter(Boolean).join('; ');
  }
  
  return '';
}

// Helper function to format job matches
function formatJobMatches(jobMatches: any[]): string {
  if (!jobMatches || jobMatches.length === 0) return '';
  
  return jobMatches.map(match => {
    const parts = [];
    if (match.jobTitle) parts.push(`Job: ${match.jobTitle}`);
    if (match.fitScore !== null && match.fitScore !== undefined) parts.push(`Score: ${Math.round(match.fitScore * 100)}%`);
    if (match.matchReasons && match.matchReasons.length > 0) parts.push(`Reasons: ${match.matchReasons.join(', ')}`);
    return parts.join(' | ');
  }).join('; ');
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  if (user.role !== 'Admin' &&  !user.modulePermissions?.includes('CANDIDATES_EXPORT')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to export candidates' }), { status: 403, headers: handleCors(req) });
  }

  const client = await getPool().connect();
  try {
    const query = `
      SELECT 
        c.*,
        p.title as "positionTitle", 
        p.department as "positionDepartment", 
        r.name as "recruiterName",
        COALESCE(
          json_agg(
            json_build_object(
              'jobTitle', jm."jobTitle",
              'fitScore', jm."fitScore",
              'matchReasons', jm."matchReasons",
              'jobDescriptionSummary', jm."job_description_summary"
            ) ORDER BY jm."fitScore" DESC NULLS LAST
          ) FILTER (WHERE jm.id IS NOT NULL),
          '[]'::json
        ) as job_matches
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" r ON c."recruiterId" = r.id
      LEFT JOIN "JobMatch" jm ON c.id = jm."candidateId"
      GROUP BY c.id, p.title, p.department, r.name
      ORDER BY c."updatedAt" DESC
    `;
    const result = await client.query(query);
    
    // Convert to CSV format
    const headers = [
      'ID', 'Name', 'Email', 'Phone', 'Status', 'Position', 'Department', 
      'Recruiter', 'Fit Score', 'Application Date', 'Updated At',
      'Applied Job', 'Applied Job Justification', 'Job Matches'
    ];
    
    const csvRows = [headers.join(',')];
    
    for (const row of result.rows) {
      const csvRow = [
        row.id,
        `"${(row.name || '').replace(/"/g, '""')}"`,
        row.email || '',
        row.phone || '',
        row.status || '',
        `"${(row.positionTitle || '').replace(/"/g, '""')}"`,
        `"${(row.positionDepartment || '').replace(/"/g, '""')}"`,
        `"${(row.recruiterName || '').replace(/"/g, '""')}"`,
        row.fitScore || '',
        row.applicationDate || '',
        row.updatedAt || '',
        `"${(row.positionTitle || '').replace(/"/g, '""')}"`,
        `"${formatAssignmentJustification(row.assignmentJustification).replace(/"/g, '""')}"`,
        `"${formatJobMatches(row.job_matches || []).replace(/"/g, '""')}"`
      ];
      csvRows.push(csvRow.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    
    return new Response(csvContent, {
      status: 200,
      headers: {
        ...handleCors(req),
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="candidates-export.csv"'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error exporting candidates', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 
