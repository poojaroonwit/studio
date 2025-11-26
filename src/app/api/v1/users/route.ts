import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { verifyApiToken } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { handleCors } from '@/lib/cors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { SimpleErrorHandler,
  createUnauthorizedError,
  createForbiddenError,
  createValidationError,
  createConflictError,
  createInternalServerError
} from '@/lib/errors';;
import { logAudit } from '@/lib/auditLog';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['Admin', 'Recruiter', 'User']),

  password: z.string().min(8).optional(),
});

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  if (!hasPermission(user, 'USERS_VIEW')) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to view users'));
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

    let query = 'SELECT id, name, email, role, "createdAt", "updatedAt" FROM "User"';
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

    const users = result.rows.map((row: any) => ({
      ...row,
    }));

    return SimpleErrorHandler.createSuccessResponse(req, { users, total, page, limit }, 200);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error fetching users: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  if (!hasPermission(user, 'USERS_CREATE')) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to create users'));
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid JSON body'));
  }

  const validationResult = createUserSchema.safeParse(body);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    const errorMsg = Object.entries(fieldErrors).map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`).join('; ');
    return SimpleErrorHandler.handleApiError(req, createValidationError(`Invalid input - ${errorMsg}`));
  }

  const { name, email, role, password } = validationResult.data;

  const client = await getPool().connect();
  try {
    // Check if user already exists
    const existingResult = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);
    if (existingResult.rows.length > 0) {
      return SimpleErrorHandler.handleApiError(req, createConflictError('User with this email already exists'));
    }

    // Create new user
    const insertQuery = `
      INSERT INTO "User" (id, name, email, role, password)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, "createdAt", "updatedAt";
    `;

    const newUserId = require('uuid').v4();
    const result = await client.query(insertQuery, [
      newUserId,
      name,
      email,
      role,
      password || null
    ]);

    const newUser = result.rows[0];
    const actingUserName = (user.name || user.email || user.id || 'System') as string;
    await logAudit('AUDIT', `User '${name}' created by ${actingUserName}.`, 'API:V1:Users:Create', user.id, { userId: newUserId, name, email, role });
    return SimpleErrorHandler.createSuccessResponse(req, {
      message: 'User created successfully',
      user: {
        ...newUser,
      }
    }, 201);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const actingUserName = user ? (user.name || user.email || user.id || 'System') : 'Unknown';
    await logAudit('ERROR', `Failed to create user by ${actingUserName}. Error: ${errorMessage}`, 'API:V1:Users:Create', user?.id, { error: errorMessage, ...body });
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Error creating user: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 
