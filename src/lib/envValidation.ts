/**
 * Environment variable validation for security-critical variables
 * This module validates that required environment variables are set and secure
 */

/**
 * Validates that NEXTAUTH_SECRET is set and meets security requirements
 * @throws Error if NEXTAUTH_SECRET is missing or insecure
 */
export function validateNextAuthSecret(): void {
  const secret = process.env.NEXTAUTH_SECRET;
  
  if (!secret) {
    throw new Error(
      'CRITICAL SECURITY ERROR: NEXTAUTH_SECRET environment variable is not set. ' +
      'This is required for JWT token signing. Generate a secure secret using: openssl rand -base64 32'
    );
  }
  
  // Check for placeholder/default values
  const insecureValues = [
    'CHANGE_THIS_GENERATE_SECURE_SECRET_USING_OPENSSL',
    'your-local-development-secret-key-change-this',
    'your-secret-key',
    'secret',
    'dev-secret',
    'test-secret',
  ];
  
  if (insecureValues.includes(secret)) {
    throw new Error(
      'CRITICAL SECURITY ERROR: NEXTAUTH_SECRET is set to a placeholder/default value. ' +
      'This is insecure and must be changed. Generate a secure secret using: openssl rand -base64 32'
    );
  }
  
  // Minimum length check (should be at least 32 characters for base64-encoded random)
  if (secret.length < 32) {
    console.warn(
      'SECURITY WARNING: NEXTAUTH_SECRET is shorter than recommended (32+ characters). ' +
      'Consider generating a longer secret for better security.'
    );
  }
}

/**
 * Validates critical environment variables at application startup
 * Should be called during application initialization
 */
export function validateCriticalEnvVars(): void {
  const errors: string[] = [];
  
  try {
    validateNextAuthSecret();
  } catch (error) {
    errors.push((error as Error).message);
  }
  
  // Validate DATABASE_URL in production
  if (process.env.NODE_ENV === 'production') {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      errors.push('CRITICAL: DATABASE_URL is not set in production environment');
    } else if (databaseUrl.includes('CHANGE_THIS') || databaseUrl.includes('localhost')) {
      errors.push(
        'SECURITY WARNING: DATABASE_URL appears to contain placeholder values. ' +
        'Ensure production database credentials are properly configured.'
      );
    }
  }
  
  if (errors.length > 0) {
    const errorMessage = 'Environment Variable Validation Failed:\n' + errors.join('\n');
    if (process.env.NODE_ENV === 'production') {
      // In production, throw error to prevent startup with insecure configuration
      throw new Error(errorMessage);
    } else {
      // In development, log warnings but allow startup
      console.error('⚠️  SECURITY WARNINGS:\n' + errorMessage);
    }
  }
}

/**
 * Validates that a JWT secret is secure
 * @param secret - The secret to validate
 * @returns true if secure, false otherwise
 */
export function isSecureSecret(secret: string): boolean {
  if (!secret || secret.length < 32) {
    return false;
  }
  
  const insecurePatterns = [
    /^CHANGE_THIS/i,
    /^your-/i,
    /^dev-/i,
    /^test-/i,
    /^secret$/i,
    /^password$/i,
  ];
  
  return !insecurePatterns.some(pattern => pattern.test(secret));
}

