import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['Admin', 'Recruiter', 'User']),
  modulePermissions: z.array(z.string()).optional(),
  password: z.string().min(6).optional(),
});

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('USERS_VIEW')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to view users' }), { status: 403, headers: handleCors(req) });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = (page - 1) * limit;
  const roleFilter = searchParams.get('role');
  const searchTerm = searchParams.get('searchTerm');

  const client = await getPool().connect();
  try {
    let whereClauses = [];
    let queryParams = [];
    let paramIndex = 1;

    if (roleFilter) {
      whereClauses.push(`role = $${paramIndex++}`);
      queryParams.push(roleFilter);
    }

    if (searchTerm) {
      whereClauses.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      queryParams.push(`%${searchTerm}%`);
      paramIndex++;
    }

    let query = 'SELECT id, name, email, role, "modulePermissions", "createdAt", "updatedAt" FROM "User"';
    let countQuery = 'SELECT COUNT(*) FROM "User"';

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
      countQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY "createdAt" DESC';
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await client.query(query, queryParams);
    const countResult = await client.query(countQuery, queryParams.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count, 10);

    const users = result.rows.map(row => ({
      ...row,
      modulePermissions: row.modulePermissions || [],
    }));

    return new Response(JSON.stringify({ users, total, page, limit }), { status: 200, headers: handleCors(req) });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error fetching users', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('USERS_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to create users' }), { status: 403, headers: handleCors(req) });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: handleCors(req) });
  }

  const validationResult = createUserSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten().fieldErrors }), { status: 400, headers: handleCors(req) });
  }

  const { name, email, role, modulePermissions, password } = validationResult.data;

  const client = await getPool().connect();
  try {
    // Check if user already exists
    const existingResult = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);
    if (existingResult.rows.length > 0) {
      return new Response(JSON.stringify({ error: 'User with this email already exists' }), { status: 409, headers: handleCors(req) });
    }

    // Create new user
    const insertQuery = `
      INSERT INTO "User" (id, name, email, role, "modulePermissions", password)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, "modulePermissions", "createdAt", "updatedAt";
    `;

    const result = await client.query(insertQuery, [
      require('uuid').v4(),
      name,
      email,
      role,
      modulePermissions || [],
      password || null
    ]);

    const newUser = result.rows[0];

    return new Response(JSON.stringify({
      message: 'User created successfully',
      user: {
        ...newUser,
        modulePermissions: newUser.modulePermissions || [],
      }
    }), { status: 201, headers: handleCors(req) });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error creating user', details: (error as Error).message }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 