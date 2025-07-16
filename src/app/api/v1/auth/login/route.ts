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

export async function POST(req: NextRequest) {
  console.log('DEBUG: /api/v1/auth/login called');
  let body;
  try {
    body = await req.json();
  } catch {
    console.log('DEBUG: Invalid JSON body');
    return handleApiError(req, createValidationError('Invalid JSON body'));
  }
  const { email, password } = body;
  if (!email || !password) {
    console.log('DEBUG: Missing email or password');
    return handleApiError(req, createValidationError('Email and password are required'));
  }
  if (!process.env.NEXTAUTH_SECRET) {
    console.log('DEBUG: NEXTAUTH_SECRET not set');
    return handleApiError(req, createInternalServerError('Server misconfiguration: NEXTAUTH_SECRET is not set'));
  }
  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT * FROM "User" WHERE email = $1', [email]);
    const user = result.rows[0];
    if (user && user.password) {
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid) {
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
        console.log('DEBUG: Login successful for', email);
        return createSuccessResponse(req, { success: true, token, user: { id: user.id, email: user.email, role: user.role, modulePermissions: mergedPermissions } }, 200);
      }
    }
    console.log('DEBUG: Invalid email or password for', email);
    return handleApiError(req, createUnauthorizedError('Invalid email or password'));
  } catch (error) {
    console.log('DEBUG: Error during authentication', error);
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