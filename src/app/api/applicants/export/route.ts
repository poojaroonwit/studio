// src/app/api/applicants/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import ExcelJS from 'exceljs';
import { hasPermission } from '@/lib/permissions';
import { getSystemSetting } from '@/lib/systemSettings';
import { parseAdvancedQueryEntries } from '@/lib/applicantAdvancedQuery';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';


/**
 * @openapi
 * /api/applicants/export:
 *   get:
 *     summary: Export Applicants
 *     description: Export all Applicants with position names, recruiter names, applied job information, and job matches.
 *     responses:
 *       200:
 *         description: Exported Applicants data
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

// Helper function to transform Applicant data for export
function transformApplicantForExport(applicant: any, isJobMatchEnabled: boolean): any {
  const parsedData = applicant.parsedData || {};

  return {
    'ID': applicant.id || '', // Include ID for import/export compatibility
    'Name*': applicant.name || '',
    'Email*': applicant.email || '',
    'Phone': applicant.phone || '',
    'Position ID': applicant.positionId || '',
    'Position Name': applicant.position_title || '',
    'Recruiter ID': applicant.recruiterId || '',
    'Recruiter Name': applicant.recruiter_name || '',
    'Fit Score (0-100)': applicant.fitScore ? Math.round((applicant.fitScore * 100)).toString() : '',
    'Status*': applicant.status_name || 'Unknown',
    'Application Date': formatDateForExport(applicant.applicationDate),
    'Applied Job': applicant.position_title || '',
    'Applied Job Justification': truncateForExcel(formatAssignmentJustification(applicant.assignmentJustification)),
    ...(isJobMatchEnabled && { 'Job Matches': truncateForExcel(formatJobMatches(applicant.job_matches || [])) }),
    'Location': extractFromParsedData(parsedData, 'personal_info.location') || '',
    'Introduction/About Me': truncateForExcel(extractFromParsedData(parsedData, 'personal_info.introduction_aboutme') || ''),
    'Education (JSON)': truncateForExcel(parsedData.education ? JSON.stringify(parsedData.education) : ''),
    'Experience (JSON)': truncateForExcel(parsedData.experience ? JSON.stringify(parsedData.experience) : ''),
    'Skills (JSON)': truncateForExcel(parsedData.skills ? JSON.stringify(parsedData.skills) : ''),
    'Job Suitable (JSON)': truncateForExcel(parsedData.job_suitable ? JSON.stringify(parsedData.job_suitable) : ''),
    'Custom Attributes (JSON)': truncateForExcel(applicant.customAttributes ? JSON.stringify(applicant.customAttributes) : ''),
  };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const actingUserId = session?.user?.id;
  const actingUserName = (session?.user?.name || session?.user?.email || actingUserId || 'System') as string;

  if (!actingUserId) {
    await logAudit('WARN', 'Unauthorized attempt to export Applicants', 'API:Applicants:Export', null);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to export Applicants
  if (!hasPermission(session.user, 'applicantS_EXPORT')) {
    await logAudit('WARN', `Forbidden attempt to export Applicants by ${actingUserName}`, 'API:Applicants:Export', actingUserId);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to export Applicants' }, { status: 403 });
  }

  // Check if export/import feature is enabled
  const exportImportFeatureEnabled = await getSystemSetting('exportImportFeatureEnabled');
  if (exportImportFeatureEnabled === 'false') {
    await logAudit('WARN', `Export attempt blocked - feature disabled by ${actingUserName}`, 'API:Applicants:Export', actingUserId);
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
      parseAdvancedQueryEntries(advancedQuery).forEach(({ key, value }) => {
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
      const positionIds = positionId.split(',').map(id => id.trim()).filter(id => id);
      if (positionIds.length === 1) {
        whereConditions.push(`c."positionId" = $${paramIndex}`);
        queryParams.push(positionIds[0]);
        paramIndex++;
      } else {
        whereConditions.push(`c."positionId" = ANY($${paramIndex}::uuid[])`);
        queryParams.push(positionIds);
        paramIndex++;
      }
    }

    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(s => s);
      if (statuses.length === 1) {
        whereConditions.push(`c."statusId" = $${paramIndex}`);
        queryParams.push(statuses[0]);
        paramIndex++;
      } else {
        whereConditions.push(`c."statusId" = ANY($${paramIndex}::uuid[])`);
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
      const recruiterIds = recruiterId.split(',').map(id => id.trim()).filter(id => id);
      if (recruiterIds.length === 1) {
        whereConditions.push(`c."recruiterId" = $${paramIndex}`);
        queryParams.push(recruiterIds[0]);
        paramIndex++;
      } else {
        whereConditions.push(`c."recruiterId" = ANY($${paramIndex}::uuid[])`);
        queryParams.push(recruiterIds);
        paramIndex++;
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get Applicants with position, recruiter, and job matches information
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
        FROM "Applicant" c
        LEFT JOIN "Position" p ON c."positionId" = p.id
        LEFT JOIN "User" u ON c."recruiterId" = u.id
        LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
        ${isJobMatchEnabled ? 'LEFT JOIN "JobMatch" jm ON c.id = jm."applicant_id"' : ''}
        ${whereClause}
        GROUP BY c.id, p.title, u.name, rs.name
        ORDER BY c."applicationDate" DESC
      `;

    const result = await client.query(query, queryParams);

    // Transform data for export
    const exportData = result.rows.map((applicant: any) => transformApplicantForExport(applicant, isJobMatchEnabled));

    // Check if user wants Excel format (default) or CSV
    const format = url.searchParams.get('format') || 'excel';

    if (format === 'excel') {
      // Create Excel file
      const workbook = new ExcelJS.Workbook();
      const dataWorksheet = workbook.addWorksheet('Applicants Export');

      // Set columns for better readability using existing logic
      dataWorksheet.columns = [
        { header: 'ID', key: 'ID', width: 36 },
        { header: 'Name*', key: 'Name*', width: 20 },
        { header: 'Email*', key: 'Email*', width: 25 },
        { header: 'Phone', key: 'Phone', width: 15 },
        { header: 'Position ID', key: 'Position ID', width: 36 },
        { header: 'Position Name', key: 'Position Name', width: 30 },
        { header: 'Recruiter ID', key: 'Recruiter ID', width: 36 },
        { header: 'Recruiter Name', key: 'Recruiter Name', width: 25 },
        { header: 'Fit Score (0-100)', key: 'Fit Score (0-100)', width: 15 },
        { header: 'Status*', key: 'Status*', width: 15 },
        { header: 'Application Date', key: 'Application Date', width: 15 },
        { header: 'Applied Job', key: 'Applied Job', width: 30 },
        { header: 'Applied Job Justification', key: 'Applied Job Justification', width: 50 },
        ...(isJobMatchEnabled ? [{ header: 'Job Matches', key: 'Job Matches', width: 60 }] : []),
        { header: 'Location', key: 'Location', width: 20 },
        { header: 'Introduction/About Me', key: 'Introduction/About Me', width: 40 },
        { header: 'Education (JSON)', key: 'Education (JSON)', width: 50 },
        { header: 'Experience (JSON)', key: 'Experience (JSON)', width: 50 },
        { header: 'Skills (JSON)', key: 'Skills (JSON)', width: 50 },
        { header: 'Job Suitable (JSON)', key: 'Job Suitable (JSON)', width: 50 },
        { header: 'Custom Attributes (JSON)', key: 'Custom Attributes (JSON)', width: 50 }
      ];

      // Add data rows
      dataWorksheet.addRows(exportData);

      // Generate Excel file buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const excelBuffer = Buffer.from(buffer);

      await logAudit('AUDIT', `Applicants exported as Excel by ${actingUserName}. ${result.rows.length} Applicants exported.`, 'API:Applicants:Export', actingUserId, {
        exportCount: result.rows.length,
        format: 'Excel'
      });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="applicantS_export.xlsx"',
        },
      });
    } else {
      // CSV format
      const csvData = convertToCsv(exportData);

      await logAudit('AUDIT', `Applicants exported as CSV by ${actingUserName}. ${result.rows.length} Applicants exported.`, 'API:Applicants:Export', actingUserId, {
        exportCount: result.rows.length,
        format: 'CSV'
      });

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="applicantS_export.csv"',
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

    await logAudit('ERROR', `Failed to export Applicants by ${actingUserName}. Error: ${(error as Error).message}`, 'API:Applicants:Export', actingUserId, {
      error: (error as Error).message,
      stack: error instanceof Error ? error.stack : undefined
    });

    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to export Applicants';

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
    // ? CRITICAL FIX: Always release the database client
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing database client:', releaseError);
      }
    }
  }
}



