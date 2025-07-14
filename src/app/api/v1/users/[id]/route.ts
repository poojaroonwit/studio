import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';

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
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('USERS_VIEW')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to view users' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = params;
  const client = await getPool().connect();
  
  try {
    const query = 'SELECT id, name, email, role, "modulePermissions", "createdAt", "updatedAt" FROM "User" WHERE id = $1';
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: handleCors(req) });
    }

    const userData = result.rows[0];
    return new Response(JSON.stringify({
      ...userData,
      modulePermissions: userData.modulePermissions || [],
    }), { status: 200, headers: handleCors(req) });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error fetching user', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('USERS_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to update users' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = updateUserSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }

  const { name, email, role, modulePermissions, password } = validationResult.data;

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // Check if user exists
    const existingResult = await client.query('SELECT * FROM "User" WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: handleCors(req) });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingResult.rows[0].email) {
      const emailCheckResult = await client.query('SELECT id FROM "User" WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheckResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return new Response(JSON.stringify({ error: 'Email is already taken by another user' }), { status: 409, headers: handleCors(req) });
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
    return new Response(JSON.stringify({
      message: 'User updated successfully',
      user: {
        ...updatedUser,
        modulePermissions: updatedUser.modulePermissions || [],
      }
    }), { status: 200, headers: handleCors(req) });

  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error updating user', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('USERS_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to delete users' }), { status: 403, headers: handleCors(req) });
  }

  const { id } = params;
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');

    // Check if user exists
    const existingResult = await client.query('SELECT * FROM "User" WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: handleCors(req) });
    }

    // Check if user has assigned candidates
    const candidatesResult = await client.query('SELECT COUNT(*) FROM "Candidate" WHERE "recruiterId" = $1', [id]);
    const candidateCount = parseInt(candidatesResult.rows[0].count, 10);
    
    if (candidateCount > 0) {
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({ 
        error: `Cannot delete user with assigned candidates. Found ${candidateCount} candidates assigned to this user.` 
      }), { status: 400, headers: handleCors(req) });
    }

    await client.query('DELETE FROM "User" WHERE id = $1', [id]);
    await client.query('COMMIT');

    return new Response(JSON.stringify({ message: 'User deleted successfully' }), { status: 200, headers: handleCors(req) });

  } catch (error) {
    await client.query('ROLLBACK');
    return new Response(JSON.stringify({ error: 'Error deleting user', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 