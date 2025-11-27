import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/auditLog';
import { getSystemSetting } from '@/lib/systemSettings';
import * as XLSX from 'xlsx';
import { z } from 'zod';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';


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
function transformCandidateForExport(candidate: any, jobMatches: any[]): any {
  const parsedData = candidate.parsedData || {};
  
  return {
    'ID': candidate.id || '', // Include ID for import/export compatibility
    'Name*': candidate.name || '',
    'Email*': candidate.email || '',
    'Phone': candidate.phone || '',
    'Position ID': candidate.positionId || '',
    'Position Name': candidate.positionTitle || '',
    'Recruiter ID': candidate.recruiterId || '',
    'Recruiter Name': candidate.recruiterName || '',
    'Fit Score (0-100)': candidate.fitScore ? Math.round((candidate.fitScore * 100)).toString() : '',
    'Status*': candidate.statusName || 'Unknown',
    'Application Date': formatDateForExport(candidate.applicationDate),
    'Applied Job': candidate.positionTitle || '',
    'Applied Job Justification': truncateForExcel(formatAssignmentJustification(candidate.assignmentJustification)),
    'Job Matches': truncateForExcel(formatJobMatches(jobMatches)),
    'Location': extractFromParsedData(parsedData, 'personal_info.location') || '',
    'Introduction/About Me': truncateForExcel(extractFromParsedData(parsedData, 'personal_info.introduction_aboutme') || ''),
    'Education (JSON)': truncateForExcel(parsedData.education ? JSON.stringify(parsedData.education) : ''),
    'Experience (JSON)': truncateForExcel(parsedData.experience ? JSON.stringify(parsedData.experience) : ''),
    'Skills (JSON)': truncateForExcel(parsedData.skills ? JSON.stringify(parsedData.skills) : ''),
    'Job Suitable (JSON)': truncateForExcel(parsedData.job_suitable ? JSON.stringify(parsedData.job_suitable) : ''),
    'Custom Attributes (JSON)': truncateForExcel(candidate.customAttributes ? JSON.stringify(candidate.customAttributes) : ''),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const actingUserId = session?.user?.id;
  const actingUserName = (session?.user?.name || session?.user?.email || actingUserId || 'System') as string;

  if (!actingUserId) {
    await logAudit('WARN', 'Unauthorized attempt to export candidate', 'API:Candidate:Export', null);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to export candidates
  if (!hasPermission(session.user, 'CANDIDATES_EXPORT')) {
    await logAudit('WARN', `Forbidden attempt to export candidate by ${actingUserName}`, 'API:Candidate:Export', actingUserId);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to export candidates' }, { status: 403 });
  }

  // Check if export/import feature is enabled
  const exportImportFeatureEnabled = await getSystemSetting('exportImportFeatureEnabled');
  if (exportImportFeatureEnabled === 'false') {
    await logAudit('WARN', `Export attempt blocked - feature disabled by ${actingUserName}`, 'API:Candidate:Export', actingUserId);
    return NextResponse.json({ error: 'Export/Import feature is disabled' }, { status: 403 });
  }

  const { id } = await params;
  
  // Validate UUID
  const uuidSchema = z.string().uuid();
  if (!uuidSchema.safeParse(id).success) {
    console.error('Invalid candidate ID format:', id);
    return NextResponse.json({ message: 'Invalid candidate ID format' }, { status: 400 });
  }

  let client: any = null;
  try {
    client = await getPool().connect();
    
    // Get candidate with position and recruiter information
    const candidateQuery = `
      SELECT 
        c.*,
        rs.name as "statusName",
        p.title as "positionTitle",
        p.department as "positionDepartment",
        u.name as "recruiterName"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" u ON c."recruiterId" = u.id
              LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
      WHERE c.id = $1::uuid
    `;
    
    const candidateResult = await client.query(candidateQuery, [id]);
    
    if (candidateResult.rows.length === 0) {
      return NextResponse.json({ message: 'Candidate not found' }, { status: 404 });
    }

    const candidate = candidateResult.rows[0];

    // Get job matches for this candidate
    const jobMatchesQuery = `
      SELECT 
        jm.*,
        p.title as "positionTitle"
      FROM "JobMatch" jm
      LEFT JOIN "Position" p ON jm."jobId" = p.id
      WHERE jm."candidateId" = $1::uuid
      ORDER BY jm."fitScore" DESC NULLS LAST
    `;
    
    const jobMatchesResult = await client.query(jobMatchesQuery, [id]);

    // Transform data for export
    const exportData = [transformCandidateForExport(candidate, jobMatchesResult.rows)];
    
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
      { wch: 60 }, // Job Matches
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
    XLSX.utils.book_append_sheet(workbook, dataWorksheet, 'Candidate Details');
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    await logAudit('AUDIT', `Candidate ${candidate.name} exported as Excel by ${actingUserName}`, 'API:Candidate:Export', actingUserId, { 
      candidateId: id,
      candidateName: candidate.name,
      format: 'Excel' 
    });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="candidate_${candidate.name}_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    await logAudit('ERROR', `Failed to export candidate ${id} by ${actingUserName}. Error: ${(error as Error).message}`, 'API:Candidate:Export', actingUserId, { 
      candidateId: id,
      error: (error as Error).message 
    });
    return NextResponse.json({ error: 'Failed to export candidate' }, { status: 500 });
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
