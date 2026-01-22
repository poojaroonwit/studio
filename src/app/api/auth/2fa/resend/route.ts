
import { auth } from '@/auth';
import { getPool } from '@/lib/db';
import { generateEmailOtp, sendEmailOtp } from '@/lib/twoFactorAuth';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/2fa/resend
 * Resends the email OTP verification code
 */
export async function POST(req: Request) {
    try {
        // For resend during login, we need email from the request body
        // (user may not be fully authenticated yet)
        const body = await req.json().catch(() => ({}));
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const client = await getPool().connect();

        try {
            // Get user by email
            const userRes = await client.query(
                'SELECT id, name, email, "two_factor_method" FROM "User" WHERE email = $1',
                [email]
            );

            const user = userRes.rows[0];
            if (!user) {
                // Don't reveal if user exists or not
                return NextResponse.json({ success: true, message: 'If the email exists, a new code has been sent' });
            }

            // Only allow resend for email method
            if (user.two_factor_method === 'totp') {
                return NextResponse.json({
                    error: 'Resend not available for authenticator app method'
                }, { status: 400 });
            }

            // Generate and send new OTP
            const otp = generateEmailOtp();

            // Store OTP (note: expiration is handled by time-based logic, not DB field)
            await client.query(
                `UPDATE "User" 
         SET "two_factor_secret" = $1
         WHERE id = $2`,
                [otp, user.id]
            );

            // Send email
            const sent = await sendEmailOtp(user.email, otp, user.name || 'User');

            if (!sent) {
                console.error('[2FA Resend] Failed to send email OTP');
                return NextResponse.json({
                    error: 'Failed to send verification code. Please check email configuration.'
                }, { status: 500 });
            }

            console.log(`[2FA Resend] New OTP sent to: ${user.email}`);
            return NextResponse.json({ success: true, message: 'Verification code sent' });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('[2FA Resend] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
