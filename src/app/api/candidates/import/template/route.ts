import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import * as XLSX from 'xlsx';

export async function GET() {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    await logAudit('WARN', 'Unauthorized attempt to download candidate import template', 'API:Candidates:Import:Template', null);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to import candidates
  if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('CANDIDATES_IMPORT')) {
    await logAudit('WARN', `Forbidden attempt to download candidate import template by ${actingUserName}`, 'API:Candidates:Import:Template', actingUserId);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to import candidates' }, { status: 403 });
  }

  try {
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    
    // Create the main data worksheet
    const dataWorksheet = XLSX.utils.aoa_to_sheet([
      // Header row with field names
      [
        'Name*',
        'Email*',
        'Phone',
        'Position ID',
        'Recruiter ID',
        'Fit Score (0-100)',
        'Status*',
        'Application Date',
        'Location',
        'Introduction/About Me',
        'Education (JSON)',
        'Experience (JSON)',
        'Skills (JSON)',
        'Job Suitable (JSON)',
        'Custom Attributes (JSON)'
      ],
      // Instructions row
      [
        'Full name of the candidate',
        'Valid email address (required)',
        'Phone number (optional)',
        'UUID of the position (optional)',
        'UUID of the recruiter (optional)',
        'Fit score between 0-100 (optional)',
        'Current status (required)',
        'Application date (YYYY-MM-DD)',
        'Location/City (optional)',
        'Professional summary (optional)',
        'Education history as JSON array (optional)',
        'Work experience as JSON array (optional)',
        'Skills as JSON array (optional)',
        'Job preferences as JSON array (optional)',
        'Additional custom fields as JSON object (optional)'
      ],
      // Example data row
      [
        'John Doe',
        'john.doe@example.com',
        '+1-555-0123',
        '',
        '',
        '85',
        'Applied',
        '2024-01-15',
        'New York, NY',
        'Experienced software engineer with 5+ years in web development.',
        '[{"university":"MIT","major":"Computer Science","startYear":2015,"endYear":2019,"isCurrent":false}]',
        '[{"company":"Tech Corp","position":"Senior Developer","startYear":2019,"endYear":2024,"isCurrent":true}]',
        '[{"segment_skill":"Programming","skill":["JavaScript","React","Node.js"]}]',
        '[{"suitable_career":"Software Development","suitable_job_level":"senior level"}]',
        '{"source":"LinkedIn","notes":"Strong technical background"}'
      ],
      // Second example row
      [
        'Jane Smith',
        'jane.smith@example.com',
        '+1-555-0456',
        '',
        '',
        '92',
        'Shortlisted',
        '2024-01-20',
        'San Francisco, CA',
        'Product manager with expertise in agile methodologies.',
        '[{"university":"Stanford","major":"Business Administration","startYear":2016,"endYear":2020,"isCurrent":false}]',
        '[{"company":"Startup Inc","position":"Product Manager","startYear":2020,"endYear":2024,"isCurrent":true}]',
        '[{"segment_skill":"Management","skill":["Agile","Scrum","Product Strategy"]}]',
        '[{"suitable_career":"Product Management","suitable_job_level":"mid level"}]',
        '{"source":"Referral","priority":"High"}'
      ]
    ]);

    // Create instructions worksheet
    const instructionsWorksheet = XLSX.utils.aoa_to_sheet([
      ['CANDIDATE IMPORT TEMPLATE - INSTRUCTIONS'],
      [''],
      ['REQUIRED FIELDS:'],
      ['• Name: Full name of the candidate'],
      ['• Email: Valid email address (must be unique)'],
      ['• Status: Current recruitment status'],
      [''],
      ['OPTIONAL FIELDS:'],
      ['• Phone: Contact phone number'],
      ['• Position ID: UUID of the position they are applying for'],
      ['• Recruiter ID: UUID of the assigned recruiter'],
      ['• Fit Score: Numeric score between 0-100'],
      ['• Application Date: Date in YYYY-MM-DD format'],
      ['• Location: City, State, or Country'],
      ['• Introduction/About Me: Professional summary'],
      [''],
      ['JSON FIELDS (Optional):'],
      ['• Education: Array of education objects'],
      ['  Example: [{"university":"MIT","major":"Computer Science","startYear":2015,"endYear":2019,"isCurrent":false}]'],
      [''],
      ['• Experience: Array of work experience objects'],
      ['  Example: [{"company":"Tech Corp","position":"Developer","startYear":2019,"endYear":2024,"isCurrent":true}]'],
      [''],
      ['• Skills: Array of skill objects'],
      ['  Example: [{"segment_skill":"Programming","skill":["JavaScript","React"]}]'],
      [''],
      ['• Job Suitable: Array of job preference objects'],
      ['  Example: [{"suitable_career":"Software Development","suitable_job_level":"senior level"}]'],
      [''],
      ['• Custom Attributes: Any additional data as JSON object'],
      ['  Example: {"source":"LinkedIn","notes":"Strong candidate"}'],
      [''],
      ['IMPORTANT NOTES:'],
      ['• Duplicate email addresses are allowed for candidates.'],
      ['• Status values should match your recruitment stages'],
      ['• Position ID and Recruiter ID should be valid UUIDs from your system'],
      ['• JSON fields should be properly formatted JSON strings'],
      ['• Dates should be in YYYY-MM-DD format'],
      ['• Fit scores should be between 0 and 100'],
      [''],
      ['SUPPORTED STATUS VALUES:'],
      ['• Applied, Screening, Shortlisted, Interview Scheduled'],
      ['• Interviewing, Offer Extended, Offer Accepted, Hired'],
      ['• Rejected, On Hold'],
      [''],
      ['TROUBLESHOOTING:'],
      ['• If import fails, check that required fields are filled'],
      ['• Ensure email addresses are unique and valid'],
      ['• Verify JSON syntax for complex fields'],
      ['• Check that Position ID and Recruiter ID are valid UUIDs']
    ]);

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
    instructionsWorksheet['!cols'] = [{ wch: 80 }];

    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(workbook, dataWorksheet, 'Import Template');
    XLSX.utils.book_append_sheet(workbook, instructionsWorksheet, 'Instructions');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await logAudit('AUDIT', `Candidate import template downloaded by ${actingUserName}`, 'API:Candidates:Import:Template', actingUserId);

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="candidate_import_template.xlsx"',
      },
    });
  } catch (error) {
    await logAudit('ERROR', `Failed to generate candidate import template for ${actingUserName}. Error: ${(error as Error).message}`, 'API:Candidates:Import:Template', actingUserId);
    return NextResponse.json({ error: 'Failed to generate import template' }, { status: 500 });
  }
} 