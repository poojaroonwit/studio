import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to check NextAuth configuration
 * This helps diagnose configuration issues
 */
export async function GET(req: NextRequest) {
  try {
    const hasSecret = !!process.env.NEXTAUTH_SECRET;
    const hasUrl = !!process.env.NEXTAUTH_URL;
    const secretLength = process.env.NEXTAUTH_SECRET?.length || 0;
    const secretPreview = process.env.NEXTAUTH_SECRET 
      ? `${process.env.NEXTAUTH_SECRET.substring(0, 10)}...` 
      : 'NOT SET';
    
    // Check for placeholder values
    const insecureValues = [
      'CHANGE_THIS_GENERATE_SECURE_SECRET_USING_OPENSSL',
      'your-local-development-secret-key-change-this',
      'your-secret-key',
      'secret',
      'dev-secret',
      'test-secret',
    ];
    const isPlaceholder = process.env.NEXTAUTH_SECRET 
      ? insecureValues.includes(process.env.NEXTAUTH_SECRET)
      : false;
    
    const config = {
      hasNextAuthSecret: hasSecret,
      hasNextAuthUrl: hasUrl,
      secretLength,
      secretPreview,
      isPlaceholder,
      nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
    
    // Check if configuration is valid
    const isValid = hasSecret && hasUrl && !isPlaceholder && secretLength >= 32;
    
    return NextResponse.json({
      valid: isValid,
      config,
      issues: [
        !hasSecret && 'NEXTAUTH_SECRET is not set',
        !hasUrl && 'NEXTAUTH_URL is not set',
        isPlaceholder && 'NEXTAUTH_SECRET is set to a placeholder value',
        secretLength < 32 && 'NEXTAUTH_SECRET is too short (should be at least 32 characters)',
      ].filter(Boolean),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

