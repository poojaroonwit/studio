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
      SELECT a.id, a."userId", a.provider, a."providerAccountId", a."access_token" 
      FROM "Account" a 
      LEFT JOIN "User" u ON a."userId" = u.id 
      WHERE a.provider = 'azure-ad' AND u.id IS NULL
    `);
    
    const fixedAccounts = [];
    const errors = [];
    
    for (const orphanedAccount of orphanedResult.rows) {
      try {
        console.log(`[DEBUG] Found orphaned account: ${orphanedAccount.id} with userId: ${orphanedAccount.userId}`);
        
        // Try to find a user by email using the access_token (if it contains user info)
        // For now, we'll delete orphaned accounts as they can't be safely linked
        
        console.log(`[DEBUG] Deleting orphaned account: ${orphanedAccount.id} with userId: ${orphanedAccount.userId}`);
        
        await client.query('DELETE FROM "Account" WHERE id = $1', [orphanedAccount.id]);
        
        fixedAccounts.push({
          accountId: orphanedAccount.id,
          action: 'deleted',
          reason: 'orphaned_user_id_not_found',
          orphanedUserId: orphanedAccount.userId
        });
        
      } catch (error) {
        console.error(`[DEBUG] Error fixing account ${orphanedAccount.id}:`, error);
        errors.push({
          accountId: orphanedAccount.id,
          error: (error as Error).message
        });
      }
    }
    
    // Also check for duplicate account entries for the same provider/providerAccountId
    const duplicateResult = await client.query(`
      SELECT "providerAccountId", COUNT(*) as count, array_agg(id) as account_ids
      FROM "Account" 
      WHERE provider = 'azure-ad' 
      GROUP BY "providerAccountId" 
      HAVING COUNT(*) > 1
    `);
    
    for (const duplicate of duplicateResult.rows) {
      try {
        console.log(`[DEBUG] Found duplicate accounts for providerAccountId: ${duplicate.providerAccountId}`);
        
        // Keep the first account, delete the rest
        const accountIds = duplicate.account_ids;
        const keepId = accountIds[0];
        const deleteIds = accountIds.slice(1);
        
        for (const deleteId of deleteIds) {
          console.log(`[DEBUG] Deleting duplicate account: ${deleteId}`);
          await client.query('DELETE FROM "Account" WHERE id = $1', [deleteId]);
          
          fixedAccounts.push({
            accountId: deleteId,
            action: 'deleted',
            reason: 'duplicate_account_entry',
            providerAccountId: duplicate.providerAccountId
          });
        }
        
      } catch (error) {
        console.error(`[DEBUG] Error fixing duplicate accounts for ${duplicate.providerAccountId}:`, error);
        errors.push({
          providerAccountId: duplicate.providerAccountId,
          error: (error as Error).message
        });
      }
    }
    
    console.log(`[DEBUG] Fixed ${fixedAccounts.length} accounts, ${errors.length} errors`);
    
    return createSuccessResponse(req, {
      message: 'Azure AD accounts fixed successfully',
      fixedAccounts,
      errors,
      summary: {
        totalFixed: fixedAccounts.length,
        totalErrors: errors.length,
        orphanedAccountsFixed: fixedAccounts.filter(a => a.reason === 'orphaned_user_id_not_found').length,
        duplicateAccountsFixed: fixedAccounts.filter(a => a.reason === 'duplicate_account_entry').length
      }
    });
    
  } catch (error) {
    console.error('[DEBUG] Error fixing Azure AD accounts:', error);
    return handleApiError(req, createInternalServerError('Error fixing Azure AD accounts', { 
      originalError: (error as Error).message 
    }));
  } finally {
    client.release();
  }
} 