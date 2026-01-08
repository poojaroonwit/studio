
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { sendEmail } from './emailService';
import { getPool } from './db';

// Configure otplib
authenticator.options = { 
  window: 1, // Allow +/- 1 step window (30 seconds)
  step: 30 
};

/**
 * Generate a new TOTP secret related to the user
 */
export function generateTotpSecret(email: string) {
  const secret = authenticator.generateSecret();
  // Format: otpauth://totp/AppName:userEmail?secret=SECRET&issuer=AppName
  const otpauth = authenticator.keyuri(email, 'FitScan', secret);
  return { secret, otpauth };
}

/**
 * Generate a QR code URL from the otpauth URL
 */
export async function generateTotpQrCodeUrl(otpauth: string): Promise<string> {
  return await QRCode.toDataURL(otpauth);
}

/**
 * Verify a TOTP code against a secret
 */
export function verifyTotpCode(token: string, secret: string): boolean {
  try {
    return authenticator.check(token, secret);
  } catch (err) {
    console.error('[2FA] TOTP verification error:', err);
    return false;
  }
}

/**
 * Generate a random 6-digit numeric OTP
 */
export function generateEmailOtp(): string {
  // Generate random 6 digit number
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
}

/**
 * Send an OTP via email
 * Returns true if sent successfully, false otherwise
 */
export async function sendEmailOtp(email: string, otp: string, userName: string): Promise<boolean> {
  const subject = 'Your FitScan Verification Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Verification Code</h2>
      <p>Hello ${userName},</p>
      <p>Your verification code for FitScan is:</p>
      <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, you can safely ignore this email.</p>
      <p>Best regards,<br>The FitScan Team</p>
    </div>
  `;

  try {
    await sendEmail(
      email,
      subject,
      html
    );
    return true;
  } catch (error) {
    console.error('[2FA] Failed to send email OTP:', error);
    return false;
  }
}

/**
 * Generate 10 random 8-character backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = randomBytes(4).toString('hex').toUpperCase(); // 8 chars hex
    codes.push(code);
  }
  return codes;
}
