// src/app/api/automation/create-candidate-with-matches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createDateInTimezone } from '@/lib/dateUtils';
import { getSystemSetting } from '@/lib/systemSettings';

export const dynamic = "force-dynamic";

const jobMatchSchema = z.object({
  jobId: z.string().optional(),
  jobTitle: z.string().optional(),
  fitScore: z.number().min(0).max(1).optional(),
  matchReasons: z.array(z.string()).optional(),
  job_description_summary: z.string().optional(),
});

const candidateDataSchema = z.object({
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
  applicationDate: z.string().optional(), // <-- Add this line
});

const requestSchema = z.object({
  candidate: candidateDataSchema,
  job_matches: z.array(jobMatchSchema).optional(),
});

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    await logAudit('ERROR', 'Invalid JSON body in automation candidate creation request', 'API:Automation:CreateCandidate', null, { error: 'Invalid JSON' });
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = requestSchema.safeParse(body);
  if (!validation.success) {
    await logAudit('ERROR', 'Invalid input data in automation candidate creation request', 'API:Automation:CreateCandidate', null, { 
      errors: validation.error.flatten().fieldErrors,
      input: body 
    });
    return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { candidate, job_matches } = validation.data;
  
  // Check if job match feature is enabled
  const jobMatchFeatureEnabled = await getSystemSetting('jobMatchFeatureEnabled');
  const isJobMatchEnabled = jobMatchFeatureEnabled !== 'false';
  
  const newCandidateId = uuidv4();
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // Check for existing candidate with same email to prevent duplicates
    const existingCandidateCheck = await client.query(
      `SELECT id, name, email FROM "Candidate" WHERE email = $1`,
      [candidate.email]
    );

    if (existingCandidateCheck.rows.length > 0) {
      const existingCandidate = existingCandidateCheck.rows[0];
      
      await client.query('COMMIT');
      
      await logAudit('AUDIT', `Duplicate candidate creation prevented for email ${candidate.email}`, 'API:Automation:CreateCandidate', null, { 
        existingCandidateId: existingCandidate.id,
        existingCandidateName: existingCandidate.name,
        newCandidateName: candidate.name,
        email: candidate.email
      });
      
      return NextResponse.json({ 
        message: 'Candidate already exists', 
        existingCandidate: existingCandidate,
        skipped: true 
      }, { status: 200 });
    }

    // Always filter job_matches to valid objects with jobId (only if feature is enabled)
    let safeJobMatches: any[] = [];
    if (isJobMatchEnabled && Array.isArray(job_matches)) {
      safeJobMatches = job_matches.filter((m: any) => m && typeof m === 'object' && m.jobId);
    }
    
    if (safeJobMatches.length > 0) {
      candidate.parsedData = {
        ...candidate.parsedData,
        job_matches: safeJobMatches,
      };
      // Set positionId if not already set
      if (!candidate.positionId) {
        candidate.positionId = safeJobMatches[0].jobId;
      }
    } else if (candidate.parsedData && candidate.parsedData.job_matches) {
      // Remove job_matches if empty
      delete candidate.parsedData.job_matches;
    }

    // Resolve status to a valid stage ID (default to 'Applied' if not provided)
    let resolvedStatusId: string | null = candidate.statusId || null;
    if (!resolvedStatusId) {
      const appliedStageRes = await client.query(
        'SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = $1 LIMIT 1',
        ['applied']
      );
      resolvedStatusId = appliedStageRes.rows[0]?.id || null;
    }

    if (!resolvedStatusId) {
      throw new Error('Could not resolve a valid recruitment stage ID for candidate status');
    }

    const insertCandidateQuery = `
      INSERT INTO "Candidate" (id, name, email, phone, "statusId", "avatarUrl", "positionId", "recruiterId", "parsedData", "fitScore", "dataAiHint", "applicationDate", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *;
    `;
    const candidateParams = [
      newCandidateId,
      candidate.name,
      candidate.email,
      candidate.phone,
      resolvedStatusId,
      candidate.avatarUrl,
      candidate.positionId,
      candidate.recruiterId,
      candidate.parsedData ? JSON.stringify(candidate.parsedData) : null,
      candidate.fitScore,
      candidate.dataAiHint,
      candidate.applicationDate ? new Date(candidate.applicationDate) : createDateInTimezone(),
    ];

    const newCandidateResult = await client.query(insertCandidateQuery, candidateParams);
    const newCandidate = newCandidateResult.rows[0];

    if (isJobMatchEnabled && job_matches && job_matches.length > 0) {
      for (const match of job_matches) {
        const insertMatchQuery = `
          INSERT INTO "JobMatch" (id, "candidateId", "jobId", "jobTitle", "fitScore", "matchReasons", "job_description_summary", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW());
        `;
        const matchParams = [
          uuidv4(),
          newCandidateId,
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
    
    await logAudit('AUDIT', `Candidate '${candidate.name}' created via automation${isJobMatchEnabled ? ` with ${job_matches?.length || 0} job matches` : ' (job match feature disabled)'}`, 'API:Automation:CreateCandidate', null, { 
      candidateId: newCandidateId,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      positionId: candidate.positionId,
      recruiterId: candidate.recruiterId,
      jobMatchesCount: isJobMatchEnabled ? (job_matches?.length || 0) : 0,
      fitScore: candidate.fitScore
    });
    
    return NextResponse.json({ message: 'Candidate and matches created successfully', candidate: newCandidate }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Automation candidate creation failed. Error: ${error.message}`, 'API:Automation:CreateCandidate', null, { 
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      error: error.message 
    });
    return NextResponse.json({ message: 'Error creating candidate', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET() {
  await logAudit('INFO', 'Automation candidate creation endpoint health check', 'API:Automation:CreateCandidate', null);
  return NextResponse.json({ ok: true });
}
