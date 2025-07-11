import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';

const candidateImportSchema = z.object({
  candidates: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
    status: z.string().min(1),
    positionId: z.string().uuid().optional().nullable(),
    recruiterId: z.string().uuid().optional().nullable(),
    fitScore: z.number().min(0).max(100).optional(),
    custom_attributes: z.record(z.any()).optional().nullable(),
  }))
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

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = candidateImportSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }

  const { candidates } = validationResult.data;
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
        // Check if candidate already exists
        const existingResult = await client.query('SELECT id FROM "Candidate" WHERE email = $1', [candidate.email]);
        
        if (existingResult.rows.length > 0) {
          results.skipped++;
          continue;
        }

        // Insert new candidate
        const insertQuery = `
          INSERT INTO "Candidate" (id, name, email, phone, status, "positionId", "recruiterId", "fitScore", "customAttributes", "applicationDate", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        `;
        
        await client.query(insertQuery, [
          uuidv4(),
          candidate.name,
          candidate.email,
          candidate.phone || null,
          candidate.status,
          candidate.positionId || null,
          candidate.recruiterId || null,
          candidate.fitScore || null,
          candidate.custom_attributes || {}
        ]);

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
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "+1234567890",
        status: "new",
        positionId: null,
        recruiterId: null,
        fitScore: 85,
        custom_attributes: {}
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