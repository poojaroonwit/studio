import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const updateCandidateSourceSchema = z.object({
  name: z.string().min(1, "Source name is required").optional(),
  description: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  allowSubSource: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

/**
 * @openapi
 * /api/settings/candidate-sources/{id}:
 *   get:
 *     summary: Get candidate source by ID
 *     description: Returns a specific candidate source by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Candidate source details
 *       404:
 *         description: Candidate source not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update candidate source
 *     description: Updates a candidate source. Requires Admin or SYSTEM_SETTINGS_MANAGE permission.
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
 *         description: Candidate source updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       404:
 *         description: Candidate source not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete candidate source
 *     description: Deletes a candidate source. Requires Admin or SYSTEM_SETTINGS_MANAGE permission.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Candidate source deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       404:
 *         description: Candidate source not found
 *       500:
 *         description: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await getPool().query(`
      SELECT 
        id, name, description, logo, allow_sub_source as "allowSubSource", 
        sort_order as "sortOrder", is_active as "isActive", 
        "createdAt", "updatedAt"
      FROM "CandidateSource"
      WHERE id = $1
    `, [params.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "Candidate source not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch candidate source:", error);
    await logAudit('ERROR', `Failed to fetch candidate source. Error: ${error.message}`, 'API:CandidateSources:GetById', session.user.id);
    return NextResponse.json({ message: "Error fetching candidate source", error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check permissions
  if (session.user.role !== 'Admin' && 
      !session.user.modulePermissions?.includes('SYSTEM_SETTINGS_MANAGE')) {
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validatedData = updateCandidateSourceSchema.parse(body);

    // Check if source exists
    const existingResult = await getPool().query(
      'SELECT id, name FROM "CandidateSource" WHERE id = $1',
      [params.id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ message: "Candidate source not found" }, { status: 404 });
    }

    // If name is being updated, check for duplicates
    if (validatedData.name && validatedData.name !== existingResult.rows[0].name) {
      const duplicateResult = await getPool().query(
        'SELECT id FROM "CandidateSource" WHERE name = $1 AND id != $2',
        [validatedData.name, params.id]
      );

      if (duplicateResult.rows.length > 0) {
        return NextResponse.json({ message: "A candidate source with this name already exists" }, { status: 409 });
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
    updateValues.push(params.id);

    const result = await getPool().query(`
      UPDATE "CandidateSource"
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, description, logo, allow_sub_source as "allowSubSource", 
                sort_order as "sortOrder", is_active as "isActive", 
                "createdAt", "updatedAt"
    `, updateValues);

    const updatedSource = result.rows[0];
    
    await logAudit('INFO', `Updated candidate source: ${updatedSource.name}`, 'API:CandidateSources:Update', session.user.id);
    
    return NextResponse.json(updatedSource, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update candidate source:", error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: "Validation error", errors: error.errors }, { status: 400 });
    }
    await logAudit('ERROR', `Failed to update candidate source. Error: ${error.message}`, 'API:CandidateSources:Update', session.user.id);
    return NextResponse.json({ message: "Error updating candidate source", error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check permissions
  if (session.user.role !== 'Admin' && 
      !session.user.modulePermissions?.includes('SYSTEM_SETTINGS_MANAGE')) {
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  try {
    // Check if source exists and get its name for audit log
    const existingResult = await getPool().query(
      'SELECT id, name FROM "CandidateSource" WHERE id = $1',
      [params.id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ message: "Candidate source not found" }, { status: 404 });
    }

    const sourceName = existingResult.rows[0].name;

    // Check if any candidates are using this source
    const candidatesResult = await getPool().query(
      'SELECT COUNT(*) as count FROM "Candidate" WHERE "sourceId" = $1',
      [params.id]
    );

    if (parseInt(candidatesResult.rows[0].count) > 0) {
      return NextResponse.json({ 
        message: "Cannot delete candidate source that is being used by candidates. Please reassign or remove the source from candidates first." 
      }, { status: 400 });
    }

    // Delete the source
    await getPool().query(
      'DELETE FROM "CandidateSource" WHERE id = $1',
      [params.id]
    );

    await logAudit('INFO', `Deleted candidate source: ${sourceName}`, 'API:CandidateSources:Delete', session.user.id);
    
    return NextResponse.json({ message: "Candidate source deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete candidate source:", error);
    await logAudit('ERROR', `Failed to delete candidate source. Error: ${error.message}`, 'API:CandidateSources:Delete', session.user.id);
    return NextResponse.json({ message: "Error deleting candidate source", error: error.message }, { status: 500 });
  }
}
