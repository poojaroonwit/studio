import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware
 * @param config - Rate limiting configuration
 * @returns Middleware function
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (req: NextRequest): { allowed: boolean; remaining: number; resetTime: number } => {
    const identifier = getClientIdentifier(req);
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(identifier);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
      rateLimitStore.set(identifier, entry);
    }
    
    // Increment request count
    entry.count++;
    
    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    
    return {
      allowed,
      remaining,
      resetTime: entry.resetTime
    };
  };
}

/**
 * Get client identifier for rate limiting
 * @param req - NextRequest object
 * @returns Client identifier string
 */
function getClientIdentifier(req: NextRequest): string {
  // Try to get real IP from headers (for reverse proxy setups)
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  let ip = 'unknown';
  
  if (cfConnectingIp) {
    ip = cfConnectingIp;
  } else if (realIp) {
    ip = realIp;
  } else if (forwarded) {
    ip = forwarded.split(',')[0].trim();
  } else {
    // Fallback to connection remote address if available
    const connection = (req as any).connection;
    if (connection && connection.remoteAddress) {
      ip = connection.remoteAddress;
    }
  }
  
  return ip;
}

// Pre-configured rate limiters for different endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // Reduced from 100 to 60 requests per minute
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // Reduced from 10 to 5 uploads per minute
});

export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // Reduced from 30 to 20 searches per minute
});

// New security-focused rate limiters
export const sensitiveOperationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3, // 3 sensitive operations per minute
});

export const fileAccessRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 15, // 15 file access requests per minute
});

export const adminOperationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 admin operations per minute
});

/**
 * Apply rate limiting to a request
 * @param req - NextRequest object
 * @param rateLimiter - Rate limiter function
 * @returns Rate limit result
 */
export function applyRateLimit(req: NextRequest, rateLimiter: ReturnType<typeof createRateLimiter>) {
  const result = rateLimiter(req);
  
  if (!result.allowed) {
    console.warn(`Rate limit exceeded for ${getClientIdentifier(req)}`);
  }
  
  return result;
}
