// src/app/api/candidates/export/route.ts
import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { getPool } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import * as XLSX from 'xlsx';
import { NextRequest } from 'next/server';

/**
 * @openapi
 * /api/candidates/export:
 *   get:
 *     summary: Export candidates
 *     description: Export all candidates.
 *     responses:
 *       200:
 *         description: Exported candidates data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *             examples:
 *               success:
 *                 summary: Example response
 *                 value:
 *                   ok: true
 */

// Helper function to convert JSON object to CSV row
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (stringValue.includes(',')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function convertToCsv(data: any[]): string {
  if (!data || data.length === 0) {
    return '';
  }
  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.map(escapeCsvValue).join(','));

  for (const row of data) {
    const values = headers.map(header => escapeCsvValue(row[header]));
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

// Helper function to format date for export
function formatDateForExport(date: string | Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Helper function to extract data from parsedData JSON
function extractFromParsedData(parsedData: any, path: string): any {
  if (!parsedData || typeof parsedData !== 'object') return null;
  
  const keys = path.split('.');
  let current = parsedData;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return null;
    }
  }
  
  return current;
}

// Helper function to transform candidate data for export
function transformCandidateForExport(candidate: any): any {
  const parsedData = candidate.parsedData || {};
  
  return {
    'Name*': candidate.name || '',
    'Email*': candidate.email || '',
    'Phone': candidate.phone || '',
    'Position ID': candidate.positionId || '',
    'Recruiter ID': candidate.recruiterId || '',
    'Fit Score (0-100)': candidate.fitScore?.toString() || '',
    'Status*': candidate.status || '',
    'Application Date': formatDateForExport(candidate.applicationDate),
    'Location': extractFromParsedData(parsedData, 'personal_info.location') || '',
    'Introduction/About Me': extractFromParsedData(parsedData, 'personal_info.introduction_aboutme') || '',
    'Education (JSON)': parsedData.education ? JSON.stringify(parsedData.education) : '',
    'Experience (JSON)': parsedData.experience ? JSON.stringify(parsedData.experience) : '',
    'Skills (JSON)': parsedData.skills ? JSON.stringify(parsedData.skills) : '',
    'Job Suitable (JSON)': parsedData.job_suitable ? JSON.stringify(parsedData.job_suitable) : '',
    'Custom Attributes (JSON)': candidate.customAttributes ? JSON.stringify(candidate.customAttributes) : '',
  };
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    await logAudit('WARN', 'Unauthorized attempt to export candidates', 'API:Candidates:Export', null);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to export candidates
  if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('CANDIDATES_EXPORT')) {
    await logAudit('WARN', `Forbidden attempt to export candidates by ${actingUserName}`, 'API:Candidates:Export', actingUserId);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to export candidates' }, { status: 403 });
  }

  try {
    const client = await getPool().connect();
    
    // Parse query parameters for filtering
    const url = new URL(request.url);
    
    // Parse advanced query parameter if present
    const advancedQuery = url.searchParams.get('query');
    let advancedFilters: { [key: string]: string | null } = {};
    
    if (advancedQuery) {
      console.log('Candidates Export API: Processing advanced query:', advancedQuery);
      const parts = advancedQuery.split(' ').filter(part => part.includes(':'));
      
      parts.forEach(part => {
        const colonIndex = part.indexOf(':');
        if (colonIndex === -1) return;
        
        const key = part.substring(0, colonIndex);
        const value = part.substring(colonIndex + 1);
        if (!key || !value) return;
        
        switch (key.toLowerCase()) {
          case 'name':
            advancedFilters.name = value;
            break;
          case 'email':
            advancedFilters.email = value;
            break;
          case 'phone':
            advancedFilters.phone = value;
            break;
          case 'positionid':
            advancedFilters.positionId = value;
            break;
          case 'status':
            advancedFilters.status = value;
            break;
          case 'recruiterid':
            advancedFilters.recruiterId = value;
            break;
          case 'applicationdatestart':
            advancedFilters.applicationDateStart = value;
            break;
          case 'applicationdateend':
            advancedFilters.applicationDateEnd = value;
            break;
        }
      });
      console.log('Candidates Export API: Advanced filters parsed:', advancedFilters);
    }
    
    // Get individual parameters, giving priority to explicit parameters over advanced query
    const name = url.searchParams.get('name') || advancedFilters.name;
    const email = url.searchParams.get('email') || advancedFilters.email;
    const phone = url.searchParams.get('phone') || advancedFilters.phone;
    const positionId = url.searchParams.get('positionId') || advancedFilters.positionId;
    const status = url.searchParams.get('status') || advancedFilters.status;
    const education = url.searchParams.get('education');
    const minAppliedJobFitScore = url.searchParams.get('minAppliedJobFitScore');
    const maxAppliedJobFitScore = url.searchParams.get('maxAppliedJobFitScore');
    const applicationDateStart = url.searchParams.get('applicationDateStart') || advancedFilters.applicationDateStart;
    const applicationDateEnd = url.searchParams.get('applicationDateEnd') || advancedFilters.applicationDateEnd;
    const recruiterId = url.searchParams.get('recruiterId') || advancedFilters.recruiterId;
    
    // Build WHERE clause based on filters
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (name) {
      whereConditions.push(`c.name ILIKE $${paramIndex}`);
      queryParams.push(`%${name}%`);
      paramIndex++;
    }
    
    if (email) {
      whereConditions.push(`c.email ILIKE $${paramIndex}`);
      queryParams.push(`%${email}%`);
      paramIndex++;
    }
    
    if (phone) {
      whereConditions.push(`c.phone ILIKE $${paramIndex}`);
      queryParams.push(`%${phone}%`);
      paramIndex++;
    }
    
    if (positionId) {
      const positionIds = positionId.split(',');
      if (positionIds.length === 1) {
        whereConditions.push(`c."positionId" = $${paramIndex}`);
        queryParams.push(positionIds[0]);
        paramIndex++;
      } else {
        whereConditions.push(`c."positionId" = ANY($${paramIndex})`);
        queryParams.push(positionIds);
        paramIndex++;
      }
    }
    
    if (status) {
      const statuses = status.split(',');
      if (statuses.length === 1) {
        whereConditions.push(`c.status = $${paramIndex}`);
        queryParams.push(statuses[0]);
        paramIndex++;
      } else {
        whereConditions.push(`c.status = ANY($${paramIndex})`);
        queryParams.push(statuses);
        paramIndex++;
      }
    }
    
    if (education) {
      whereConditions.push(`c."parsedData"->>'education' ILIKE $${paramIndex}`);
      queryParams.push(`%${education}%`);
      paramIndex++;
    }
    
    if (minAppliedJobFitScore !== null && minAppliedJobFitScore !== undefined) {
      whereConditions.push(`c."fitScore" >= $${paramIndex}`);
      queryParams.push(parseInt(minAppliedJobFitScore));
      paramIndex++;
    }
    
    if (maxAppliedJobFitScore !== null && maxAppliedJobFitScore !== undefined) {
      whereConditions.push(`c."fitScore" <= $${paramIndex}`);
      queryParams.push(parseInt(maxAppliedJobFitScore));
      paramIndex++;
    }
    
    if (applicationDateStart) {
      whereConditions.push(`c."applicationDate" >= $${paramIndex}`);
      queryParams.push(new Date(applicationDateStart));
      paramIndex++;
    }
    
    if (applicationDateEnd) {
      whereConditions.push(`c."applicationDate" <= $${paramIndex}`);
      queryParams.push(new Date(applicationDateEnd));
      paramIndex++;
    }
    
    if (recruiterId) {
      const recruiterIds = recruiterId.split(',');
      if (recruiterIds.length === 1) {
        whereConditions.push(`c."recruiterId" = $${paramIndex}`);
        queryParams.push(recruiterIds[0]);
        paramIndex++;
      } else {
        whereConditions.push(`c."recruiterId" = ANY($${paramIndex})`);
        queryParams.push(recruiterIds);
        paramIndex++;
      }
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get candidates with position and recruiter information
    const query = `
      SELECT 
        c.*,
        p.title as position_title,
        u.name as recruiter_name
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      ${whereClause}
      ORDER BY c."applicationDate" DESC
    `;
    
    const result = await client.query(query, queryParams);
    client.release();

    // Transform data for export
    const exportData = result.rows.map(transformCandidateForExport);
    
    // Check if user wants Excel format (default) or CSV
    const format = url.searchParams.get('format') || 'excel';
    
    if (format === 'excel') {
      // Create Excel file
      const workbook = XLSX.utils.book_new();
      
      // Create the main data worksheet
      const dataWorksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths for better readability
      const columnWidths = [
        { wch: 20 }, // Name
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 36 }, // Position ID
        { wch: 36 }, // Recruiter ID
        { wch: 15 }, // Fit Score
        { wch: 15 }, // Status
        { wch: 15 }, // Application Date
        { wch: 20 }, // Location
        { wch: 40 }, // Introduction
        { wch: 50 }, // Education
        { wch: 50 }, // Experience
        { wch: 50 }, // Skills
        { wch: 50 }, // Job Suitable
        { wch: 50 }  // Custom Attributes
      ];
      
      dataWorksheet['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, dataWorksheet, 'Candidates Export');
      
      // Generate Excel file buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      await logAudit('AUDIT', `Candidates exported as Excel by ${actingUserName}. ${result.rows.length} candidates exported.`, 'API:Candidates:Export', actingUserId, { 
        exportCount: result.rows.length,
        format: 'Excel' 
      });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="candidates_export.xlsx"',
        },
      });
    } else {
      // CSV format
      const csvData = convertToCsv(exportData);
      
      await logAudit('AUDIT', `Candidates exported as CSV by ${actingUserName}. ${result.rows.length} candidates exported.`, 'API:Candidates:Export', actingUserId, { 
        exportCount: result.rows.length,
        format: 'CSV' 
      });

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="candidates_export.csv"',
        },
      });
    }
  } catch (error) {
    await logAudit('ERROR', `Failed to export candidates by ${actingUserName}. Error: ${(error as Error).message}`, 'API:Candidates:Export', actingUserId, { 
      error: (error as Error).message 
    });
    return NextResponse.json({ error: 'Failed to export candidates' }, { status: 500 });
  }
}

    