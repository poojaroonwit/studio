// src/app/api/automation/create-applicant-with-matches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createDateInTimezone } from '@/lib/dateUtils';
import { getSystemSetting } from '@/lib/systemSettings';
import { requireAutomationApiKey } from '@/lib/api-route-guards';

export const dynamic = "force-dynamic";

const jobMatchSchema = z.object({
  jobId: z.string().optional(),
  jobTitle: z.string().optional(),
  fitScore: z.number().min(0).max(1).optional(),
  matchReasons: z.array(z.string()).optional(),
  job_description_summary: z.string().optional(),
});

const applicantDataSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  status: z.string().uuid().optional(),
  avatarUrl: z.string().url().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  recruiterId: z.string().uuid().optional().nullable(),
  parsedData: z.record(z.any()).optional(),
  fitScore: z.number().optional().default(0),
  dataAiHint: z.string().optional().nullable(),
  applicationDate: z.string().optional(), // Date when Applicant applied (use upload_date from queue)
  uploadDate: z.string().optional(), // Alternative field name for queue upload date
  emailDate: z.string().optional().nullable(), // Date from email when Applicant applied via email
  emailSubject: z.string().optional().nullable(), // Subject line of the application email
  emailId: z.string().optional().nullable(), // Unique email message ID
  emailMetadata: z.record(z.any()).optional().nullable(), // Additional email metadata
});

const requestSchema = z.object({
  applicant: applicantDataSchema,
  job_matches: z.array(jobMatchSchema).optional(),
});

export async function POST(request: NextRequest) {
  const authError = requireAutomationApiKey(request);
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    await logAudit('ERROR', 'Invalid JSON body in automation Applicant creation request', 'API:Automation:CreateApplicant', null, { error: 'Invalid JSON' });
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = requestSchema.safeParse(body);
  if (!validation.success) {
    await logAudit('ERROR', 'Invalid input data in automation Applicant creation request', 'API:Automation:CreateApplicant', null, { 
      errors: validation.error.flatten().fieldErrors,
      input: body 
    });
    return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { job_matches } = validation.data;
  const applicantData = validation.data.applicant;
  
  // Check if job match feature is enabled
  const jobMatchFeatureEnabled = await getSystemSetting('jobMatchFeatureEnabled');
  const isJobMatchEnabled = jobMatchFeatureEnabled !== 'false';
  
  const newApplicantId = uuidv4();
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // Check for existing Applicant with same email to prevent duplicates
    const existingApplicantCheck = await client.query(
      `SELECT id, name, email FROM "Applicant" WHERE email = $1`,
      [applicantData.email]
    );

    if (existingApplicantCheck.rows.length > 0) {
      const existingApplicant = existingApplicantCheck.rows[0];
      
      await client.query('COMMIT');
      
      await logAudit('AUDIT', `Duplicate Applicant creation prevented for email ${applicantData.email}`, 'API:Automation:CreateApplicant', null, { 
        existingApplicantId: existingApplicant.id,
        existingApplicantName: existingApplicant.name,
        newApplicantName: applicantData.name,
        email: applicantData.email
      });
      
      return NextResponse.json({ 
        message: 'Applicant already exists', 
        existingApplicant: existingApplicant,
        skipped: true 
      }, { status: 200 });
    }

    // Always filter job_matches to valid objects with jobId (only if feature is enabled)
    let safeJobMatches: any[] = [];
    if (isJobMatchEnabled && Array.isArray(job_matches)) {
      safeJobMatches = job_matches.filter((m: any) => m && typeof m === 'object' && m.jobId);
    }
    
    if (safeJobMatches.length > 0) {
      applicantData.parsedData = {
        ...applicantData.parsedData,
        job_matches: safeJobMatches,
      };
      // Set positionId if not already set
      if (!applicantData.positionId) {
        applicantData.positionId = safeJobMatches[0].jobId;
      }
    } else if (applicantData.parsedData && applicantData.parsedData.job_matches) {
      // Remove job_matches if empty
      delete applicantData.parsedData.job_matches;
    }

    // Resolve status to a valid stage ID (default to 'Applied' if not provided)
    let resolvedStatusId: string | null = applicantData.status || null;
    if (!resolvedStatusId) {
      const appliedStageRes = await client.query(
        'SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = $1 LIMIT 1',
        ['applied']
      );
      resolvedStatusId = appliedStageRes.rows[0]?.id || null;
    }

    if (!resolvedStatusId) {
      throw new Error('Could not resolve a valid recruitment stage ID for Applicant status');
    }

    const insertApplicantQuery = `
      INSERT INTO "Applicant" (id, name, email, phone, "statusId", "avatarUrl", "positionId", "recruiterId", "parsedData", "fitScore", "dataAiHint", "applicationDate", "emailDate", "emailSubject", "emailId", "emailMetadata", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      RETURNING *;
    `;
    // Use applicationDate if provided, otherwise use uploadDate, otherwise use current date
    // This allows the queue upload date to be used as the application date
    const applicationDateToUse = applicantData.applicationDate || applicantData.uploadDate;
    
    const applicantParams = [
      newApplicantId,
      applicantData.name,
      applicantData.email,
      applicantData.phone,
      resolvedStatusId,
      applicantData.avatarUrl,
      applicantData.positionId,
      applicantData.recruiterId,
      applicantData.parsedData ? JSON.stringify(applicantData.parsedData) : null,
      applicantData.fitScore,
      applicantData.dataAiHint,
      applicationDateToUse ? new Date(applicationDateToUse) : createDateInTimezone(),
      applicantData.emailDate ? new Date(applicantData.emailDate) : null,
      applicantData.emailSubject || null,
      applicantData.emailId || null,
      applicantData.emailMetadata ? JSON.stringify(applicantData.emailMetadata) : null,
    ];

    const newApplicantResult = await client.query(insertApplicantQuery, applicantParams);
    const newApplicant = newApplicantResult.rows[0];

    if (isJobMatchEnabled && job_matches && job_matches.length > 0) {
      for (const match of job_matches) {
        const insertMatchQuery = `
          INSERT INTO "JobMatch" (id, "applicant_id", "jobId", "jobTitle", "fitScore", "matchReasons", "job_description_summary", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW());
        `;
        const matchParams = [
          uuidv4(),
          newApplicantId,
          match.jobId,
          match.jobTitle,
          match.fitScore, // Already 0-1
          match.matchReasons,
          match.job_description_summary
        ];
        await client.query(insertMatchQuery, matchParams);
      }
    }

    await client.query('COMMIT');
    
    await logAudit('AUDIT', `Applicant '${applicantData.name}' created via automation${isJobMatchEnabled ? ` with ${job_matches?.length || 0} job matches` : ' (job match feature disabled)'}`, 'API:Automation:CreateApplicant', null, { 
      applicantId: newApplicantId,
      applicantName: applicantData.name,
      applicantEmail: applicantData.email,
      positionId: applicantData.positionId,
      recruiterId: applicantData.recruiterId,
      jobMatchesCount: isJobMatchEnabled ? (job_matches?.length || 0) : 0,
      fitScore: applicantData.fitScore
    });
    
    return NextResponse.json({ message: 'Applicant and matches created successfully', applicant: newApplicant }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Automation Applicant creation failed. Error: ${error.message}`, 'API:Automation:CreateApplicant', null, { 
      applicantName: applicantData.name,
      applicantEmail: applicantData.email,
      error: error.message 
    });
    return NextResponse.json({ message: 'Error creating Applicant', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET() {
  await logAudit('INFO', 'Automation Applicant creation endpoint health check', 'API:Automation:CreateApplicant', null);
  return NextResponse.json({ ok: true });
}
