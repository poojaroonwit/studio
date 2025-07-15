import getRedisClient from './redis';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class WebhookRateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  private async getRedis(): Promise<any> {
    try {
      const client = await getRedisClient();
      return client as any;
    } catch (error) {
      console.error('Failed to get Redis client:', error);
      return null;
    }
  }

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const redis = await this.getRedis();
    if (!redis) {
      // If Redis is unavailable, allow the request
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: Date.now() + this.config.windowMs
      };
    }

    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Get current requests in the window
      const requests = await redis.zRangeByScore(key, windowStart, '+inf');
      
      // Remove expired entries
      await redis.zRemRangeByScore(key, '-inf', windowStart - 1);
      
      const currentCount = requests.length;
      const remaining = Math.max(0, this.config.maxRequests - currentCount);
      const allowed = currentCount < this.config.maxRequests;
      
      if (allowed) {
        // Add current request
        await redis.zAdd(key, [{ score: now, value: now.toString() }]);
        await redis.expire(key, Math.ceil(this.config.windowMs / 1000));
      }

      const resetTime = now + this.config.windowMs;
      const retryAfter = allowed ? undefined : Math.ceil((resetTime - now) / 1000);

      return {
        allowed,
        remaining,
        resetTime,
        retryAfter
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // On Redis error, allow the request
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      };
    }
  }

  async getLimitInfo(identifier: string): Promise<RateLimitResult> {
    const redis = await this.getRedis();
    if (!redis) {
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs
      };
    }

    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      const requests = await redis.zRangeByScore(key, windowStart, '+inf');
      const currentCount = requests.length;
      const remaining = Math.max(0, this.config.maxRequests - currentCount);
      const allowed = currentCount < this.config.maxRequests;
      const resetTime = now + this.config.windowMs;

      return {
        allowed,
        remaining,
        resetTime
      };
    } catch (error) {
      console.error('Rate limit info check failed:', error);
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs
      };
    }
  }

  async resetLimit(identifier: string): Promise<void> {
    const redis = await this.getRedis();
    if (!redis) return;

    const key = `${this.config.keyPrefix}:${identifier}`;
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Rate limit reset failed:', error);
    }
  }
}

// Default rate limit configurations
export const webhookRateLimits = {
  // Per webhook rate limiting
  perWebhook: new WebhookRateLimiter({
    maxRequests: 100, // 100 requests
    windowMs: 60 * 1000, // per minute
    keyPrefix: 'webhook:rate:per_webhook'
  }),

  // Global rate limiting
  global: new WebhookRateLimiter({
    maxRequests: 1000, // 1000 requests
    windowMs: 60 * 1000, // per minute
    keyPrefix: 'webhook:rate:global'
  }),

  // Burst protection
  burst: new WebhookRateLimiter({
    maxRequests: 10, // 10 requests
    windowMs: 10 * 1000, // per 10 seconds
    keyPrefix: 'webhook:rate:burst'
  })
};

// Rate limit headers for HTTP responses
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult,
  limit: number
): void {
  headers.set('X-RateLimit-Limit', limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
  
  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString());
  }
} 