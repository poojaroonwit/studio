import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { handleCors } from '@/lib/cors';
import { createSuccessResponse, handleApiError, createInternalServerError } from '@/lib/apiErrorHandler';

export async function POST(req: NextRequest) {
  await handleCors(req);
  
  const client = await getPool().connect();
  
  try {
    console.log('[DEBUG] Fixing orphaned Azure AD accounts...');
    
    // Find orphaned account entries (where userId doesn't exist in User table)
    const orphanedResult = await client.query(`
      SELECT a.id, a."userId", a.provider, a."providerAccountId" 
      FROM "Account" a 
      LEFT JOIN "User" u ON a."userId" = u.id 
      WHERE a.provider = 'azure-ad' AND u.id IS NULL
    `);
    
    const fixedAccounts = [];
    const errors = [];
    
    for (const orphanedAccount of orphanedResult.rows) {
      try {
        // Try to find a user by email (this is a fallback approach)
        // In a real scenario, you might need to map providerAccountId to user email
        // For now, we'll delete orphaned accounts as they can't be safely linked
        
        console.log(`[DEBUG] Deleting orphaned account: ${orphanedAccount.id} with userId: ${orphanedAccount.userId}`);
        
        await client.query('DELETE FROM "Account" WHERE id = $1', [orphanedAccount.id]);
        
        fixedAccounts.push({
          accountId: orphanedAccount.id,
          action: 'deleted',
          reason: 'orphaned_user_id_not_found'
        });
        
      } catch (error) {
        console.error(`[DEBUG] Error fixing account ${orphanedAccount.id}:`, error);
        errors.push({
          accountId: orphanedAccount.id,
          error: (error as Error).message
        });
      }
    }
    
    const data = {
      totalOrphanedAccounts: orphanedResult.rows.length,
      fixedAccounts,
      errors,
      summary: {
        success: fixedAccounts.length,
        failed: errors.length
      }
    };
    
    console.log('[DEBUG] Azure AD account fix results:', data);
    
    return createSuccessResponse(req, data);
    
  } catch (error) {
    console.error('[DEBUG] Error fixing Azure AD accounts:', error);
    return handleApiError(req, createInternalServerError('Error fixing Azure AD accounts', { 
      originalError: (error as Error).message 
    }));
  } finally {
    client.release();
  }
} 