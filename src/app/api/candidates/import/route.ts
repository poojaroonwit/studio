import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { getSystemSetting } from '@/lib/systemSettings';
import { safeJsonParse } from '@/lib/utils';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';
import { parse as parseCsv } from 'csv-parse/sync';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';

// Schema for candidate import data
const candidateImportSchema = z.object({
  id: z.string().uuid().optional(), // Optional ID for update/create logic
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  positionName: z.string().optional(), // For display purposes
  recruiterId: z.string().uuid().optional().nullable(),
  recruiterName: z.string().optional(), // For display purposes
  fitScore: z.string().optional(), // Will be converted to number
  status: z.string().optional().default('Applied'),
  applicationDate: z.string().optional(), // Will be parsed as date
  appliedJob: z.string().optional(),
  appliedJobJustification: z.string().optional(),
  jobMatches: z.string().optional(),
  location: z.string().optional(),
  introductionAboutMe: z.string().optional(),
  education: z.string().optional(), // JSON string
  experience: z.string().optional(), // JSON string
  skills: z.string().optional(), // JSON string
  jobSuitable: z.string().optional(), // JSON string
  customAttributes: z.string().optional(), // JSON string
});

// Helper function to parse fit score
function parseFitScore(fitScoreStr: string | undefined): number | null {
  if (!fitScoreStr) return null;
  const parsed = parseFloat(fitScoreStr);
  return isNaN(parsed) ? null : Math.max(0, Math.min(1, parsed / 100));
}

// Helper function to parse date
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Helper function to parse JSON fields
function parseJsonField(jsonStr: string | undefined): any {
  if (!jsonStr) return null;
  try {
    return safeJsonParse(jsonStr, null);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const actingUserId = session?.user?.id;
  const actingUserName = (session?.user?.name || session?.user?.email || actingUserId || 'System') as string;

  if (!actingUserId) {
    await logAudit('WARN', 'Unauthorized attempt to import candidates', 'API:Candidates:Import', null);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to import candidates
  if (!hasPermission(session.user, 'CANDIDATES_IMPORT')) {
    await logAudit('WARN', `Forbidden attempt to import candidates by ${actingUserName}`, 'API:Candidates:Import', actingUserId);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to import candidates' }, { status: 403 });
  }

  // Check if export/import feature is enabled
  const exportImportFeatureEnabled = await getSystemSetting('exportImportFeatureEnabled');
  if (exportImportFeatureEnabled === 'false') {
    await logAudit('WARN', `Import attempt blocked - feature disabled by ${actingUserName}`, 'API:Candidates:Import', actingUserId);
    return NextResponse.json({ error: 'Export/Import feature is disabled' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name.toLowerCase();

    let candidates: any[] = [];

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Parse Excel file
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const sheet = workbook.worksheets[0];

      const json: any[] = [];
      const headers: { [key: number]: string } = {};

      // Extract headers from first row
      const firstRow = sheet.getRow(1);
      firstRow.eachCell((cell: any, colNumber: number) => {
        headers[colNumber] = String(cell.value || '');
      });

      // Extract data
      sheet.eachRow((row: any, rowNumber: number) => {
        if (rowNumber === 1) return; // Skip header row

        const rowData: any = {};
        // Initialize defined headers with empty string
        Object.values(headers).forEach(h => rowData[h] = '');

        row.eachCell((cell: any, colNumber: number) => {
          const header = headers[colNumber];
          if (header) {
            const val = cell.value;
            if (val && typeof val === 'object' && 'text' in val) {
              rowData[header] = (val as any).text;
            } else {
              // Handle dates/numbers if needed, but for now value is fine or cast to string
              rowData[header] = val;
            }
          }
        });
        json.push(rowData);
      });

      candidates = json.map((row: any) => ({
        id: row['ID'] || row['id'] || undefined,
        name: String(row['Name*'] || row['Name'] || row['name'] || ''),
        email: String(row['Email*'] || row['Email'] || row['email'] || ''),
        phone: row['Phone'] || row['phone'] ? String(row['Phone'] || row['phone']) : null,
        positionId: row['Position ID'] || row['positionId'] ? String(row['Position ID'] || row['positionId']) : null,
        positionName: String(row['Position Name'] || row['positionName'] || ''),
        recruiterId: row['Recruiter ID'] || row['recruiterId'] ? String(row['Recruiter ID'] || row['recruiterId']) : null,
        recruiterName: String(row['Recruiter Name'] || row['recruiterName'] || ''),
        fitScore: String(row['Fit Score (0-100)'] || row['fitScore'] || ''),
        status: String(row['Status*'] || row['Status'] || row['status'] || 'Applied'),
        applicationDate: String(row['Application Date'] || row['applicationDate'] || ''),
        appliedJob: String(row['Applied Job'] || row['appliedJob'] || ''),
        appliedJobJustification: String(row['Applied Job Justification'] || row['appliedJobJustification'] || ''),
        jobMatches: String(row['Job Matches'] || row['jobMatches'] || ''),
        location: String(row['Location'] || row['location'] || ''),
        introductionAboutMe: String(row['Introduction/About Me'] || row['introductionAboutMe'] || ''),
        education: String(row['Education (JSON)'] || row['education'] || ''),
        experience: String(row['Experience (JSON)'] || row['experience'] || ''),
        skills: String(row['Skills (JSON)'] || row['skills'] || ''),
        jobSuitable: String(row['Job Suitable (JSON)'] || row['jobSuitable'] || ''),
        customAttributes: String(row['Custom Attributes (JSON)'] || row['customAttributes'] || ''),
      }));
    } else if (fileName.endsWith('.csv')) {
      // Parse CSV file
      const csvString = buffer.toString('utf-8');
      const records = parseCsv(csvString, { columns: true, skip_empty_lines: true });

      candidates = records.map((row: any) => ({
        id: row['ID'] || row['id'] || undefined,
        name: String(row['Name*'] || row['Name'] || row['name'] || ''),
        email: String(row['Email*'] || row['Email'] || row['email'] || ''),
        phone: row['Phone'] || row['phone'] ? String(row['Phone'] || row['phone']) : null,
        positionId: row['Position ID'] || row['positionId'] ? String(row['Position ID'] || row['positionId']) : null,
        positionName: String(row['Position Name'] || row['positionName'] || ''),
        recruiterId: row['Recruiter ID'] || row['recruiterId'] ? String(row['Recruiter ID'] || row['recruiterId']) : null,
        recruiterName: String(row['Recruiter Name'] || row['recruiterName'] || ''),
        fitScore: String(row['Fit Score (0-100)'] || row['fitScore'] || ''),
        status: String(row['Status*'] || row['Status'] || row['status'] || 'Applied'),
        applicationDate: String(row['Application Date'] || row['applicationDate'] || ''),
        appliedJob: String(row['Applied Job'] || row['appliedJob'] || ''),
        appliedJobJustification: String(row['Applied Job Justification'] || row['appliedJobJustification'] || ''),
        jobMatches: String(row['Job Matches'] || row['jobMatches'] || ''),
        location: String(row['Location'] || row['location'] || ''),
        introductionAboutMe: String(row['Introduction/About Me'] || row['introductionAboutMe'] || ''),
        education: String(row['Education (JSON)'] || row['education'] || ''),
        experience: String(row['Experience (JSON)'] || row['experience'] || ''),
        skills: String(row['Skills (JSON)'] || row['skills'] || ''),
        jobSuitable: String(row['Job Suitable (JSON)'] || row['jobSuitable'] || ''),
        customAttributes: String(row['Custom Attributes (JSON)'] || row['customAttributes'] || ''),
      }));
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload Excel (.xlsx, .xls) or CSV files.' }, { status: 400 });
    }

    // Check for empty or template data
    const validCandidates = candidates.filter(candidate => {
      // Skip rows that are essentially empty (no meaningful data)
      return candidate.name && candidate.name.trim() !== '' &&
        candidate.email && candidate.email.trim() !== '';
    });

    if (validCandidates.length === 0) {
      return NextResponse.json({
        error: 'No valid candidates found in file. Please ensure the file contains candidate data with at least Name and Email fields filled.'
      }, { status: 400 });
    }

    // Validate candidates
    const validationResults = validCandidates.map((candidate, index) => {
      const result = candidateImportSchema.safeParse(candidate);
      return { index, candidate, valid: result.success, errors: result.success ? null : result.error.flatten().fieldErrors };
    });

    const invalidCandidates = validationResults.filter(r => !r.valid);
    if (invalidCandidates.length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        details: invalidCandidates.map(r => ({
          row: r.index + 2, // +2 because Excel rows are 1-indexed and we have headers
          email: r.candidate.email,
          errors: r.errors
        }))
      }, { status: 400 });
    }

    const client = await getPool().connect();

    try {
      await client.query('BEGIN');

      const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[]
      };

      for (const candidate of validCandidates) {
        try {
          // Parse and validate data
          const fitScore = parseFitScore(candidate.fitScore);
          const applicationDate = parseDate(candidate.applicationDate);
          const parsedData = {
            personal_info: {
              location: candidate.location || null,
              introduction_aboutme: candidate.introductionAboutMe || null
            },
            education: parseJsonField(candidate.education),
            experience: parseJsonField(candidate.experience),
            skills: parseJsonField(candidate.skills),
            job_suitable: parseJsonField(candidate.jobSuitable)
          };
          const customAttributes = parseJsonField(candidate.customAttributes);

          if (candidate.id) {
            // Update existing candidate
            const updateQuery = `
              UPDATE "Candidate" 
              SET 
                name = $1,
                email = $2,
                phone = $3,
                "positionId" = $4,
                "recruiterId" = $5,
                "fitScore" = $6,
                status = $7,
                "applicationDate" = $8,
                "parsedData" = $9,
                "customAttributes" = $10,
                "updatedAt" = NOW()
              WHERE id = $11
            `;

            const updateResult = await client.query(updateQuery, [
              candidate.name,
              candidate.email,
              candidate.phone || null,
              candidate.positionId || null,
              candidate.recruiterId || null,
              fitScore,
              candidate.statusId || 'Applied', // Use statusId if provided, otherwise default to 'Applied'
              applicationDate || new Date(),
              parsedData,
              customAttributes || {},
              candidate.id
            ]);

            if (updateResult.rowCount && updateResult.rowCount > 0) {
              results.updated++;
            } else {
              results.errors.push(`Candidate with ID ${candidate.id} not found`);
            }
          } else {
            // Create new candidate
            const candidateId = uuidv4();
            const insertQuery = `
              INSERT INTO "Candidate" (
                id, name, email, phone, "positionId", "recruiterId", 
                "fitScore", "statusId", "applicationDate", "parsedData", 
                "customAttributes", "createdAt", "updatedAt"
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            `;

            await client.query(insertQuery, [
              candidateId,
              candidate.name,
              candidate.email,
              candidate.phone || null,
              candidate.positionId || null,
              candidate.recruiterId || null,
              fitScore,
              candidate.statusId || 'Applied', // Use statusId if provided, otherwise default to 'Applied'
              applicationDate || new Date(),
              parsedData,
              customAttributes || {}
            ]);

            results.created++;
          }
        } catch (error) {
          results.errors.push(`Failed to process ${candidate.email}: ${(error as Error).message}`);
        }
      }

      await client.query('COMMIT');

      await logAudit('AUDIT', `Candidates imported by ${actingUserName}. Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors.length}`, 'API:Candidates:Import', actingUserId, {
        created: results.created,
        updated: results.updated,
        errors: results.errors.length,
        totalProcessed: validCandidates.length,
        totalRows: candidates.length
      });

      return NextResponse.json({
        message: 'Import completed successfully',
        results
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    await logAudit('ERROR', `Failed to import candidates by ${actingUserName}. Error: ${(error as Error).message}`, 'API:Candidates:Import', actingUserId, {
      error: (error as Error).message
    });
    return NextResponse.json({ error: 'Failed to import candidates', details: (error as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const actingUserId = session?.user?.id;

  if (!actingUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to import candidates
  if (!hasPermission(session.user, 'CANDIDATES_IMPORT')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to import candidates' }, { status: 403 });
  }

  // Check if export/import feature is enabled
  const exportImportFeatureEnabled = await getSystemSetting('exportImportFeatureEnabled');
  if (exportImportFeatureEnabled === 'false') {
    return NextResponse.json({ error: 'Export/Import feature is disabled' }, { status: 403 });
  }

  try {
    // Create import template
    const templateData = [
      {
        'ID': '', // Leave blank for new candidates, or provide existing ID for updates
        'Name*': '', // Required: Full name of the candidate
        'Email*': '', // Required: Valid email address (must be unique)
        'Phone': '', // Optional: Phone number
        'Position ID': '', // Optional: UUID of position
        'Position Name': '', // Optional: Display name of position (for reference)
        'Recruiter ID': '', // Optional: UUID of recruiter
        'Recruiter Name': '', // Optional: Display name of recruiter (for reference)
        'Fit Score (0-100)': '', // Optional: Fit score as percentage (0-100)
        'Status*': 'Applied', // Required: Candidate status (Applied, Interviewing, Hired, etc.)
        'Application Date': '', // Optional: Date in YYYY-MM-DD format
        'Applied Job': '', // Optional: Title of the applied job
        'Applied Job Justification': '', // Optional: Justification for job application
        'Job Matches': '', // Optional: Additional job matches with scores and reasons
        'Location': '', // Optional: Candidate location
        'Introduction/About Me': '', // Optional: Candidate introduction or about section
        'Education (JSON)': '', // Optional: Education history as JSON array
        'Experience (JSON)': '', // Optional: Work experience as JSON array
        'Skills (JSON)': '', // Optional: Skills as JSON array
        'Job Suitable (JSON)': '', // Optional: Suitable jobs as JSON array
        'Custom Attributes (JSON)': '' // Optional: Custom attributes as JSON object
      }
    ];

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();

    // Create main data worksheet
    const dataWorksheet = workbook.addWorksheet('Import Template');

    // Set columns for data worksheet
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
      { header: 'Job Matches', key: 'Job Matches', width: 60 },
      { header: 'Location', key: 'Location', width: 20 },
      { header: 'Introduction/About Me', key: 'Introduction/About Me', width: 40 },
      { header: 'Education (JSON)', key: 'Education (JSON)', width: 50 },
      { header: 'Experience (JSON)', key: 'Experience (JSON)', width: 50 },
      { header: 'Skills (JSON)', key: 'Skills (JSON)', width: 50 },
      { header: 'Job Suitable (JSON)', key: 'Job Suitable (JSON)', width: 50 },
      { header: 'Custom Attributes (JSON)', key: 'Custom Attributes (JSON)', width: 50 }
    ];

    // Add empty row for template
    // dataWorksheet.addRow({}); 
    // Wait, the templateData had one row of descriptions or empty strings.
    // templateData in original code:
    /*
        name: "Sample Candidate",
        status: "Applied", ...
    */
    // Wait, templateData was constructed with keys as headers and values as example/empty strings.
    // xlsx.json_to_sheet uses keys as headers.
    // Here we set columns manually. We can add the example row using the keys.
    dataWorksheet.addRows(templateData);


    // Create instructions worksheet
    const instructionsWorksheet = workbook.addWorksheet('Instructions');

    // Set columns for instructions
    instructionsWorksheet.columns = [
      { header: 'Field', key: 'Field', width: 25 },
      { header: 'Required', key: 'Required', width: 10 },
      { header: 'Description', key: 'Description', width: 60 }
    ];

    const instructionsData = [
      { 'Field': 'ID', 'Required': 'No', 'Description': 'Leave blank for new candidates. Provide existing UUID for updates.' },
      { 'Field': 'Name*', 'Required': 'Yes', 'Description': 'Full name of the candidate' },
      { 'Field': 'Email*', 'Required': 'Yes', 'Description': 'Valid email address (must be unique)' },
      { 'Field': 'Phone', 'Required': 'No', 'Description': 'Phone number (optional)' },
      { 'Field': 'Position ID', 'Required': 'No', 'Description': 'UUID of the position (optional)' },
      { 'Field': 'Position Name', 'Required': 'No', 'Description': 'Display name of position (for reference)' },
      { 'Field': 'Recruiter ID', 'Required': 'No', 'Description': 'UUID of the recruiter (optional)' },
      { 'Field': 'Recruiter Name', 'Required': 'No', 'Description': 'Display name of recruiter (for reference)' },
      { 'Field': 'Fit Score (0-100)', 'Required': 'No', 'Description': 'Fit score as percentage (0-100)' },
      { 'Field': 'Status*', 'Required': 'Yes', 'Description': 'Candidate status (Applied, Interviewing, Hired, etc.)' },
      { 'Field': 'Application Date', 'Required': 'No', 'Description': 'Date in YYYY-MM-DD format' },
      { 'Field': 'Applied Job', 'Required': 'No', 'Description': 'Title of the applied job' },
      { 'Field': 'Applied Job Justification', 'Required': 'No', 'Description': 'Justification for job application' },
      { 'Field': 'Job Matches', 'Required': 'No', 'Description': 'Additional job matches with scores and reasons' },
      { 'Field': 'Location', 'Required': 'No', 'Description': 'Candidate location' },
      { 'Field': 'Introduction/About Me', 'Required': 'No', 'Description': 'Candidate introduction or about section' },
      { 'Field': 'Education (JSON)', 'Required': 'No', 'Description': 'Education history as JSON array' },
      { 'Field': 'Experience (JSON)', 'Required': 'No', 'Description': 'Work experience as JSON array' },
      { 'Field': 'Skills (JSON)', 'Required': 'No', 'Description': 'Skills as JSON array' },
      { 'Field': 'Job Suitable (JSON)', 'Required': 'No', 'Description': 'Suitable jobs as JSON array' },
      { 'Field': 'Custom Attributes (JSON)', 'Required': 'No', 'Description': 'Custom attributes as JSON object' }
    ];

    // Add instructions data
    instructionsWorksheet.addRows(instructionsData);

    // Generate Excel file buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const excelBuffer = Buffer.from(buffer);

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="candidates_import_template.xlsx"',
      },
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate template', details: (error as Error).message }, { status: 500 });
  }
}
