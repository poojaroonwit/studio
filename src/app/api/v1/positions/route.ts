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
  createInternalServerError 
} from '@/lib/apiErrorHandler';
import { logAudit } from '@/lib/auditLog';

const createPositionSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  department: z.string().min(1, { message: 'Department is required' }),
  description: z.string().optional().nullable(),
  isOpen: z.boolean({ required_error: 'isOpen status is required' }),
  positionLevel: z.string().optional().nullable(),
  custom_attributes: z.record(z.any()).optional().nullable(),
});

export async function GET(req: NextRequest) {
  // Bearer token authentication for API clients
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user) {
    return handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  try {
    const { searchParams } = new URL(req.url);
    const titleFilter = searchParams.get('title');
    const departmentFilter = searchParams.get('department');
    const isOpenFilter = searchParams.get('isOpen');
    const positionLevelFilter = searchParams.get('positionLevel');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = 'SELECT id, title, department, description, "isOpen", "positionLevel", "customAttributes", "createdAt", "updatedAt" FROM "Position"';
    let countQuery = 'SELECT COUNT(*) FROM "Position"';
    const conditions = [];
    const queryParams = [];
    let paramIndex = 1;

    if (titleFilter) {
      conditions.push(`title ILIKE $${paramIndex++}`);
      queryParams.push(`%${titleFilter}%`);
    }
    if (departmentFilter) {
      conditions.push(`department = ANY($${paramIndex++}::text[])`);
      queryParams.push(departmentFilter.split(','));
    }
    if (isOpenFilter === 'true') {
      conditions.push('"isOpen" = TRUE');
    } else if (isOpenFilter === 'false') {
      conditions.push('"isOpen" = FALSE');
    }
    if (positionLevelFilter) {
      conditions.push(`"positionLevel" ILIKE $${paramIndex++}`);
      queryParams.push(`%${positionLevelFilter}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY "createdAt" DESC';
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await getPool().query(query, queryParams);
    const countResult = await getPool().query(countQuery, queryParams.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count, 10);

    const positions = result.rows.map(row => ({
      ...row,
      custom_attributes: row.customAttributes || {},
    }));

    return createSuccessResponse(req, { data: positions, total }, 200);
  } catch (error) {
    return handleApiError(req, createInternalServerError('Error fetching positions', { 
      originalError: (error as Error).message 
    }));
  }
}

export async function POST(req: NextRequest) {
  // Bearer token authentication for API clients
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  if (!user || (user.role !== 'Admin' && !user.modulePermissions?.includes('POSITIONS_MANAGE'))) {
    return handleApiError(req, createForbiddenError('Insufficient permissions to create positions'));
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return handleApiError(req, createValidationError('Error parsing request body', { 
      originalError: (error as Error).message 
    }));
  }

  const validationResult = createPositionSchema.safeParse(body);
  if (!validationResult.success) {
    return handleApiError(req, createValidationError('Invalid input', validationResult.error.flatten().fieldErrors));
  }

  const validatedData = validationResult.data;

  try {
    const newPositionId = uuidv4();
    const insertQuery = `
      INSERT INTO "Position" (id, title, department, description, "isOpen", "positionLevel", "customAttributes", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *;
    `;
    const values = [
      newPositionId,
      validatedData.title,
      validatedData.department,
      validatedData.description || null,
      validatedData.isOpen,
      validatedData.positionLevel || null,
      validatedData.custom_attributes || {},
    ];
    const result = await getPool().query(insertQuery, values);
    const newPosition = {
      ...result.rows[0],
      custom_attributes: result.rows[0].customAttributes || {},
    };
    await logAudit('AUDIT', `Position '${validatedData.title}' created by ${user.name}.`, 'API:V1:Positions:Create', user.id, { positionId: newPositionId, ...validatedData });
    return createSuccessResponse(req, newPosition, 201);
  } catch (error) {
    await logAudit('ERROR', `Failed to create position by ${user?.name || 'Unknown'}. Error: ${(error as Error).message}`, 'API:V1:Positions:Create', user?.id, { error: (error as Error).message, ...body });
    return handleApiError(req, createInternalServerError('Error creating position', { 
      originalError: (error as Error).message 
    }));
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 