
import { auth } from '@/auth';
import { getPool } from '@/lib/db';
import { 
  generateTotpSecret, 
  generateTotpQrCodeUrl, 
  generateEmailOtp, 
  sendEmailOtp 
} from '@/lib/twoFactorAuth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { method } = await req.json(); // 'totp' or 'email'

    if (!['totp', 'email'].includes(method)) {
      return NextResponse.json({ error: 'Invalid 2FA method' }, { status: 400 });
    }

    const client = await getPool().connect();
    
    try {
      // Check if trying to setup configured method again
      const userRes = await client.query(
        'SELECT "two_factor_enabled", "two_factor_method" FROM "User" WHERE id = $1',
        [session.user.id]
      );
      
      const user = userRes.rows[0];
      if (user?.two_factor_enabled) {
        // If already enabled, we might want to restrict re-setup without verification
        // For now, we'll allow re-setup (re-rolls secret) but in prod might want safeguard
      }

      if (method === 'totp') {
        // Generate TOTP secret
        const { secret, otpauth } = generateTotpSecret(session.user.email);
        const qrCodeUrl = await generateTotpQrCodeUrl(otpauth);
        
        // Store secret temporarily (or permanently but marked as unverified)
        // We'll store it in the user record but two_factor_enabled stays false until verified
        await client.query(
          `UPDATE "User" 
           SET "two_factor_method" = 'totp', 
               "two_factor_secret" = $1,
               "two_factor_enabled" = false -- Ensure disabled until verified
           WHERE id = $2`,
          [secret, session.user.id]
        );

        return NextResponse.json({ 
          secret, 
          qrCodeUrl 
        });
      } 
      else if (method === 'email') {
        const otp = generateEmailOtp();
        const sent = await sendEmailOtp(session.user.email, otp, session.user.name || 'User');
        
        if (!sent) {
          throw new Error('Failed to send email OTP');
        }

        // Store OTP hash/secret
        // For email OTP, we might want to store it with expiration
        // Here we'll store the OTP as the "secret" temporarily
        await client.query(
          `UPDATE "User" 
           SET "two_factor_method" = 'email', 
               "two_factor_secret" = $1,
               "two_factor_enabled" = false
           WHERE id = $2`,
          [otp, session.user.id] // In prod, hash this OTP
        );

        return NextResponse.json({ success: true, message: 'OTP sent to email' });
      }
    } finally {
      client.release();
    }

    return NextResponse.json({ error: 'Method not supported' }, { status: 400 });

  } catch (error) {
    console.error('[2FA Setup] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
