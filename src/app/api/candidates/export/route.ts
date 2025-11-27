// src/app/api/candidates/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import * as XLSX from 'xlsx';
import { hasPermission } from '@/lib/permissions';
import { getSystemSetting } from '@/lib/systemSettings';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';


/**
 * @openapi
 * /api/candidates/export:
 *   get:
 *     summary: Export candidates
 *     description: Export all candidates with position names, recruiter names, applied job information, and job matches.
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

// Helper function to truncate text to Excel's maximum cell length (32,767 characters)
function truncateForExcel(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  const MAX_EXCEL_CELL_LENGTH = 32767;
  if (stringValue.length > MAX_EXCEL_CELL_LENGTH) {
    return stringValue.substring(0, MAX_EXCEL_CELL_LENGTH);
  }
  return stringValue;
}

// Helper function to transform candidate data for export
function transformCandidateForExport(candidate: any, isJobMatchEnabled: boolean): any {
  const parsedData = candidate.parsedData || {};
  
  return {
    'ID': candidate.id || '', // Include ID for import/export compatibility
    'Name*': candidate.name || '',
    'Email*': candidate.email || '',
    'Phone': candidate.phone || '',
    'Position ID': candidate.positionId || '',
    'Position Name': candidate.position_title || '',
    'Recruiter ID': candidate.recruiterId || '',
    'Recruiter Name': candidate.recruiter_name || '',
    'Fit Score (0-100)': candidate.fitScore ? Math.round((candidate.fitScore * 100)).toString() : '',
    'Status*': candidate.status_name || 'Unknown',
    'Application Date': formatDateForExport(candidate.applicationDate),
    'Applied Job': candidate.position_title || '',
    'Applied Job Justification': truncateForExcel(formatAssignmentJustification(candidate.assignmentJustification)),
    ...(isJobMatchEnabled && { 'Job Matches': truncateForExcel(formatJobMatches(candidate.job_matches || [])) }),
    'Location': extractFromParsedData(parsedData, 'personal_info.location') || '',
    'Introduction/About Me': truncateForExcel(extractFromParsedData(parsedData, 'personal_info.introduction_aboutme') || ''),
    'Education (JSON)': truncateForExcel(parsedData.education ? JSON.stringify(parsedData.education) : ''),
    'Experience (JSON)': truncateForExcel(parsedData.experience ? JSON.stringify(parsedData.experience) : ''),
    'Skills (JSON)': truncateForExcel(parsedData.skills ? JSON.stringify(parsedData.skills) : ''),
    'Job Suitable (JSON)': truncateForExcel(parsedData.job_suitable ? JSON.stringify(parsedData.job_suitable) : ''),
    'Custom Attributes (JSON)': truncateForExcel(candidate.customAttributes ? JSON.stringify(candidate.customAttributes) : ''),
  };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const actingUserId = session?.user?.id;
  const actingUserName = (session?.user?.name || session?.user?.email || actingUserId || 'System') as string;

  if (!actingUserId) {
    await logAudit('WARN', 'Unauthorized attempt to export candidates', 'API:Candidates:Export', null);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to export candidates
  if (!hasPermission(session.user, 'CANDIDATES_EXPORT')) {
    await logAudit('WARN', `Forbidden attempt to export candidates by ${actingUserName}`, 'API:Candidates:Export', actingUserId);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to export candidates' }, { status: 403 });
  }

  // Check if export/import feature is enabled
  const exportImportFeatureEnabled = await getSystemSetting('exportImportFeatureEnabled');
  if (exportImportFeatureEnabled === 'false') {
    await logAudit('WARN', `Export attempt blocked - feature disabled by ${actingUserName}`, 'API:Candidates:Export', actingUserId);
    return NextResponse.json({ error: 'Export/Import feature is disabled' }, { status: 403 });
  }

  let client: any = null;
  try {
    // Check if job match feature is enabled
    const jobMatchFeatureEnabled = await getSystemSetting('jobMatchFeatureEnabled');
    const isJobMatchEnabled = jobMatchFeatureEnabled !== 'false';
    
    client = await getPool().connect();
    
    // Parse query parameters for filtering
    const url = new URL(request.url);
    
    // Parse advanced query parameter if present
    const advancedQuery = url.searchParams.get('query');
    let advancedFilters: { [key: string]: string | null } = {};
    
    if (advancedQuery) {
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
          case 'skills':
            advancedFilters.skills = value;
            break;
          case 'location':
            advancedFilters.location = value;
            break;
          case 'position':
          case 'positionid':
            advancedFilters.positionId = value;
            break;
          case 'status':
            advancedFilters.status = value;
            break;
          case 'recruiter':
          case 'recruiterid':
            advancedFilters.recruiterId = value;
            break;
          case 'applicationdatestart':
            advancedFilters.applicationDateStart = value;
            break;
          case 'applicationdateend':
            advancedFilters.applicationDateEnd = value;
            break;
          case 'minexperienceyears':
            advancedFilters.minExperienceYears = value;
            break;
          case 'maxexperienceyears':
            advancedFilters.maxExperienceYears = value;
            break;
          case 'minfitscore':
          case 'minappliedjobfitscore':
            advancedFilters.minAppliedJobFitScore = value;
            break;
          case 'maxfitscore':
          case 'maxappliedjobfitscore':
            advancedFilters.maxAppliedJobFitScore = value;
            break;
          case 'minmatchingjobfitscore':
            advancedFilters.minMatchingJobFitScore = value;
            break;
          case 'maxmatchingjobfitscore':
            advancedFilters.maxMatchingJobFitScore = value;
            break;
          case 'education':
            advancedFilters.education = value;
            break;
          case 'selectedsourceids':
            advancedFilters.selectedSourceIds = value;
            break;
        }
      });
    }
    
    // Get individual parameters, giving priority to explicit parameters over advanced query
    const name = url.searchParams.get('name') || advancedFilters.name;
    const email = url.searchParams.get('email') || advancedFilters.email;
    const phone = url.searchParams.get('phone') || advancedFilters.phone;
    const positionId = url.searchParams.get('positionId') || advancedFilters.positionId;
    const status = url.searchParams.get('status') || advancedFilters.status;
    const education = url.searchParams.get('education');
    const minAppliedJobFitScore = url.searchParams.get('minAppliedJobFitScore') || advancedFilters.minAppliedJobFitScore;
    const maxAppliedJobFitScore = url.searchParams.get('maxAppliedJobFitScore') || advancedFilters.maxAppliedJobFitScore;
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
        whereConditions.push(`c."statusId" = $${paramIndex}`);
        queryParams.push(statuses[0]);
        paramIndex++;
      } else {
        whereConditions.push(`c."statusId" = ANY($${paramIndex})`);
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
      // Database stores scores in decimal format (0-1), so convert percentage values to decimal
      // If filter value is > 1, assume it's percentage (0-100) and convert to decimal (0-1)
      // If filter value is <= 1, assume it's already decimal and use as-is
      const filterValue = parseFloat(minAppliedJobFitScore);
      const finalValue = filterValue > 1 ? filterValue / 100 : filterValue;
      queryParams.push(finalValue);
      paramIndex++;
    }
    
    if (maxAppliedJobFitScore !== null && maxAppliedJobFitScore !== undefined) {
      whereConditions.push(`c."fitScore" <= $${paramIndex}`);
      // Database stores scores in decimal format (0-1), so convert percentage values to decimal
      const filterValue = parseFloat(maxAppliedJobFitScore);
      const finalValue = filterValue > 1 ? filterValue / 100 : filterValue;
      queryParams.push(finalValue);
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
    
    // Get candidates with position, recruiter, and job matches information
          const query = `
        SELECT 
          c.*,
          rs.name as status_name,
          p.title as position_title,
          u.name as recruiter_name
          ${isJobMatchEnabled ? `,
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
          ) as job_matches` : ''}
        FROM "Candidate" c
        LEFT JOIN "Position" p ON c."positionId" = p.id
        LEFT JOIN "User" u ON c."recruiterId" = u.id
        LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
        ${isJobMatchEnabled ? 'LEFT JOIN "JobMatch" jm ON c.id = jm."candidateId"' : ''}
        ${whereClause}
        GROUP BY c.id, p.title, u.name, rs.name
        ORDER BY c."applicationDate" DESC
      `;
    
    const result = await client.query(query, queryParams);

    // Transform data for export
    const exportData = result.rows.map((candidate: any) => transformCandidateForExport(candidate, isJobMatchEnabled));
    
    // Check if user wants Excel format (default) or CSV
    const format = url.searchParams.get('format') || 'excel';
    
    if (format === 'excel') {
      // Create Excel file
      const workbook = XLSX.utils.book_new();
      
      // Create the main data worksheet
      const dataWorksheet = XLSX.utils.json_to_sheet(exportData);
      
              // Set column widths for better readability
        const columnWidths = [
          { wch: 36 }, // ID
          { wch: 20 }, // Name
          { wch: 25 }, // Email
          { wch: 15 }, // Phone
          { wch: 36 }, // Position ID
          { wch: 30 }, // Position Name
          { wch: 36 }, // Recruiter ID
          { wch: 25 }, // Recruiter Name
          { wch: 15 }, // Fit Score
          { wch: 15 }, // Status
          { wch: 15 }, // Application Date
          { wch: 30 }, // Applied Job
          { wch: 50 }, // Applied Job Justification
          ...(isJobMatchEnabled ? [{ wch: 60 }] : []), // Job Matches
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
    console.error('Export error details:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      actingUserName,
      actingUserId
    });
    
    await logAudit('ERROR', `Failed to export candidates by ${actingUserName}. Error: ${(error as Error).message}`, 'API:Candidates:Export', actingUserId, { 
      error: (error as Error).message,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to export candidates';
    
    if (error instanceof Error) {
      if (error.message.includes('connection') || error.message.includes('pool')) {
        errorMessage = 'Database connection error. Please try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Export timed out. Please try with fewer filters or contact support.';
      } else if (error.message.includes('memory') || error.message.includes('heap')) {
        errorMessage = 'Export too large. Please try with fewer filters.';
      } else if (error.message.includes('permission') || error.message.includes('access')) {
        errorMessage = 'Permission denied. Please check your access rights.';
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
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

    
