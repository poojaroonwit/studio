import { NextRequest } from 'next/server';
import { getPool, getMergedUserPermissions } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { handleCors } from '@/lib/cors';
import { 
  createSuccessResponse, 
  handleApiError, 
  createValidationError, 
  createUnauthorizedError, 
  createInternalServerError 
} from '@/lib/apiErrorHandler';
import { logAudit } from '@/lib/auditLog';

export async function POST(req: NextRequest) {

  let body;
  try {
    body = await req.json();
  } catch {
    return handleApiError(req, createValidationError('Invalid JSON body'));
  }
  const { email, password } = body;
  if (!email || !password) {
    return handleApiError(req, createValidationError('Email and password are required'));
  }
  if (!process.env.NEXTAUTH_SECRET) {
    return handleApiError(req, createInternalServerError('Server misconfiguration: NEXTAUTH_SECRET is not set'));
  }
  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT * FROM "User" WHERE email = $1', [email]);
    const user = result.rows[0];
    if (user && user.password) {
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid && user.is_active) {
        const mergedPermissions = await getMergedUserPermissions(user.id);
        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            modulePermissions: mergedPermissions
          },
          process.env.NEXTAUTH_SECRET,
          { expiresIn: '1h' }
        );
        try {
          await logAudit('AUDIT', `User '${user.email}' logged in via v1 API.`, 'API:V1:Auth:Login', user.id);
        } catch (_) {}
        return createSuccessResponse(req, { success: true, token, user: { id: user.id, email: user.email, role: user.role, modulePermissions: mergedPermissions } }, 200);
      }
    }
    try {
      await logAudit('WARN', `Failed v1 API login for ${email}.`, 'API:V1:Auth:Login', null, { email });
    } catch (_) {}
    return handleApiError(req, createUnauthorizedError('Invalid email or password'));
  } catch (error) {
    try {
      await logAudit('ERROR', `Authentication error for ${email}: ${(error as Error).message}`, 'API:V1:Auth:Login');
    } catch (_) {}
    return handleApiError(req, createInternalServerError('Error during authentication', { 
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
