import { NextRequest } from "next/server";

/**
 * Get allowed CORS origins from environment variables
 * Supports comma-separated list of origins
 * Automatically includes Azure AD domains if Azure AD SSO is configured
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  const origins: string[] = [];
  
  if (envOrigins) {
    origins.push(...envOrigins.split(',').map(origin => origin.trim()).filter(Boolean));
  }
  
  // Default origins based on environment
  if (origins.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      const nextAuthUrl = process.env.NEXTAUTH_URL;
      if (nextAuthUrl) {
        origins.push(nextAuthUrl);
      }
    } else {
      // Development defaults
      origins.push(
        'http://localhost:3000',
        'http://localhost:8021',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8021'
      );
    }
  }
  
  // Azure AD SSO: Automatically allow Azure AD domains for SSO authentication
  // Note: Azure AD SSO typically uses redirects (not CORS), but we allow these domains
  // in case any client-side Azure AD API calls are needed
  const isAzureADConfigured = process.env.AZURE_AD_CLIENT_ID && 
                               process.env.AZURE_AD_CLIENT_SECRET && 
                               process.env.AZURE_AD_TENANT_ID;
  
  if (isAzureADConfigured) {
    // Allow Microsoft/Azure AD authentication endpoints
    const azureADOrigins = [
      'https://login.microsoftonline.com',
      'https://login.microsoft.com',
      'https://sts.windows.net',
      'https://graph.microsoft.com',
    ];
    
    // Add Azure AD origins if not already present
    for (const azureOrigin of azureADOrigins) {
      if (!origins.includes(azureOrigin)) {
        origins.push(azureOrigin);
      }
    }
  }
  
  return origins;
}

/**
 * Check if origin matches wildcard pattern like *.qsncc.com
 */
function matchesWildcardPattern(origin: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const domain = pattern.substring(2); // Remove '*.' prefix
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.hostname;
      
      // Check if origin hostname ends with the domain (e.g., subdomain.qsncc.com ends with qsncc.com)
      return originHost === domain || originHost.endsWith('.' + domain);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Validate and return allowed origin for CORS
 * Returns null if origin is not allowed (for use with credentials)
 * Supports wildcard patterns like *.qsncc.com
 */
export function getAllowedOrigin(req: NextRequest): string | null {
  const origin = req.headers.get('origin');
  if (!origin) {
    // Same-origin request, no CORS header needed
    return null;
  }
  
  const allowedOrigins = getAllowedOrigins();
  
  // Check exact matches first
  if (allowedOrigins.includes(origin)) {
    return origin;
  }
  
  // Check wildcard patterns (e.g., *.qsncc.com)
  for (const pattern of allowedOrigins) {
    if (pattern.startsWith('*.')) {
      if (matchesWildcardPattern(origin, pattern)) {
        return origin; // Return the actual origin, not the pattern
      }
    }
  }
  
  // Always allow *.qsncc.com subdomains
  if (matchesWildcardPattern(origin, '*.qsncc.com')) {
    return origin;
  }
  
  return null;
}

/**
 * Get CORS headers for a request
 * Never uses wildcard when credentials are enabled
 */
export function handleCors(req: NextRequest): Record<string, string> {
  const allowedOrigin = getAllowedOrigin(req);
  
  // If credentials are enabled, we cannot use wildcard
  // Return null origin if not allowed (browser will reject)
  const corsOrigin = allowedOrigin || (process.env.NODE_ENV === 'development' ? 'http://localhost:8021' : null);
  
  if (!corsOrigin) {
    // No CORS headers if origin not allowed
    return {};
  }
  
  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
  };
} 
