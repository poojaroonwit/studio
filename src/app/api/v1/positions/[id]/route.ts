import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getPool } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { 
  createSuccessResponse, 
  handleApiError, 
  createUnauthorizedError, 
  createForbiddenError, 
  createValidationError, 
  createNotFoundError, 
  createInternalServerError 
} from '@/lib/apiErrorHandler';

const updatePositionSchema = z.object({
  title: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isOpen: z.boolean().optional(),
  position_level: z.string().optional().nullable(),
  custom_attributes: z.record(z.any()).optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return handleApiError(req, createUnauthorizedError('Authentication required'));
  }
  const { id } = params;
  const client = await getPool().connect();
  try {
    const query = 'SELECT id, title, department, description, "isOpen", position_level, "customAttributes", "createdAt", "updatedAt" FROM "Position" WHERE id = $1';
    const result = await client.query(query, [id]);
    if (result.rows.length === 0) {
      return handleApiError(req, createNotFoundError('Position not found'));
    }
    const position = result.rows[0];
    return createSuccessResponse(req, {
      ...position,
      custom_attributes: position.customAttributes || {},
    }, 200);
  } catch (error) {
    return handleApiError(req, createInternalServerError('Error fetching position', { 
      originalError: (error as Error).message 
    }));
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user || (user.role !== 'Admin' && !user.modulePermissions?.includes('POSITIONS_MANAGE'))) {
    return handleApiError(req, createForbiddenError('Insufficient permissions to update positions'));
  }
  const { id } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return handleApiError(req, createValidationError('Invalid JSON body'));
  }
  const validationResult = updatePositionSchema.safeParse(body);
  if (!validationResult.success) {
    return handleApiError(req, createValidationError('Invalid input', validationResult.error.flatten().fieldErrors));
  }
  const { title, department, description, isOpen, position_level, custom_attributes } = validationResult.data;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const positionExistsQuery = 'SELECT id FROM "Position" WHERE id = $1';
    const existingResult = await client.query(positionExistsQuery, [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return handleApiError(req, createNotFoundError('Position not found'));
    }
    const updateQuery = `
      UPDATE "Position" 
      SET title = $1, department = $2, description = $3, "isOpen" = $4, 
          position_level = $5, "customAttributes" = $6
      WHERE id = $7
      RETURNING *;
    `;
    const updateResult = await client.query(updateQuery, [
      title, department, description, isOpen, position_level, custom_attributes || {}, id
    ]);
    await client.query('COMMIT');
    const updatedPosition = updateResult.rows[0];
    return createSuccessResponse(req, {
      message: 'Position updated successfully',
      position: {
        ...updatedPosition,
        custom_attributes: updatedPosition.customAttributes || {},
      }
    }, 200);
  } catch (error) {
    await client.query('ROLLBACK');
    return handleApiError(req, createInternalServerError('Error updating position', { 
      originalError: (error as Error).message 
    }));
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user || (user.role !== 'Admin' && !user.modulePermissions?.includes('POSITIONS_MANAGE'))) {
    return handleApiError(req, createForbiddenError('Insufficient permissions to delete positions'));
  }
  const { id } = params;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const currentPosition = await client.query('SELECT * FROM "Position" WHERE id = $1', [id]);
    if (currentPosition.rows.length === 0) {
      await client.query('ROLLBACK');
      return handleApiError(req, createNotFoundError('Position not found'));
    }
    await client.query('DELETE FROM "Position" WHERE id = $1', [id]);
    await client.query('COMMIT');
    return createSuccessResponse(req, { message: 'Position deleted successfully' }, 200);
  } catch (error) {
    await client.query('ROLLBACK');
    return handleApiError(req, createInternalServerError('Error deleting position', { 
      originalError: (error as Error).message 
    }));
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 