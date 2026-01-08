
import { auth } from '@/auth';
import { getPool } from '@/lib/db';
import { 
  verifyTotpCode, 
  generateBackupCodes 
} from '@/lib/twoFactorAuth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const session = await auth();
    // Allow verification if we have a partial session (from login flow) or full session (setup flow)
    // NOTE: For login flow, we might not have a session yet. This endpoint might need to handle 
    // unauthenticated requests with a temporary token, OR the login flow handles verification directly.
    // This endpoint is primarily for SETUP verification.
    
    if (!session?.user?.id) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 });
    }

    const client = await getPool().connect();
    
    try {
      const userRes = await client.query(
        'SELECT "two_factor_method", "two_factor_secret" FROM "User" WHERE id = $1',
        [session.user.id]
      );
      
      const user = userRes.rows[0];
      if (!user || !user.two_factor_secret) {
        return NextResponse.json({ error: '2FA not initialized' }, { status: 400 });
      }

      let isValid = false;

      if (user.two_factor_method === 'totp') {
        isValid = verifyTotpCode(code, user.two_factor_secret);
      } else if (user.two_factor_method === 'email') {
        // For email, secret holds the current OTP
        // In a real app, check expiration
        isValid = code === user.two_factor_secret;
      }

      if (isValid) {
        // Generate backup codes on first success
        const backupCodes = generateBackupCodes();
        
        await client.query(
          `UPDATE "User" 
           SET "two_factor_enabled" = true,
               "two_factor_verified_at" = NOW(),
               "two_factor_backup_codes" = $1,
               "two_factor_secret" = $2 -- For email, clear the OTP. For TOTP, keep secret.
           WHERE id = $3`,
          [
            backupCodes, 
            user.two_factor_method === 'email' ? null : user.two_factor_secret,
            session.user.id
          ]
        );

        return NextResponse.json({ 
          success: true, 
          backupCodes 
        });
      } else {
        return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
      }
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[2FA Verify] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
