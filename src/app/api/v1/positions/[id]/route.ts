export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getPool } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { SimpleErrorHandler,
  createUnauthorizedError,
  createForbiddenError,
  createValidationError,
  createNotFoundError,
  createInternalServerError
} from '@/lib/errors';;
import { logAudit } from '@/lib/auditLog';

const updatePositionSchema = z.object({
  title: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  matchCriteria: z.string().optional().nullable(),
  isOpen: z.boolean().optional(),
  positionLevel: z.string().optional().nullable(),
  custom_attributes: z.record(z.any()).optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }
  const { id } = await params;
  const client = await getPool().connect();
  try {
    const query = 'SELECT p.id, p.title, p.department, p.description, p."matchCriteria", p."isOpen", p."positionLevel", p."gradeId", p."recruiterId", p."customAttributes", p."createdAt", p."updatedAt", u.name as "recruiterName", u.email as "recruiterEmail" FROM "Position" p LEFT JOIN "User" u ON p."recruiterId" = u.id WHERE p.id = $1';
    const result = await client.query(query, [id]);
    if (result.rows.length === 0) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Position not found'));
    }
    const position = result.rows[0];
    return SimpleErrorHandler.createSuccessResponse(req, {
      ...position,
      custom_attributes: position.customAttributes || {},
      recruiter: position.recruiterId ? {
        id: position.recruiterId,
        name: position.recruiterName,
        email: position.recruiterEmail
      } : null
    }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error fetching position: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user || (user.role !== 'Admin' && !user.modulePermissions?.includes('POSITIONS_EDIT_DETAILED'))) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to update positions'));
  }
  const { id } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid JSON body'));
  }
  const validationResult = updatePositionSchema.safeParse(body);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    const errorMsg = Object.entries(fieldErrors).map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`).join('; ');
    return SimpleErrorHandler.handleApiError(req, createValidationError(`Invalid input - ${errorMsg}`));
  }
  const updateData = validationResult.data;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const positionExistsQuery = 'SELECT id FROM "Position" WHERE id = $1';
    const existingResult = await client.query(positionExistsQuery, [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Position not found'));
    }

    // Build dynamic UPDATE query based on provided fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updateData.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      updateValues.push(updateData.title);
    }
    if (updateData.department !== undefined) {
      updateFields.push(`department = $${paramIndex++}`);
      updateValues.push(updateData.department);
    }
    if (updateData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(updateData.description);
    }
    if (updateData.matchCriteria !== undefined) {
      updateFields.push(`"matchCriteria" = $${paramIndex++}`);
      updateValues.push(updateData.matchCriteria);
    }
    if (updateData.isOpen !== undefined) {
      updateFields.push(`"isOpen" = $${paramIndex++}`);
      updateValues.push(updateData.isOpen);
    }
    if (updateData.positionLevel !== undefined) {
      updateFields.push(`"positionLevel" = $${paramIndex++}`);
      updateValues.push(updateData.positionLevel);
    }
    if (updateData.custom_attributes !== undefined) {
      updateFields.push(`"customAttributes" = $${paramIndex++}`);
      updateValues.push(updateData.custom_attributes);
    }

    // Add updatedAt timestamp
    updateFields.push(`"updatedAt" = NOW()`);

    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return SimpleErrorHandler.handleApiError(req, createValidationError('No fields to update'));
    }

    const updateQuery = `
      UPDATE "Position" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;
    updateValues.push(id);

    const updateResult = await client.query(updateQuery, updateValues);
    await client.query('COMMIT');
    const updatedPosition = updateResult.rows[0];
    const actingUserName = (user.name || user.email || user.id || 'System') as string;
    await logAudit('AUDIT', `Position '${updatedPosition.title}' updated by ${actingUserName}.`, 'API:V1:Positions:Update', user.id, { positionId: id, updatedFields: updateData });
    return SimpleErrorHandler.createSuccessResponse(req, {
      message: 'Position updated successfully',
      position: {
        ...updatedPosition,
        custom_attributes: updatedPosition.customAttributes || {},
      }
    }, 200);
  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : String(error);
    const actingUserName = user ? (user.name || user.email || user.id || 'System') : 'Unknown';
    await logAudit('ERROR', `Failed to update position (ID: ${id}) by ${actingUserName}. Error: ${errorMessage}`, 'API:V1:Positions:Update', user?.id, { positionId: id, error: errorMessage, ...body });
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error updating position: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user || (user.role !== 'Admin' && !user.modulePermissions?.includes('POSITIONS_DELETE'))) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to delete positions'));
  }
  const { id } = await params;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const currentPosition = await client.query('SELECT * FROM "Position" WHERE id = $1', [id]);
    if (currentPosition.rows.length === 0) {
      await client.query('ROLLBACK');
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Position not found'));
    }
    await client.query('DELETE FROM "Position" WHERE id = $1', [id]);
    await client.query('COMMIT');
    const actingUserName = (user.name || user.email || user.id || 'System') as string;
    await logAudit('AUDIT', `Position '${currentPosition.rows[0].title}' deleted by ${actingUserName}.`, 'API:V1:Positions:Delete', user.id, { positionId: id });
    return SimpleErrorHandler.createSuccessResponse(req, { message: 'Position deleted successfully' }, 200);
  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : String(error);
    const actingUserName = user ? (user.name || user.email || user.id || 'System') : 'Unknown';
    await logAudit('ERROR', `Failed to delete position (ID: ${id}) by ${actingUserName}. Error: ${errorMessage}`, 'API:V1:Positions:Delete', user?.id, { positionId: id, error: errorMessage });
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error deleting position: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 