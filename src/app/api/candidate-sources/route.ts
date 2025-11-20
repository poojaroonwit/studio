export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { hasPermission } from '@/lib/permissions';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

/**
 * @openapi
 * /api/candidate-sources:
 *   get:
 *     summary: Get candidate sources (legacy endpoint)
 *     description: Legacy endpoint that redirects to /api/settings/candidate-sources for backward compatibility.
 *     responses:
 *       200:
 *         description: List of candidate sources
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check if user has permission to view candidate sources
  // Users should be able to view sources if they can view candidates (since sources are used for candidate management)
  // Also allow Admin role to access
  const hasViewPermission = hasPermission(session.user, 'CANDIDATES_VIEW') || 
                           session.user.role === 'Admin';
  
  if (!hasViewPermission) {
    console.warn(`Permission denied for user ${session.user.id} (${session.user.name}) - missing CANDIDATES_VIEW permission`);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions to view candidate sources" }, { status: 403 });
  }

  try {
    const result = await getPool().query(`
      SELECT 
        id, name, description, email, logo, allow_sub_source as "allowSubSource", 
        sort_order as "sortOrder", is_active as "isActive", 
        "createdAt", "updatedAt"
      FROM "CandidateSource"
      ORDER BY sort_order ASC, name ASC
    `);
    
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch candidate sources:", error);
    await logAudit('ERROR', `Failed to fetch candidate sources. Error: ${error.message}`, 'API:CandidateSources:GetAll', session.user.id);
    return NextResponse.json({ message: "Error fetching candidate sources", error: error.message }, { status: 500 });
  }
}

/**
 * @openapi
 * /api/candidate-sources:
 *   post:
 *     summary: Create a candidate source (legacy endpoint)
 *     description: Legacy endpoint that redirects to /api/settings/candidate-sources for backward compatibility.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               email:
 *                 type: string
 *               logo:
 *                 type: string
 *               allowSubSource:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Candidate source created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       500:
 *         description: Server error
 */
const createCandidateSourceSchema = z.object({
  name: z.string().min(1, "Source name is required"),
  description: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  allowSubSource: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check permissions - only admins can create/edit candidate sources
  if (!hasPermission(session.user, 'SYSTEM_SETTINGS_EDIT') && session.user.role !== 'Admin') {
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validatedData = createCandidateSourceSchema.parse(body);

    // Check if name already exists
    const existingResult = await getPool().query(
      'SELECT id FROM "CandidateSource" WHERE name = $1',
      [validatedData.name]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json({ message: "A candidate source with this name already exists" }, { status: 409 });
    }

    const id = uuidv4();
    const result = await getPool().query(`
      INSERT INTO "CandidateSource" (
        id, name, description, email, logo, allow_sub_source, sort_order, is_active, 
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, name, description, email, logo, allow_sub_source as "allowSubSource", 
                sort_order as "sortOrder", is_active as "isActive", 
                "createdAt", "updatedAt"
    `, [
      id,
      validatedData.name,
      validatedData.description,
      validatedData.email,
      validatedData.logo,
      validatedData.allowSubSource,
      validatedData.sortOrder,
      validatedData.isActive
    ]);

    const newSource = result.rows[0];
    
    await logAudit('INFO', `Created candidate source: ${validatedData.name}`, 'API:CandidateSources:Create', session.user.id);
    
    return NextResponse.json(newSource, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create candidate source:", error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: "Validation error", errors: error.errors }, { status: 400 });
    }
    await logAudit('ERROR', `Failed to create candidate source. Error: ${error.message}`, 'API:CandidateSources:Create', session.user.id);
    return NextResponse.json({ message: "Error creating candidate source", error: error.message }, { status: 500 });
  }
}
