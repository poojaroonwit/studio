import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { hasPermission } from '@/lib/permissions';

const updateApplicantSourceSchema = z.object({
  name: z.string().min(1, "Source name is required").optional(),
  description: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  allowSubSource: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

/**
 * @openapi
 * /api/settings/Applicant-sources/{id}:
 *   get:
 *     summary: Get Applicant source by ID
 *     description: Returns a specific Applicant source by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Applicant source details
 *       404:
 *         description: Applicant source not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update Applicant source
 *     description: Updates a Applicant source. Requires Admin or SYSTEM_SETTINGS_MANAGE permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *       200:
 *         description: Applicant source updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       404:
 *         description: Applicant source not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete Applicant source
 *     description: Deletes a Applicant source. Requires Admin or SYSTEM_SETTINGS_MANAGE permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Applicant source deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       404:
 *         description: Applicant source not found
 *       500:
 *         description: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const result = await getPool().query(`
      SELECT 
        id, name, description, email, logo, allow_sub_source as "allowSubSource", 
        sort_order as "sortOrder", is_active as "isActive", 
        "createdAt", "updatedAt"
      FROM "ApplicantSource"
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "Applicant source not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch Applicant source:", error);
    await logAudit('ERROR', `Failed to fetch Applicant source. Error: ${error.message}`, 'API:ApplicantSources:GetById', session.user.id);
    return NextResponse.json({ message: "Error fetching Applicant source", error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check permissions
  if (!hasPermission(session.user, 'SYSTEM_SETTINGS_EDIT')) {
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateApplicantSourceSchema.parse(body);

    // Check if source exists
    const existingResult = await getPool().query(
      'SELECT id, name FROM "ApplicantSource" WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ message: "Applicant source not found" }, { status: 404 });
    }

    // If name is being updated, check for duplicates
    if (validatedData.name && validatedData.name !== existingResult.rows[0].name) {
      const duplicateResult = await getPool().query(
        'SELECT id FROM "ApplicantSource" WHERE name = $1 AND id != $2',
        [validatedData.name, id]
      );

      if (duplicateResult.rows.length > 0) {
        return NextResponse.json({ message: "A Applicant source with this name already exists" }, { status: 409 });
      }
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (validatedData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(validatedData.name);
    }
    if (validatedData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(validatedData.description);
    }
    if (validatedData.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(validatedData.email);
    }
    if (validatedData.logo !== undefined) {
      updateFields.push(`logo = $${paramIndex++}`);
      updateValues.push(validatedData.logo);
    }
    if (validatedData.allowSubSource !== undefined) {
      updateFields.push(`allow_sub_source = $${paramIndex++}`);
      updateValues.push(validatedData.allowSubSource);
    }
    if (validatedData.sortOrder !== undefined) {
      updateFields.push(`sort_order = $${paramIndex++}`);
      updateValues.push(validatedData.sortOrder);
    }
    if (validatedData.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(validatedData.isActive);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    updateFields.push(`"updatedAt" = NOW()`);
    updateValues.push(id);

    const result = await getPool().query(`
      UPDATE "ApplicantSource"
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, description, email, logo, allow_sub_source as "allowSubSource", 
                sort_order as "sortOrder", is_active as "isActive", 
                "createdAt", "updatedAt"
    `, updateValues);

    const updatedSource = result.rows[0];
    
    await logAudit('INFO', `Updated Applicant source: ${updatedSource.name}`, 'API:ApplicantSources:Update', session.user.id);
    
    return NextResponse.json(updatedSource, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update Applicant source:", error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: "Validation error", errors: error.errors }, { status: 400 });
    }
    await logAudit('ERROR', `Failed to update Applicant source. Error: ${error.message}`, 'API:ApplicantSources:Update', session.user.id);
    return NextResponse.json({ message: "Error updating Applicant source", error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check permissions
  if (!hasPermission(session.user, 'SYSTEM_SETTINGS_EDIT')) {
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  try {
    const { id } = await params;
    // Check if source exists and get its name for audit log
    const existingResult = await getPool().query(
      'SELECT id, name FROM "ApplicantSource" WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ message: "Applicant source not found" }, { status: 404 });
    }

    const sourceName = existingResult.rows[0].name;

    // Check if any applicants are using this source
    const applicantsResult = await getPool().query(
      'SELECT COUNT(*) as count FROM "applicant" WHERE "sourceId" = $1',
      [id]
    );

    if (parseInt(applicantsResult.rows[0].count) > 0) {
      return NextResponse.json({ 
        message: "Cannot delete Applicant source that is being used by applicants. Please reassign or remove the source from applicants first." 
      }, { status: 400 });
    }

    // Delete the source
    await getPool().query(
      'DELETE FROM "ApplicantSource" WHERE id = $1',
      [id]
    );

    await logAudit('INFO', `Deleted Applicant source: ${sourceName}`, 'API:ApplicantSources:Delete', session.user.id);
    
    return NextResponse.json({ message: "Applicant source deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete Applicant source:", error);
    await logAudit('ERROR', `Failed to delete Applicant source. Error: ${error.message}`, 'API:ApplicantSources:Delete', session.user.id);
    return NextResponse.json({ message: "Error deleting Applicant source", error: error.message }, { status: 500 });
  }
}
