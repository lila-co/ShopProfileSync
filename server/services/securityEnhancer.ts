
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

interface SecurityConfig {
  enableBruteForceProtection: boolean;
  enableSuspiciousActivityDetection: boolean;
  maxFailedAttempts: number;
  blockDuration: number; // in minutes
}

class SecurityEnhancer {
  private config: SecurityConfig;
  private blockedIPs: Map<string, number> = new Map(); // IP -> unblock timestamp
  private failedAttempts: Map<string, number> = new Map(); // IP -> failed count
  private suspiciousActivity: Map<string, { count: number; lastActivity: number }> = new Map();

  constructor(config: SecurityConfig) {
    this.config = config;

    // Clean up expired blocks every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    return (forwarded && forwarded.toString().split(',')[0]) || 
           realIp || 
           req.connection.remoteAddress || 
           req.ip || 
           'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    
    // Clean up expired IP blocks
    for (const [ip, unblockTime] of this.blockedIPs.entries()) {
      if (now > unblockTime) {
        this.blockedIPs.delete(ip);
        this.failedAttempts.delete(ip);
      }
    }

    // Clean up old suspicious activity records
    const oneHourAgo = now - (60 * 60 * 1000);
    for (const [ip, activity] of this.suspiciousActivity.entries()) {
      if (activity.lastActivity < oneHourAgo) {
        this.suspiciousActivity.delete(ip);
      }
    }
  }

  // Brute force protection middleware
  bruteForceProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableBruteForceProtection) {
        return next();
      }

      const ip = this.getClientIP(req);
      const now = Date.now();

      // Check if IP is currently blocked
      const unblockTime = this.blockedIPs.get(ip);
      if (unblockTime && now < unblockTime) {
        const remainingTime = Math.ceil((unblockTime - now) / 1000 / 60);
        return res.status(429).json({
          error: 'IP temporarily blocked',
          message: 'Too many failed attempts. Please try again later.',
          blockedFor: `${remainingTime} minutes`
        });
      }

      // Track failed attempts on auth endpoints
      if (req.path.includes('/auth/') && req.method === 'POST') {
        res.on('finish', () => {
          if (res.statusCode === 401 || res.statusCode === 403) {
            // Failed authentication attempt
            const attempts = (this.failedAttempts.get(ip) || 0) + 1;
            this.failedAttempts.set(ip, attempts);

            if (attempts >= this.config.maxFailedAttempts) {
              // Block the IP
              const blockUntil = now + (this.config.blockDuration * 60 * 1000);
              this.blockedIPs.set(ip, blockUntil);

              // Log security event
              this.logSecurityEvent(ip, 'brute_force_detected', {
                attempts,
                path: req.path,
                userAgent: req.headers['user-agent']
              });
            }
          } else if (res.statusCode < 400) {
            // Successful auth, reset counter
            this.failedAttempts.delete(ip);
          }
        });
      }

      next();
    };
  }

  // Suspicious activity detection
  suspiciousActivityDetection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableSuspiciousActivityDetection) {
        return next();
      }

      const ip = this.getClientIP(req);
      const now = Date.now();

      // Track request patterns
      let activity = this.suspiciousActivity.get(ip) || { count: 0, lastActivity: now };

      // Reset count if last activity was more than 10 minutes ago
      if (now - activity.lastActivity > 10 * 60 * 1000) {
        activity.count = 0;
      }

      activity.count++;
      activity.lastActivity = now;
      this.suspiciousActivity.set(ip, activity);

      // Flag suspicious patterns
      const suspiciousPatterns = [
        // Too many different endpoints in short time
        activity.count > 100,
        // Accessing admin endpoints without proper auth
        req.path.includes('/admin/') && !req.headers['x-current-user-id'],
        // Unusual user agent patterns
        !req.headers['user-agent'] || req.headers['user-agent'].includes('bot'),
        // Multiple file upload attempts
        req.path.includes('/upload') && activity.count > 20
      ];

      if (suspiciousPatterns.some(pattern => pattern)) {
        this.logSecurityEvent(ip, 'suspicious_activity', {
          path: req.path,
          method: req.method,
          userAgent: req.headers['user-agent'],
          requestCount: activity.count,
          timeWindow: '10 minutes'
        });

        // Optional: Add additional restrictions for suspicious IPs
        if (activity.count > 200) {
          return res.status(429).json({
            error: 'Suspicious activity detected',
            message: 'Your request pattern has been flagged. Please contact support if this is an error.'
          });
        }
      }

      next();
    };
  }

  // Log security events
  private async logSecurityEvent(ip: string, event: string, details: any): Promise<void> {
    try {
      // Use the new logger instead of storage.createSecurityLog
      const { logger } = await import('./logger');
      logger.warn(`Security Event: ${event}`, {
        ip,
        event,
        details,
        severity: event === 'brute_force_detected' ? 'HIGH' : 'MEDIUM',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // API key validation for external integrations
  validateApiKey() {
    return (req: Request, res: Response, next: NextFunction) => {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (req.path.startsWith('/api/internal/') || req.path.startsWith('/api/admin/')) {
        if (!apiKey) {
          return res.status(401).json({
            error: 'API key required',
            message: 'This endpoint requires a valid API key'
          });
        }

        // In production, validate against stored API keys
        // For demo, we'll use a simple check
        if (apiKey !== 'demo-internal-api-key-12345') {
          return res.status(403).json({
            error: 'Invalid API key',
            message: 'The provided API key is not valid'
          });
        }
      }

      next();
    };
  }
}

// Export configured security enhancer
export const securityEnhancer = new SecurityEnhancer({
  enableBruteForceProtection: true,
  enableSuspiciousActivityDetection: true,
  maxFailedAttempts: 5,
  blockDuration: 15 // 15 minutes
});

export default SecurityEnhancer;
