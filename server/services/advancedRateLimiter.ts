
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, identifier: string) => void;
}

interface RequestPattern {
  identifier: string;
  requests: Array<{
    timestamp: number;
    path: string;
    method: string;
    statusCode?: number;
    userAgent?: string;
    suspicious: boolean;
  }>;
  suspiciousScore: number;
  isBlocked: boolean;
  blockedUntil?: number;
}

export class AdvancedRateLimiter {
  private patterns = new Map<string, RequestPattern>();
  private suspiciousIPs = new Set<string>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up old data every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  createLimiter(config: RateLimitConfig) {
    return (req: Request, res: Response, next: NextFunction) => {
      const identifier = config.keyGenerator ? config.keyGenerator(req) : this.getIdentifier(req);
      
      // Check if IP is blocked
      if (this.isBlocked(identifier)) {
        logger.warn('Blocked request from rate-limited identifier', { 
          identifier,
          path: req.path,
          method: req.method 
        });
        
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: this.getRetryAfter(identifier)
        });
      }

      const now = Date.now();
      const pattern = this.getOrCreatePattern(identifier);
      
      // Add current request
      pattern.requests.push({
        timestamp: now,
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        suspicious: this.isSuspiciousRequest(req)
      });

      // Filter requests within the window
      const windowStart = now - config.windowMs;
      const recentRequests = pattern.requests.filter(r => r.timestamp >= windowStart);
      pattern.requests = recentRequests;

      // Check rate limit
      const requestCount = config.skipSuccessfulRequests || config.skipFailedRequests 
        ? this.getFilteredRequestCount(recentRequests, config)
        : recentRequests.length;

      if (requestCount > config.maxRequests) {
        this.blockIdentifier(identifier, config.windowMs);
        
        if (config.onLimitReached) {
          config.onLimitReached(req, identifier);
        }

        logger.warn('Rate limit exceeded', {
          identifier,
          requestCount,
          maxRequests: config.maxRequests,
          path: req.path,
          method: req.method
        });

        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(config.windowMs / 1000)
        });
      }

      // Update suspicious score
      this.updateSuspiciousScore(pattern, req);

      // Check for anomalous patterns
      if (this.detectAnomalousPattern(pattern)) {
        logger.warn('Anomalous request pattern detected', {
          identifier,
          suspiciousScore: pattern.suspiciousScore,
          requestCount: recentRequests.length
        });
        
        // Apply stricter limits for suspicious patterns
        if (pattern.suspiciousScore > 0.8) {
          this.blockIdentifier(identifier, config.windowMs * 2);
          return res.status(429).json({
            error: 'Suspicious Activity Detected',
            message: 'Your request pattern appears suspicious. Please try again later.'
          });
        }
      }

      // Track response
      res.on('finish', () => {
        const request = pattern.requests[pattern.requests.length - 1];
        if (request) {
          request.statusCode = res.statusCode;
        }
      });

      next();
    };
  }

  private getIdentifier(req: Request): string {
    // Use multiple factors for identification
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const forwardedFor = req.headers['x-forwarded-for'];
    
    // Create composite identifier
    return `${ip}_${Buffer.from(userAgent).toString('base64').slice(0, 10)}`;
  }

  private getOrCreatePattern(identifier: string): RequestPattern {
    if (!this.patterns.has(identifier)) {
      this.patterns.set(identifier, {
        identifier,
        requests: [],
        suspiciousScore: 0,
        isBlocked: false
      });
    }
    return this.patterns.get(identifier)!;
  }

  private isSuspiciousRequest(req: Request): boolean {
    const suspiciousIndicators = [
      // Suspicious paths
      req.path.includes('..'),
      req.path.includes('<script'),
      req.path.includes('SELECT'),
      req.path.includes('DROP'),
      req.path.includes('.env'),
      req.path.includes('wp-admin'),
      req.path.includes('phpMyAdmin'),
      
      // Suspicious user agents
      !req.headers['user-agent'],
      req.headers['user-agent']?.includes('bot') && !req.headers['user-agent']?.includes('Googlebot'),
      req.headers['user-agent']?.length > 500,
      
      // Suspicious headers
      req.headers['x-forwarded-for']?.split(',').length > 5,
      req.headers.host !== req.headers['x-forwarded-host'] && req.headers['x-forwarded-host'],
      
      // Suspicious parameters
      Object.keys(req.query).some(key => key.length > 100),
      Object.values(req.query).some(value => typeof value === 'string' && value.length > 1000)
    ];

    return suspiciousIndicators.filter(Boolean).length > 2;
  }

  private updateSuspiciousScore(pattern: RequestPattern, req: Request): void {
    const recentRequests = pattern.requests.slice(-10); // Last 10 requests
    const suspiciousCount = recentRequests.filter(r => r.suspicious).length;
    const rapidRequests = recentRequests.filter(r => Date.now() - r.timestamp < 1000).length;
    
    // Calculate suspicious score based on various factors
    let score = 0;
    
    // High frequency requests
    if (rapidRequests > 5) score += 0.3;
    
    // High ratio of suspicious requests
    if (suspiciousCount / recentRequests.length > 0.5) score += 0.4;
    
    // Repeated 404s or errors
    const errorCount = recentRequests.filter(r => r.statusCode && r.statusCode >= 400).length;
    if (errorCount / recentRequests.length > 0.7) score += 0.2;
    
    // Unusual user agent patterns
    const userAgents = new Set(recentRequests.map(r => r.userAgent));
    if (userAgents.size > 5) score += 0.1; // Too many different user agents
    
    pattern.suspiciousScore = Math.min(1, Math.max(0, score));
  }

  private detectAnomalousPattern(pattern: RequestPattern): boolean {
    const recentRequests = pattern.requests.slice(-20);
    
    if (recentRequests.length < 5) return false;
    
    // Check for rapid-fire requests
    const intervals = [];
    for (let i = 1; i < recentRequests.length; i++) {
      intervals.push(recentRequests[i].timestamp - recentRequests[i-1].timestamp);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const uniformity = intervals.filter(interval => Math.abs(interval - avgInterval) < 100).length / intervals.length;
    
    // Too uniform intervals suggest bot behavior
    if (uniformity > 0.8 && avgInterval < 500) {
      return true;
    }
    
    // Check for scanning behavior (many different paths)
    const uniquePaths = new Set(recentRequests.map(r => r.path));
    if (uniquePaths.size / recentRequests.length > 0.8 && recentRequests.length > 10) {
      return true;
    }
    
    return false;
  }

  private getFilteredRequestCount(requests: any[], config: RateLimitConfig): number {
    return requests.filter(req => {
      if (config.skipSuccessfulRequests && req.statusCode && req.statusCode < 400) {
        return false;
      }
      if (config.skipFailedRequests && req.statusCode && req.statusCode >= 400) {
        return false;
      }
      return true;
    }).length;
  }

  private blockIdentifier(identifier: string, duration: number): void {
    const pattern = this.getOrCreatePattern(identifier);
    pattern.isBlocked = true;
    pattern.blockedUntil = Date.now() + duration;
    
    this.suspiciousIPs.add(identifier);
  }

  private isBlocked(identifier: string): boolean {
    const pattern = this.patterns.get(identifier);
    if (!pattern || !pattern.isBlocked) return false;
    
    if (pattern.blockedUntil && Date.now() > pattern.blockedUntil) {
      pattern.isBlocked = false;
      pattern.blockedUntil = undefined;
      this.suspiciousIPs.delete(identifier);
      return false;
    }
    
    return true;
  }

  private getRetryAfter(identifier: string): number {
    const pattern = this.patterns.get(identifier);
    if (!pattern || !pattern.blockedUntil) return 60;
    
    return Math.ceil((pattern.blockedUntil - Date.now()) / 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - 3600000; // 1 hour ago
    
    for (const [identifier, pattern] of this.patterns.entries()) {
      // Remove old requests
      pattern.requests = pattern.requests.filter(r => r.timestamp > cutoff);
      
      // Remove patterns with no recent requests
      if (pattern.requests.length === 0 && (!pattern.blockedUntil || pattern.blockedUntil < now)) {
        this.patterns.delete(identifier);
        this.suspiciousIPs.delete(identifier);
      }
    }
  }

  getStats(): {
    totalPatterns: number;
    blockedIdentifiers: number;
    suspiciousIdentifiers: number;
    memoryUsage: number;
  } {
    const blocked = Array.from(this.patterns.values()).filter(p => p.isBlocked).length;
    const suspicious = Array.from(this.patterns.values()).filter(p => p.suspiciousScore > 0.5).length;
    const memoryUsage = JSON.stringify(Array.from(this.patterns.values())).length;
    
    return {
      totalPatterns: this.patterns.size,
      blockedIdentifiers: blocked,
      suspiciousIdentifiers: suspicious,
      memoryUsage
    };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.patterns.clear();
    this.suspiciousIPs.clear();
  }
}

export const advancedRateLimiter = new AdvancedRateLimiter();
