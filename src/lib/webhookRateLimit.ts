import { Redis } from 'ioredis';
import { redis } from './redis';

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
  private redis: Redis;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.redis = redis;
    this.config = config;
  }

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Get current requests in the window
      const requests = await this.redis.zrangebyscore(key, windowStart, '+inf');
      
      // Remove expired entries
      await this.redis.zremrangebyscore(key, '-inf', windowStart - 1);
      
      const currentCount = requests.length;
      const remaining = Math.max(0, this.config.maxRequests - currentCount);
      const allowed = currentCount < this.config.maxRequests;
      
      if (allowed) {
        // Add current request
        await this.redis.zadd(key, now, now.toString());
        await this.redis.expire(key, Math.ceil(this.config.windowMs / 1000));
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
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      const requests = await this.redis.zrangebyscore(key, windowStart, '+inf');
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
    const key = `${this.config.keyPrefix}:${identifier}`;
    try {
      await this.redis.del(key);
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