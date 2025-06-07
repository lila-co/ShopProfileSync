import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface ClientInfo {
  requests: number[];
  lastReset: number;
}

class RateLimiter {
  private clients: Map<string, ClientInfo> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests, please try again later.',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    };

    // Clean up old entries every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  private getClientKey(req: Request): string {
    // Use user ID if authenticated, otherwise use IP
    const userId = req.headers['x-current-user-id'];
    if (userId) {
      return `user:${userId}`;
    }

    // Get real IP from various headers
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const ip = (forwarded && forwarded.toString().split(',')[0]) || 
               realIp || 
               req.connection.remoteAddress || 
               req.ip || 
               'unknown';

    return `ip:${ip}`;
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredThreshold = now - (this.config.windowMs * 2);

    for (const [key, client] of this.clients.entries()) {
      if (client.lastReset < expiredThreshold) {
        this.clients.delete(key);
      }
    }
  }

  private shouldSkipRequest(req: Request, res: Response): boolean {
    if (this.config.skipSuccessfulRequests && res.statusCode < 400) {
      return true;
    }
    if (this.config.skipFailedRequests && res.statusCode >= 400) {
      return true;
    }
    return false;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientKey = this.getClientKey(req);
      const now = Date.now();

      let client = this.clients.get(clientKey);

      if (!client) {
        client = {
          requests: [],
          lastReset: now
        };
        this.clients.set(clientKey, client);
      }

      // Remove requests outside the window
      const windowStart = now - this.config.windowMs;
      client.requests = client.requests.filter(timestamp => timestamp > windowStart);

      // Check if limit exceeded
      if (client.requests.length >= this.config.maxRequests) {
        const oldestRequest = Math.min(...client.requests);
        const timeUntilReset = this.config.windowMs - (now - oldestRequest);

        res.status(429).json({
          error: 'Rate limit exceeded',
          message: this.config.message,
          retryAfter: Math.ceil(timeUntilReset / 1000),
          limit: this.config.maxRequests,
          windowMs: this.config.windowMs
        });
        return;
      }

      // Add current request timestamp
      client.requests.push(now);
      client.lastReset = now;

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': this.config.maxRequests.toString(),
        'X-RateLimit-Remaining': (this.config.maxRequests - client.requests.length).toString(),
        'X-RateLimit-Reset': new Date(now + this.config.windowMs).toISOString()
      });

      next();
    };
  }
}

// Pre-configured rate limiters for different endpoint types
export const rateLimiters = {
  // General API endpoints - increased to accommodate optimized polling
  general: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 600, // Increased for development and testing
    message: 'Too many API requests. Please try again later.'
  }),

  // Authentication endpoints - 5 attempts per 15 minutes
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 25,
    message: 'Too many authentication attempts. Please try again later.',
    skipSuccessfulRequests: true // Only count failed attempts
  }),

  // Shopping list operations - 500 requests per 15 minutes
  shoppingList: new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 500,
    message: 'Too many shopping list requests. Please slow down.'
  }),

  // File uploads - 10 uploads per hour
  upload: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    message: 'Upload limit exceeded. Please try again later.'
  }),

  // Search endpoints - 50 searches per 5 minutes
  search: new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 50,
    message: 'Too many search requests. Please wait before searching again.'
  }),

  // Admin endpoints - adjusted for optimized monitoring
  admin: new RateLimiter({
    windowMs: 15 * 60 * 1000, // Increased window
    maxRequests: 15, // Reduced since monitoring polls less frequently
    message: 'Admin rate limit exceeded.'
  }),

  // Order submission - 5 orders per hour
  orders: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    message: 'Order submission limit exceeded. Please try again later.'
  }),

  // AI/Voice endpoints - 30 requests per 10 minutes
  ai: new RateLimiter({
    windowMs: 10 * 60 * 1000,
    maxRequests: 30,
    message: 'AI service rate limit exceeded. Please wait before trying again.'
  })
};

// Helper function to create custom rate limiter
export function createRateLimiter(config: RateLimitConfig) {
  return new RateLimiter(config);
}

// Enhanced rate limiter that considers user roles
export function createRoleBasedRateLimiter(baseConfig: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-current-user-id'];

    // Create different limits based on user role (if available)
    let config = { ...baseConfig };

    // In a real app, you'd fetch the user role from the database
    // For demo purposes, we'll use a simple check
    if (userId) {
      // Authenticated users get higher limits
      config.maxRequests = Math.floor(config.maxRequests * 1.5);
    }

    const limiter = new RateLimiter(config);
    return limiter.middleware()(req, res, next);
  };
}

export default RateLimiter;