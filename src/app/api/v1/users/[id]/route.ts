export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { SimpleErrorHandler,
  createUnauthorizedError,
  createForbiddenError,
  createValidationError,
  createNotFoundError,
  createConflictError,
  createInternalServerError
} from '@/lib/errors';;
import { logAudit } from '@/lib/auditLog';

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['Admin', 'Recruiter', 'User']).optional(),

  password: z.string().min(6).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('USERS_VIEW')) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to view users'));
  }

  const { id } = await params;
  const client = await getPool().connect();
  
  try {
    const query = 'SELECT id, name, email, role, "createdAt", "updatedAt" FROM "User" WHERE id = $1';
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('User not found'));
    }

    const userData = result.rows[0];
    return SimpleErrorHandler.createSuccessResponse(req, {
      ...userData,
    }, 200);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error fetching user: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('USERS_EDIT')) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to update users'));
  }

  const { id } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid JSON body'));
  }

  const validationResult = updateUserSchema.safeParse(body);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    const errorMsg = Object.entries(fieldErrors).map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`).join('; ');
    return SimpleErrorHandler.handleApiError(req, createValidationError(`Invalid input - ${errorMsg}`));
  }

  const validatedData = validationResult.data;
  const name = validatedData.name;
  const email = validatedData.email;
  const role = validatedData.role;
  const password = validatedData.password;

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // Check if user exists
    const existingResult = await client.query('SELECT * FROM "User" WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('User not found'));
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingResult.rows[0].email) {
      const emailCheckResult = await client.query('SELECT id FROM "User" WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheckResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return SimpleErrorHandler.handleApiError(req, createConflictError('Email is already taken by another user'));
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name);
    }

    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(email);
    }

    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`);
      updateValues.push(role);
    }



    if (password !== undefined) {
      updateFields.push(`password = $${paramIndex++}`);
      updateValues.push(password);
    }

    updateValues.push(id);

    const updateQuery = `
      UPDATE "User" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, role, "createdAt", "updatedAt";
    `;

    const updateResult = await client.query(updateQuery, updateValues);
    await client.query('COMMIT');

    const updatedUser = updateResult.rows[0];
    const actingUserName = (user.name || user.email || user.id || 'System') as string;
    await logAudit('AUDIT', `User '${updatedUser.name}' updated by ${actingUserName}.`, 'API:V1:Users:Update', user.id, { userId: id, updatedFields: { name, email, role } });
    return SimpleErrorHandler.createSuccessResponse(req, {
      message: 'User updated successfully',
              user: {
          ...updatedUser,
        }
    }, 200);

  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : String(error);
    const actingUserName = user ? (user.name || user.email || user.id || 'System') : 'Unknown';
    await logAudit('ERROR', `Failed to update user (ID: ${id}) by ${actingUserName}. Error: ${errorMessage}`, 'API:V1:Users:Update', user?.id, { userId: id, error: errorMessage, ...body });
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error updating user: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('USERS_DELETE')) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to delete users'));
  }

  const { id } = await params;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');

    // Check if user exists
    const existingResult = await client.query('SELECT * FROM "User" WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('User not found'));
    }

    // Check if user has assigned applicants
    const applicantsResult = await client.query('SELECT COUNT(*) FROM "Applicant" WHERE "recruiterId" = $1', [id]);
    const applicantCount = parseInt(applicantsResult.rows[0].count, 10);
    
    if (applicantCount > 0) {
      await client.query('ROLLBACK');
      return SimpleErrorHandler.handleApiError(req, createValidationError(`Cannot delete user with assigned applicants. Found ${applicantCount} applicants assigned to this user.`));
    }

    await client.query('DELETE FROM "User" WHERE id = $1', [id]);
    await client.query('COMMIT');
    const actingUserName = (user.name || user.email || user.id || 'System') as string;
    await logAudit('AUDIT', `User (ID: ${id}) deleted by ${actingUserName}.`, 'API:V1:Users:Delete', user.id, { userId: id });
    return SimpleErrorHandler.createSuccessResponse(req, { message: 'User deleted successfully' }, 200);

  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : String(error);
    const actingUserName = user ? (user.name || user.email || user.id || 'System') : 'Unknown';
    await logAudit('ERROR', `Failed to delete user (ID: ${id}) by ${actingUserName}. Error: ${errorMessage}`, 'API:V1:Users:Delete', user?.id, { userId: id, error: errorMessage });
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error deleting user: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 