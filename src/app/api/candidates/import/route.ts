// src/app/api/candidates/import/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { CandidateStatus, CandidateDetails, PersonalInfo, ContactInfo } from '@/lib/types';
import { logAudit } from '@/lib/auditLog';
import { authOptions } from '@/lib/auth';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';

export const dynamic = "force-dynamic";

// Core statuses for fallback, full list comes from DB
const coreCandidateStatusValues: [CandidateStatus, ...CandidateStatus[]] = ['Applied', 'Screening', 'Shortlisted', 'Interview Scheduled', 'Interviewing', 'Offer Extended', 'Offer Accepted', 'Hired', 'Rejected', 'On Hold'];

// Enhanced Zod schema for candidate import with new template format
const importCandidateSchema = z.object({
  // Basic fields (from template headers)
  'Name*': z.string().min(1, "Name is required"),
  'Email*': z.string().email("A valid email is required"),
  'Phone': z.string().optional().nullable(),
  'Position ID': z.string().uuid().optional().nullable(),
  'Recruiter ID': z.string().uuid().optional().nullable(),
  'Fit Score (0-100)': z.string().optional().nullable(),
  'Status*': z.string().min(1, "Status is required"),
  'Application Date': z.string().optional().nullable(),
  'Location': z.string().optional().nullable(),
  'Introduction/About Me': z.string().optional().nullable(),
  'Education (JSON)': z.string().optional().nullable(),
  'Experience (JSON)': z.string().optional().nullable(),
  'Skills (JSON)': z.string().optional().nullable(),
  'Job Suitable (JSON)': z.string().optional().nullable(),
  'Custom Attributes (JSON)': z.string().optional().nullable(),
  
  // Legacy fields for backward compatibility
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("A valid email is required").optional(),
  phone: z.string().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  recruiterId: z.string().uuid().optional().nullable(),
  fitScore: z.number().min(0).max(100).optional(),
  status: z.string().min(1).optional(),
  parsedData: z.any().optional().nullable(),
  custom_attributes: z.any().optional().nullable(),
  resumePath: z.string().optional().nullable(),
});

// Schema for array of candidates
const importCandidatesArraySchema = z.array(importCandidateSchema);

// Helper function to parse JSON strings safely
function parseJsonSafely(jsonString: string | null | undefined): any {
  if (!jsonString || jsonString.trim() === '') return null;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`Invalid JSON format: ${jsonString}`);
  }
}

// Helper function to parse date safely
function parseDateSafely(dateString: string | null | undefined): Date | null {
  if (!dateString || dateString.trim() === '') return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}. Use YYYY-MM-DD format.`);
  }
  return date;
}

// Helper function to parse fit score safely
function parseFitScoreSafely(scoreString: string | null | undefined): number | null {
  if (!scoreString || scoreString.trim() === '') return null;
  const score = parseFloat(scoreString);
  if (isNaN(score) || score < 0 || score > 100) {
    throw new Error(`Invalid fit score: ${scoreString}. Must be a number between 0-100.`);
  }
  return score;
}

// Helper function to transform template data to internal format
function transformTemplateData(row: any): any {
  // Handle both new template format and legacy format
  const name = row['Name*'] || row.name;
  const email = row['Email*'] || row.email;
  const phone = row['Phone'] || row.phone;
  const positionId = row['Position ID'] || row.positionId;
  const recruiterId = row['Recruiter ID'] || row.recruiterId;
  const fitScore = parseFitScoreSafely(row['Fit Score (0-100)']) || row.fitScore;
  const status = row['Status*'] || row.status;
  const applicationDate = parseDateSafely(row['Application Date']);
  const location = row['Location'];
  const introduction = row['Introduction/About Me'];
  
  // Parse JSON fields
  const education = parseJsonSafely(row['Education (JSON)']);
  const experience = parseJsonSafely(row['Experience (JSON)']);
  const skills = parseJsonSafely(row['Skills (JSON)']);
  const jobSuitable = parseJsonSafely(row['Job Suitable (JSON)']);
  const customAttributes = parseJsonSafely(row['Custom Attributes (JSON)']) || row.custom_attributes;

  // Build parsedData object
  const parsedData: any = {};
  if (location || introduction) {
    parsedData.personal_info = {
      firstname: name?.split(' ')[0] || '',
      lastname: name?.split(' ').slice(1).join(' ') || '',
      location: location || null,
      introduction_aboutme: introduction || null,
    };
  }
  
  if (email || phone) {
    parsedData.contact_info = {
      email: email || '',
      phone: phone || null,
    };
  }

  if (education) parsedData.education = education;
  if (experience) parsedData.experience = experience;
  if (skills) parsedData.skills = skills;
  if (jobSuitable) parsedData.job_suitable = jobSuitable;

  return {
    name,
    email,
    phone,
    positionId,
    recruiterId,
    fitScore,
    status,
    applicationDate,
    parsedData: Object.keys(parsedData).length > 0 ? parsedData : null,
    custom_attributes: customAttributes,
  };
}

/**
 * @openapi
 * /api/candidates/import:
 *   get:
 *     summary: Get all imported candidates
 *     responses:
 *       200:
 *         description: List of imported candidates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Candidate'
 *   post:
 *     summary: Bulk import candidates
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/Candidate'
 *     responses:
 *       201:
 *         description: Import completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to import candidates
  if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('CANDIDATES_IMPORT')) {
    await logAudit('WARN', `Forbidden attempt to import candidates by ${actingUserName}.`, 'API:Candidates:Import', actingUserId);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to import candidates' }, { status: 403 });
  }

  let candidates: any[] = [];
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }
    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Parse Excel file
    let workbook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (e) {
      return NextResponse.json({ message: 'Failed to parse Excel file' }, { status: 400 });
    }
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    
    // Filter out instruction rows and transform data
    candidates = json
      .filter((row: any) => {
        // Skip rows that are clearly instructions (no email or name)
        return row['Email*'] || row.email || (row['Name*'] && row['Email*']);
      })
      .map(transformTemplateData);
  } else {
    // Fallback: try to parse JSON body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }
    candidates = body.map(transformTemplateData);
  }

  // Validate candidates
  const validationResult = importCandidatesArraySchema.safeParse(candidates);
  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }
  candidates = validationResult.data;

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const candidate of candidates) {
      try {
        // Check if candidate already exists
        const existingResult = await client.query('SELECT id FROM "Candidate" WHERE email = $1', [candidate.email]);
        if (existingResult.rows.length > 0) {
          results.failed++;
          results.errors.push(`Candidate with email ${candidate.email} already exists`);
          continue;
        }

        // Insert candidate
        const insertQuery = `
          INSERT INTO "Candidate" (id, name, email, phone, "positionId", "recruiterId", "fitScore", status, "parsedData", "customAttributes", "resumePath", "applicationDate", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          RETURNING *;
        `;
        const candidateId = uuidv4();
        await client.query(insertQuery, [
          candidateId, candidate.name, candidate.email, candidate.phone, candidate.positionId, 
          candidate.recruiterId, candidate.fitScore, candidate.status, candidate.parsedData, 
          candidate.custom_attributes, candidate.resumePath, candidate.applicationDate || new Date()
        ]);

        // Create initial transition record
        const insertTransitionQuery = `
          INSERT INTO "TransitionRecord" (id, "candidateId", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
        `;
        await client.query(insertTransitionQuery, [
          uuidv4(), candidateId, candidate.positionId, candidate.status, 'Imported via bulk import', actingUserId, new Date(), new Date()
        ]);

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed to import ${candidate.email}: ${error.message}`);
      }
    }

    await client.query('COMMIT');
    await logAudit('AUDIT', `Bulk import completed by ${actingUserName}. Success: ${results.success}, Failed: ${results.failed}`, 'API:Candidates:Import', actingUserId, { results });

    return NextResponse.json({
      message: 'Import completed',
      ...results
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Bulk import failed. Error: ${error.message}`, 'API:Candidates:Import', actingUserId, { input: candidates });
    return NextResponse.json({ message: 'Error during import', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * @openapi
 * /api/candidates/import:
 *   get:
 *     summary: Get all imported candidates
 *     description: Returns all imported candidates. Requires authentication.
 *     responses:
 *       200:
 *         description: List of imported candidates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Candidate'
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check if user has permission to view candidates
  if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('CANDIDATES_VIEW')) {
    await logAudit('WARN', `Forbidden attempt to view imported candidates by ${session.user.name || session.user.email}.`, 'API:Candidates:Import:Get', session.user.id);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to view candidates' }, { status: 403 });
  }

  const client = await getPool().connect();
  try {
    const candidatesQuery = `
      SELECT * FROM "Candidate"
      ORDER BY "applicationDate" DESC;
    `;
    const candidatesResult = await client.query(candidatesQuery);
    return NextResponse.json({
      data: candidatesResult.rows
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching candidates', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

    