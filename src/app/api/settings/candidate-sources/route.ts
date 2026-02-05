export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { v4 as uuidv4 } from 'uuid';
import { hasPermission } from '@/lib/permissions';

import { auth } from '@/auth';
const createApplicantSourceSchema = z.object({
  name: z.string().min(1, "Source name is required"),
  description: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  allowSubSource: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const updateApplicantSourceSchema = createApplicantSourceSchema.partial().omit({ name: true });

/**
 * @openapi
 * /api/settings/Applicant-sources:
 *   get:
 *     summary: Get Applicant sources
 *     description: Returns all Applicant sources ordered by sort order.
 *     responses:
 *       200:
 *         description: List of Applicant sources
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a Applicant source
 *     description: Creates a new Applicant source. Requires Admin or SYSTEM_SETTINGS_MANAGE permission.
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
 *         description: Applicant source created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check if user has permission to view Applicant sources
  // Users should be able to view sources if they can view Applicants (since sources are used for Applicant management)
  // Also allow Admin role to access
  const hasViewPermission = hasPermission(session.user, 'Applicants_VIEW') || 
                           session.user.role === 'Admin';
  
  if (!hasViewPermission) {
    console.warn(`Permission denied for user ${session.user.id} (${session.user.name}) - missing Applicants_VIEW permission`);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions to view Applicant sources" }, { status: 403 });
  }

  try {
    const result = await getPool().query(`
      SELECT 
        id, name, description, email, logo, allow_sub_source as "allowSubSource", 
        sort_order as "sortOrder", is_active as "isActive", 
        "createdAt", "updatedAt"
      FROM "ApplicantSource"
      ORDER BY sort_order ASC, name ASC
    `);
    
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch Applicant sources:", error);
    await logAudit('ERROR', `Failed to fetch Applicant sources. Error: ${error.message}`, 'API:ApplicantSources:GetAll', session.user.id);
    return NextResponse.json({ message: "Error fetching Applicant sources", error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check permissions - only admins can create/edit Applicant sources
  if (!hasPermission(session.user, 'SYSTEM_SETTINGS_EDIT') && session.user.role !== 'Admin') {
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validatedData = createApplicantSourceSchema.parse(body);

    // Check if name already exists
    const existingResult = await getPool().query(
      'SELECT id FROM "ApplicantSource" WHERE name = $1',
      [validatedData.name]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json({ message: "A Applicant source with this name already exists" }, { status: 409 });
    }

    const id = uuidv4();
    const result = await getPool().query(`
      INSERT INTO "ApplicantSource" (
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
    
    await logAudit('INFO', `Created Applicant source: ${validatedData.name}`, 'API:ApplicantSources:Create', session.user.id);
    
    return NextResponse.json(newSource, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create Applicant source:", error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: "Validation error", errors: error.errors }, { status: 400 });
    }
    await logAudit('ERROR', `Failed to create Applicant source. Error: ${error.message}`, 'API:ApplicantSources:Create', session.user.id);
    return NextResponse.json({ message: "Error creating Applicant source", error: error.message }, { status: 500 });
  }
}
