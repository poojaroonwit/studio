import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_EXPORT')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to export candidates' }), { status: 403, headers: handleCors(req) });
  }

  const client = await getPool().connect();
  try {
    const query = `
      SELECT c.*, p.title as "positionTitle", p.department as "positionDepartment", r.name as "recruiterName"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" r ON c."recruiterId" = r.id
      ORDER BY c."updatedAt" DESC
    `;
    const result = await client.query(query);
    
    // Convert to CSV format
    const headers = [
      'ID', 'Name', 'Email', 'Phone', 'Status', 'Position', 'Department', 
      'Recruiter', 'Fit Score', 'Application Date', 'Updated At'
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
        row.updatedAt || ''
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