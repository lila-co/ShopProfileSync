
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

interface ErrorContext {
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  query?: any;
  body?: any;
  headers?: any;
}

interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  timestamp: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  fingerprint: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

class ErrorTracker {
  private errorReports = new Map<string, ErrorReport>();
  private maxStoredErrors = 1000;

  private generateFingerprint(error: Error, context: ErrorContext): string {
    // Create a fingerprint based on error message, stack trace, and path
    const key = `${error.name}:${error.message}:${context.path}:${context.method}`;
    return Buffer.from(key).toString('base64').slice(0, 32);
  }

  private determineSeverity(error: Error, context: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors
    if (error.message.includes('ECONNREFUSED') || 
        error.message.includes('database') ||
        error.message.includes('ENOMEM') ||
        error.message.includes('EMFILE')) {
      return 'critical';
    }

    // High severity errors
    if (error.name === 'TypeError' ||
        error.name === 'ReferenceError' ||
        context.path?.includes('/api/auth/') ||
        context.path?.includes('/api/payment/')) {
      return 'high';
    }

    // Medium severity errors
    if (error.name === 'ValidationError' ||
        error.name === 'AuthenticationError' ||
        error.message.includes('timeout')) {
      return 'medium';
    }

    // Default to low
    return 'low';
  }

  trackError(error: Error, context: ErrorContext = {}): void {
    const fingerprint = this.generateFingerprint(error, context);
    const severity = this.determineSeverity(error, context);
    const timestamp = new Date().toISOString();

    let errorReport = this.errorReports.get(fingerprint);

    if (errorReport) {
      // Update existing error report
      errorReport.count++;
      errorReport.lastSeen = timestamp;
      errorReport.context = { ...errorReport.context, ...context }; // Merge context
    } else {
      // Create new error report
      errorReport = {
        id: fingerprint,
        message: error.message,
        stack: error.stack,
        timestamp,
        context,
        severity,
        fingerprint,
        count: 1,
        firstSeen: timestamp,
        lastSeen: timestamp
      };

      this.errorReports.set(fingerprint, errorReport);

      // Remove oldest errors if we exceed the limit
      if (this.errorReports.size > this.maxStoredErrors) {
        const oldestKey = Array.from(this.errorReports.keys())[0];
        this.errorReports.delete(oldestKey);
      }
    }

    // Log the error
    logger.error(error.message, {
      fingerprint,
      severity,
      count: errorReport.count,
      context,
      errorName: error.name
    }, error);

    // Log critical errors immediately to console
    if (severity === 'critical') {
      console.error(`🚨 CRITICAL ERROR [${fingerprint}]:`, error.message);
      console.error('Context:', context);
      console.error('Stack:', error.stack);
    }
  }

  middleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const context: ErrorContext = {
        requestId: req.requestId,
        userId: req.headers['x-current-user-id'] as string,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
        headers: req.headers
      };

      this.trackError(error, context);

      // Send appropriate error response
      const isDevelopment = process.env.NODE_ENV === 'development';
      const status = (error as any).status || (error as any).statusCode || 500;

      res.status(status).json({
        error: 'Internal Server Error',
        message: isDevelopment ? error.message : 'Something went wrong',
        ...(isDevelopment && { stack: error.stack }),
        requestId: req.requestId
      });
    };
  }

  // Get error reports for admin dashboard
  getErrorReports(limit = 50): ErrorReport[] {
    return Array.from(this.errorReports.values())
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
      .slice(0, limit);
  }

  getErrorStats(): {
    totalErrors: number;
    errorsBySeverity: Record<string, number>;
    topErrors: Array<{ fingerprint: string; message: string; count: number; severity: string }>;
    recentErrors: number;
  } {
    const reports = Array.from(this.errorReports.values());
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const errorsBySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    let totalErrors = 0;
    let recentErrors = 0;

    for (const report of reports) {
      totalErrors += report.count;
      errorsBySeverity[report.severity] += report.count;
      
      if (new Date(report.lastSeen) > oneHourAgo) {
        recentErrors += report.count;
      }
    }

    const topErrors = reports
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(report => ({
        fingerprint: report.fingerprint,
        message: report.message,
        count: report.count,
        severity: report.severity
      }));

    return {
      totalErrors,
      errorsBySeverity,
      topErrors,
      recentErrors
    };
  }

  clearError(fingerprint: string): boolean {
    return this.errorReports.delete(fingerprint);
  }

  clearAllErrors(): void {
    this.errorReports.clear();
  }
}

export const errorTracker = new ErrorTracker();
export default ErrorTracker;
