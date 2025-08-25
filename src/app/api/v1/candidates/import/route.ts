import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { safeJsonParse } from '@/lib/utils';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { parse as parseCsv } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import { NotificationService } from '@/lib/notificationService';
// Import the schemas from the main candidate route
import { candidateInfoSchema, structuredEducationSchema, structuredExperienceSchema } from '../schemas';

const candidateImportSchema = z.object({
  candidates: z.array(
    z.union([
      z.object({
        candidate_info: candidateInfoSchema,
        educationData: z.array(structuredEducationSchema).optional(),
        experienceData: z.array(structuredExperienceSchema).optional(),
      }),
      z.object({
        name: z.string(),
        email: z.string().email(),
        phone: z.string().optional().nullable(),
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

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to import candidates' }), { status: 403, headers: handleCors(req) });
  }

  let candidates: any[] = [];
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
        candidates = records.map((row: any) => ({
          name: String(row.name || row.Name || ''),
          email: String(row.email || row.Email || ''),
          phone: row.phone || row.Phone ? String(row.phone || row.Phone) : null,
          status: String(row.status || row.Status || 'Applied'),
          positionId: row.positionId || row.position_id ? String(row.positionId || row.position_id) : null,
          recruiterId: row.recruiterId || row.recruiter_id ? String(row.recruiterId || row.recruiter_id) : null,
          fitScore: row.fitScore ? parseFloat(row.fitScore) : null,
          custom_attributes: safeJsonParse(row.custom_attributes, {}),
          parsedData: safeJsonParse(row.parsedData, null),
          resumePath: row.resumePath || row.resume_path ? String(row.resumePath || row.resume_path) : null,
        }));
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Parse Excel
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        candidates = json.map((row: any) => ({
          name: String(row.name || row.Name || ''),
          email: String(row.email || row.Email || ''),
          phone: row.phone || row.Phone ? String(row.phone || row.Phone) : null,
          status: String(row.status || row.Status || 'Applied'),
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
      const validationResult = candidateImportSchema.safeParse(body);
      if (!validationResult.success) {
        return new Response(JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
      }
      candidates = validationResult.data.candidates;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: handleCors(req) });
    }
  }

  // Validate candidates
  const validationResult = candidateImportSchema.safeParse({ candidates });
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

    for (const candidate of candidates) {
      try {
        // Remove duplicate email check
        // Extract fitScore from candidate, candidate_info, or candidate_info.job_applied
        let fitScore = null;
        if (typeof candidate.fitScore === 'number') {
          fitScore = Math.max(0, Math.min(1, candidate.fitScore / 100));
        } else if (candidate.candidate_info && typeof candidate.candidate_info.fitScore === 'number') {
          fitScore = Math.max(0, Math.min(1, candidate.candidate_info.fitScore / 100));
        } else if (candidate.candidate_info && candidate.candidate_info.job_applied && typeof candidate.candidate_info.job_applied.fitScore === 'number') {
          fitScore = Math.max(0, Math.min(1, candidate.candidate_info.job_applied.fitScore / 100));
        }
        // Insert new candidate
        const candidateId = uuidv4();
        const insertQuery = `
          INSERT INTO "Candidate" (id, name, email, phone, status, "positionId", "recruiterId", "fitScore", "customAttributes", "parsedData", "resumePath", "applicationDate")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        `;
        await client.query(insertQuery, [
          candidateId,
          candidate.name,
          candidate.email,
          candidate.phone || null,
          candidate.status,
          candidate.positionId || null,
          candidate.recruiterId || null,
          fitScore,
          candidate.custom_attributes || {},
          candidate.parsedData || null,
          candidate.resumePath || null
        ]);
        
        // Auto-assign recruiter if candidate has a position but no recruiter
        if (candidate.positionId && !candidate.recruiterId) {
          try {
            // Get position with recruiter using Prisma
            const position = await prisma.position.findUnique({
              where: { id: candidate.positionId },
              include: { 
                recruiter: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            });

            if (position && position.recruiterId && position.recruiter) {
              // Update candidate with recruiter using Prisma
              const updatedCandidate = await prisma.candidate.update({
                where: { id: candidateId },
                data: { 
                  recruiterId: position.recruiterId,
                  updatedAt: new Date()
                },
                include: {
                  recruiter: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                }
              });

              // Create transition record for recruiter assignment
              await prisma.transitionRecord.create({
                data: {
                  id: uuidv4(),
                  candidateId: candidateId,
                  positionId: candidate.positionId,
                  stage: candidate.status || 'Applied',
                  notes: `Recruiter auto-assigned from position: ${position.recruiter.name}`,
                  actingUserId: user.id,
                  date: new Date(),
                },
              });

         
              // Send notification to the assigned recruiter
              try {
                await NotificationService.notifyCandidateAdded(
                  candidateId,
                  candidate.name,
                  candidate.positionId,
                  position.title,
                  position.recruiterId,
                  user.id
                );
                // console.log(`✅ Notification sent to recruiter ${position.recruiter.name} for imported candidate ${candidate.name}`);
              } catch (notificationError) {
                console.error('Failed to send candidate added notification:', notificationError);
                // Don't fail the import if notification fails
              }
            } else if (position && !position.recruiterId) {
              console.log(`⚠️ Position ${candidate.positionId} exists but has no recruiter assigned`);
            } else if (!position) {
              console.log(`❌ Position ${candidate.positionId} not found in database`);
            }
          } catch (syncError) {
            console.error('Failed to auto-assign recruiter after candidate import:', syncError);
            // Don't fail the import if sync fails
          }
        }
        
        results.imported++;
      } catch (error) {
        results.errors.push(`Failed to import ${candidate.email}: ${(error as Error).message}`);
      }
    }

    await client.query('COMMIT');

    return new Response(JSON.stringify({
      message: 'Import completed',
      results
    }), { status: 200, headers: handleCors(req) });

  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error importing candidates', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
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
    candidates: [
      {
        name: "Sample Candidate",
        email: "john.doe@example.com",
        phone: "+1234567890",
        status: "Applied",
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