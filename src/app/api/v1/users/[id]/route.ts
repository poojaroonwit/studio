import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { 
  createSuccessResponse, 
  handleApiError, 
  createUnauthorizedError, 
  createForbiddenError, 
  createValidationError, 
  createNotFoundError, 
  createConflictError, 
  createInternalServerError 
} from '@/lib/apiErrorHandler';
import { logAudit } from '@/lib/auditLog';

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['Admin', 'Recruiter', 'User']).optional(),
  modulePermissions: z.array(z.string()).optional(),
  password: z.string().min(6).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('USERS_VIEW')) {
    return handleApiError(req, createForbiddenError('Insufficient permissions to view users'));
  }

  const { id } = params;
  const client = await getPool().connect();
  
  try {
    const query = 'SELECT id, name, email, role, "modulePermissions", "createdAt", "updatedAt" FROM "User" WHERE id = $1';
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return handleApiError(req, createNotFoundError('User not found'));
    }

    const userData = result.rows[0];
    return createSuccessResponse(req, {
      ...userData,
      modulePermissions: userData.modulePermissions || [],
    }, 200);

  } catch (error) {
    return handleApiError(req, createInternalServerError('Error fetching user', { 
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
  
  if (!user) {
    return handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('USERS_MANAGE')) {
    return handleApiError(req, createForbiddenError('Insufficient permissions to update users'));
  }

  const { id } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return handleApiError(req, createValidationError('Invalid JSON body'));
  }

  const validationResult = updateUserSchema.safeParse(body);
  if (!validationResult.success) {
    return handleApiError(req, createValidationError('Invalid input', validationResult.error.flatten().fieldErrors));
  }

  const { name, email, role, modulePermissions, password } = validationResult.data;

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // Check if user exists
    const existingResult = await client.query('SELECT * FROM "User" WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return handleApiError(req, createNotFoundError('User not found'));
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingResult.rows[0].email) {
      const emailCheckResult = await client.query('SELECT id FROM "User" WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheckResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return handleApiError(req, createConflictError('Email is already taken by another user'));
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

    if (modulePermissions !== undefined) {
      updateFields.push(`"modulePermissions" = $${paramIndex++}`);
      updateValues.push(modulePermissions);
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
      RETURNING id, name, email, role, "modulePermissions", "createdAt", "updatedAt";
    `;

    const updateResult = await client.query(updateQuery, updateValues);
    await client.query('COMMIT');

    const updatedUser = updateResult.rows[0];
    await logAudit('AUDIT', `User '${updatedUser.name}' updated by ${user.name}.`, 'API:V1:Users:Update', user.id, { userId: id, updatedFields: { name, email, role, modulePermissions } });
    return createSuccessResponse(req, {
      message: 'User updated successfully',
      user: {
        ...updatedUser,
        modulePermissions: updatedUser.modulePermissions || [],
      }
    }, 200);

  } catch (error) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Failed to update user (ID: ${id}) by ${user?.name || 'Unknown'}. Error: ${(error as Error).message}`, 'API:V1:Users:Update', user?.id, { userId: id, error: (error as Error).message, ...body });
    return handleApiError(req, createInternalServerError('Error updating user', { 
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
  
  if (!user) {
    return handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('USERS_MANAGE')) {
    return handleApiError(req, createForbiddenError('Insufficient permissions to delete users'));
  }

  const { id } = params;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');

    // Check if user exists
    const existingResult = await client.query('SELECT * FROM "User" WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return handleApiError(req, createNotFoundError('User not found'));
    }

    // Check if user has assigned candidates
    const candidatesResult = await client.query('SELECT COUNT(*) FROM "Candidate" WHERE "recruiterId" = $1', [id]);
    const candidateCount = parseInt(candidatesResult.rows[0].count, 10);
    
    if (candidateCount > 0) {
      await client.query('ROLLBACK');
      return handleApiError(req, createValidationError(`Cannot delete user with assigned candidates. Found ${candidateCount} candidates assigned to this user.`));
    }

    await client.query('DELETE FROM "User" WHERE id = $1', [id]);
    await client.query('COMMIT');
    await logAudit('AUDIT', `User (ID: ${id}) deleted by ${user.name}.`, 'API:V1:Users:Delete', user.id, { userId: id });
    return createSuccessResponse(req, { message: 'User deleted successfully' }, 200);

  } catch (error) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Failed to delete user (ID: ${id}) by ${user?.name || 'Unknown'}. Error: ${(error as Error).message}`, 'API:V1:Users:Delete', user?.id, { userId: id, error: (error as Error).message });
    return handleApiError(req, createInternalServerError('Error deleting user', { 
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