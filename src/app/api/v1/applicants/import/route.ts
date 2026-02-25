export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { safeJsonParse } from '@/lib/utils';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { getSystemSetting } from '@/lib/systemSettings';
import { parse as parseCsv } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import prisma from '@/lib/prisma';
import { NotificationService } from '@/lib/notificationService';
// Import the schemas from the main Applicant route
import { ApplicantInfoSchema, structuredEducationSchema, structuredExperienceSchema } from '../schemas';

async function resolveStageIdFromInput(input: string | undefined | null): Promise<string | null> {
  if (!input || typeof input !== 'string') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(input)) return input;

  try {
    const byName = await prisma.recruitmentStage.findFirst({
      where: { name: { equals: input, mode: 'insensitive' } },
      select: { id: true }
    });
    if (byName?.id) return byName.id;

    // Default to "Applied" stage if no specific status provided
    const appliedStage = await prisma.recruitmentStage.findFirst({
      where: {
        OR: [
          { name: { equals: 'Applied', mode: 'insensitive' } },
          { name: { equals: 'applied', mode: 'insensitive' } }
        ]
      },
      select: { id: true }
    });

    if (appliedStage?.id) return appliedStage.id;

    // Fallback to first stage by sortOrder if "Applied" not found
    const firstStage = await prisma.recruitmentStage.findFirst({
      orderBy: { sortOrder: 'asc' },
      select: { id: true }
    });
    return firstStage?.id || null;
  } catch {
    return null;
  }
}

const applicantImportSchema = z.object({
  applicants: z.array(
    z.union([
      z.object({
        applicant_info: ApplicantInfoSchema,
        educationData: z.array(structuredEducationSchema).optional(),
        experienceData: z.array(structuredExperienceSchema).optional(),
      }),
      z.object({
        name: z.string(),
        email: z.string().email(),
        phone: z.string().optional().nullable(),
        // Accept name or UUID; we will resolve to UUID at runtime
        status: z.string().optional(),
        positionId: z.string().uuid().optional().nullable(),
        recruiterId: z.string().uuid().optional().nullable(),
        fitScore: z.number().min(0).max(100).optional(),
        custom_attributes: z.record(z.any()).optional().nullable(),
        parsedData: z.any().optional().nullable(),
        resumePath: z.string().optional().nullable(),
      })
    ])
  )
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('applicantS_IMPORT')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to import Applicants' }), { status: 403, headers: handleCors(req) });
  }

  // Check if export/import feature is enabled
  const exportImportFeatureEnabled = await getSystemSetting('exportImportFeatureEnabled');
  if (exportImportFeatureEnabled === 'false') {
    return new Response(JSON.stringify({ error: 'Export/Import feature is disabled' }), { status: 403, headers: handleCors(req) });
  }

  let applicants: any[] = [];
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    // Handle file upload (CSV/Excel)
    try {
      const formData = await req.formData();
      const file = formData.get('file');

      if (!file || typeof file === 'string') {
        return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400, headers: handleCors(req) });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv')) {
        // Parse CSV
        const csvString = buffer.toString('utf-8');
        const records = parseCsv(csvString, { columns: true, skip_empty_lines: true });
        applicants = records.map((row: any) => ({
          name: String(row.name || row.Name || ''),
          email: String(row.email || row.Email || ''),
          phone: row.phone || row.Phone ? String(row.phone || row.Phone) : null,
          status: row.status || row.Status ? String(row.status || row.Status) : undefined,
          positionId: row.positionId || row.position_id ? String(row.positionId || row.position_id) : null,
          recruiterId: row.recruiterId || row.recruiter_id ? String(row.recruiterId || row.recruiter_id) : null,
          fitScore: row.fitScore ? parseFloat(row.fitScore) : null,
          custom_attributes: safeJsonParse(row.custom_attributes, {}),
          parsedData: safeJsonParse(row.parsedData, null),
          resumePath: row.resumePath || row.resume_path ? String(row.resumePath || row.resume_path) : null,
        }));
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Parse Excel
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        const worksheet = workbook.worksheets[0]; // Get first worksheet
        const json: any[] = [];
        const headers: { [key: number]: string } = {};

        // Extract headers from first row
        const firstRow = worksheet.getRow(1);
        firstRow.eachCell((cell: any, colNumber: number) => {
          headers[colNumber] = String(cell.value || '');
        });

        // Extract data
        worksheet.eachRow((row: any, rowNumber: number) => {
          if (rowNumber === 1) return; // Skip header row

          const rowData: any = {};
          // Initialize defined headers with empty string to match xlsx defval: ''
          Object.values(headers).forEach(h => rowData[h] = '');

          row.eachCell((cell: any, colNumber: number) => {
            const header = headers[colNumber];
            if (header) {
              // Use cell.text for safer string representation of flexible types
              // For primitive values, cell.value is fine, but cell.text handles rich text etc nicely for import.
              // However, numbers might be converted to string. 
              // Original xlsx logic: sheet_to_json default behavior tries to keep types but here we cast everything to String in the map function anyway.
              // So cell.text or String(cell.value) is likely fine.
              // Let's use cell.value for potentially numbers (fitScore) but handled below.
              // Actually, existing code casts everything to String except fitScore.
              // Let's try to keep original value if simple, else text.
              const val = cell.value;
              if (val && typeof val === 'object' && 'text' in val) {
                rowData[header] = (val as any).text;
              } else {
                rowData[header] = val;
              }
            }
          });
          json.push(rowData);
        });

        applicants = json.map((row: any) => ({
          name: String(row.name || row.Name || ''),
          email: String(row.email || row.Email || ''),
          phone: row.phone || row.Phone ? String(row.phone || row.Phone) : null,
          status: row.status || row.Status ? String(row.status || row.Status) : undefined,
          positionId: row.positionId || row.position_id ? String(row.positionId || row.position_id) : null,
          recruiterId: row.recruiterId || row.recruiter_id ? String(row.recruiterId || row.recruiter_id) : null,
          fitScore: row.fitScore ? parseFloat(row.fitScore) : null,
          custom_attributes: safeJsonParse(row.custom_attributes, {}),
          parsedData: safeJsonParse(row.parsedData, null),
          resumePath: row.resumePath || row.resume_path ? String(row.resumePath || row.resume_path) : null,
        }));
      } else {
        return new Response(JSON.stringify({ error: 'Unsupported file type. Please upload CSV or Excel files.' }), { status: 400, headers: handleCors(req) });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to parse file', details: (error as Error).message }), { status: 400, headers: handleCors(req) });
    }
  } else {
    // Handle JSON body
    try {
      const body = await req.json();
      const validationResult = applicantImportSchema.safeParse(body);
      if (!validationResult.success) {
        return new Response(JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
      }
      applicants = validationResult.data.applicants;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: handleCors(req) });
    }
  }

  // Validate applicants
  const validationResult = applicantImportSchema.safeParse({ applicants: applicants });
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const applicant of applicants) {
      try {
        // Extract fitScore from applicant, applicant_info, or applicant_info.job_applied
        let fitScore = null;
        if (typeof applicant.fitScore === 'number') {
          fitScore = Math.max(0, Math.min(1, applicant.fitScore / 100));
        } else if (applicant.applicant_info && typeof applicant.applicant_info.fitScore === 'number') {
          fitScore = Math.max(0, Math.min(1, applicant.applicant_info.fitScore / 100));
        } else if (applicant.applicant_info && applicant.applicant_info.job_applied && typeof applicant.applicant_info.job_applied.fitScore === 'number') {
          fitScore = Math.max(0, Math.min(1, applicant.applicant_info.job_applied.fitScore / 100));
        }

        const applicantId = uuidv4();
        // Resolve status to stage UUID with backward-compat for names
        const resolvedStatusId = await resolveStageIdFromInput(applicant.status || applicant?.applicant_info?.status || undefined);
        if (!resolvedStatusId) {
          return new Response(JSON.stringify({ error: 'Unable to resolve a valid recruitment stage for a Applicant' }), { status: 400, headers: handleCors(req) });
        }

        const insertQuery = `
          INSERT INTO "Applicant" (id, name, email, phone, "statusId", "positionId", "recruiterId", "fitScore", "customAttributes", "parsedData", "resumePath", "applicationDate")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        `;
        await client.query(insertQuery, [
          applicantId,
          applicant.name,
          applicant.email,
          applicant.phone || null,
          resolvedStatusId,
          applicant.positionId || null,
          applicant.recruiterId || null,
          fitScore,
          applicant.custom_attributes || {},
          applicant.parsedData || null,
          applicant.resumePath || null
        ]);

        // Auto-assign recruiter if Applicant has a position but no recruiter
        if (applicant.positionId && !applicant.recruiterId) {
          try {
            const position = await prisma.position.findUnique({
              where: { id: applicant.positionId },
              include: { recruiter: { select: { id: true, name: true, email: true } } }
            });

            if (position && position.recruiterId && position.recruiter) {
              await prisma.applicant.update({
                where: { id: applicantId },
                data: { recruiter: { connect: { id: position.recruiterId } }, updatedAt: new Date() },
              });

              await prisma.transitionRecord.create({
                data: {
                  id: uuidv4(),
                  applicant: { connect: { id: applicantId } },
                  position: applicant.positionId ? { connect: { id: applicant.positionId } } : undefined,
                  stage: resolvedStatusId,
                  notes: `Recruiter auto-assigned from position: ${position.recruiter.name}`,
                  actingUser: { connect: { id: user.id } },
                  date: new Date(),
                },
              });

              try {
                await NotificationService.notifyApplicantAdded(
                  applicantId,
                  applicant.name,
                  applicant.positionId,
                  position.title,
                  position.recruiterId,
                  user.id
                );
              } catch (notificationError) {
                console.error('Failed to send Applicant added notification:', notificationError);
              }
            }
          } catch (syncError) {
            console.error('Failed to auto-assign recruiter after Applicant import:', syncError);
          }
        }

        results.imported++;
      } catch (error) {
        results.errors.push(`Failed to import ${applicant.email}: ${(error as Error).message}`);
      }
    }

    await client.query('COMMIT');

    return new Response(JSON.stringify({
      message: 'Import completed',
      results
    }), { status: 200, headers: handleCors(req) });

  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error importing Applicants', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  // Return import template
  const template = {
    applicants: [
      {
        name: "Sample Applicant",
        email: "john.doe@example.com",
        phone: "+1234567890",
        status: "Applied", // Backward-compat example; will be resolved to UUID at runtime
        positionId: null,
        recruiterId: null,
        fitScore: 85,
        custom_attributes: {},
        parsedData: null,
        resumePath: null
      }
    ]
  };

  return new Response(JSON.stringify(template), {
    status: 200,
    headers: {
      ...handleCors(req),
      'Content-Type': 'application/json'
    }
  });
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 

