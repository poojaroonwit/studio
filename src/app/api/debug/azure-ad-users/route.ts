import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { handleCors } from '@/lib/cors';
import { createSuccessResponse, handleApiError, createInternalServerError } from '@/lib/apiErrorHandler';

export async function GET(req: NextRequest) {
  await handleCors(req);
  
  const client = await getPool().connect();
  
  try {
    console.log('[DEBUG] Checking Azure AD users and accounts...');
    
    // Check for users with authenticationMethod = 'azure'
    const userResult = await client.query('SELECT id, name, email, "authenticationMethod" FROM "User" WHERE "authenticationMethod" = $1', ['azure']);
    
    // Check for Account entries that might have wrong userId
    const accountResult = await client.query('SELECT a.id, a."userId", a.provider, a."providerAccountId", u.email FROM "Account" a LEFT JOIN "User" u ON a."userId" = u.id WHERE a.provider = $1', ['azure-ad']);
    
    // Find orphaned account entries (where userId doesn't exist in User table)
    const orphanedResult = await client.query(`
      SELECT a.id, a."userId", a.provider, a."providerAccountId" 
      FROM "Account" a 
      LEFT JOIN "User" u ON a."userId" = u.id 
      WHERE a.provider = 'azure-ad' AND u.id IS NULL
    `);
    
    const data = {
      azureUsers: userResult.rows,
      azureAccounts: accountResult.rows,
      orphanedAccounts: orphanedResult.rows,
      summary: {
        totalAzureUsers: userResult.rows.length,
        totalAzureAccounts: accountResult.rows.length,
        orphanedAccounts: orphanedResult.rows.length
      }
    };
    
    console.log('[DEBUG] Azure AD debug data:', data);
    
    return createSuccessResponse(req, data);
    
  } catch (error) {
    console.error('[DEBUG] Error checking Azure AD users:', error);
    return handleApiError(req, createInternalServerError('Error checking Azure AD users', { 
      originalError: (error as Error).message 
    }));
  } finally {
    client.release();
  }
} 