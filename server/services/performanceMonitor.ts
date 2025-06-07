
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { nanoid } from 'nanoid';

interface RequestMetrics {
  requestId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
  activeRequests: number;
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
}

class PerformanceMonitor {
  private activeRequests = new Map<string, RequestMetrics>();
  private recentRequests: RequestMetrics[] = [];
  private maxRecentRequests = 1000;
  private totalRequests = 0;
  private totalErrors = 0;
  private systemMetricsInterval?: NodeJS.Timeout;

  constructor() {
    this.startSystemMetricsCollection();
  }

  private startSystemMetricsCollection(): void {
    // Collect system metrics every 5 minutes
    this.systemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 300000);
  }

  private collectSystemMetrics(): void {
    const metrics = this.getSystemMetrics();
    
    // Log key system metrics
    logger.recordMetric({
      name: 'memory_usage_rss',
      value: metrics.memoryUsage.rss,
      unit: 'bytes',
      metadata: { type: 'system' }
    });

    logger.recordMetric({
      name: 'memory_usage_heap_used',
      value: metrics.memoryUsage.heapUsed,
      unit: 'bytes',
      metadata: { type: 'system' }
    });

    logger.recordMetric({
      name: 'active_requests',
      value: metrics.activeRequests,
      unit: 'count',
      metadata: { type: 'system' }
    });

    logger.recordMetric({
      name: 'error_rate',
      value: metrics.errorRate,
      unit: 'percentage',
      metadata: { type: 'system' }
    });

    logger.recordMetric({
      name: 'average_response_time',
      value: metrics.averageResponseTime,
      unit: 'ms',
      metadata: { type: 'system' }
    });
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = nanoid(10);
      const startTime = Date.now();
      const startCpuUsage = process.cpuUsage();
      const startMemory = process.memoryUsage();

      // Store request context
      req.requestId = requestId;
      req.startTime = startTime;

      const requestMetrics: RequestMetrics = {
        requestId,
        startTime,
        memoryUsage: startMemory,
        cpuUsage: startCpuUsage
      };

      this.activeRequests.set(requestId, requestMetrics);
      this.totalRequests++;

      // Track response completion
      res.on('finish', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const endCpuUsage = process.cpuUsage(startCpuUsage);
        const endMemory = process.memoryUsage();

        // Update metrics
        requestMetrics.endTime = endTime;
        requestMetrics.duration = duration;

        // Remove from active requests
        this.activeRequests.delete(requestId);

        // Add to recent requests
        this.recentRequests.push(requestMetrics);
        if (this.recentRequests.length > this.maxRecentRequests) {
          this.recentRequests.shift();
        }

        // Track errors
        if (res.statusCode >= 400) {
          this.totalErrors++;
        }

        // Log request metrics
        logger.logRequest(req, res, duration, requestId);

        // Record performance metrics
        logger.recordMetric({
          name: 'request_duration',
          value: duration,
          unit: 'ms',
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            requestId
          }
        });

        // Record CPU usage for this request
        logger.recordMetric({
          name: 'request_cpu_usage',
          value: endCpuUsage.user + endCpuUsage.system,
          unit: 'microseconds',
          metadata: {
            method: req.method,
            path: req.path,
            requestId
          }
        });

        // Record memory delta
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
        logger.recordMetric({
          name: 'request_memory_delta',
          value: memoryDelta,
          unit: 'bytes',
          metadata: {
            method: req.method,
            path: req.path,
            requestId
          }
        });

        // Log slow requests
        if (duration > 1000) { // Requests taking more than 1 second
          logger.warn('Slow request detected', {
            method: req.method,
            path: req.path,
            duration,
            statusCode: res.statusCode,
            requestId,
            memoryDelta,
            cpuUsage: endCpuUsage
          });
        }

        // Log high memory usage requests
        if (Math.abs(memoryDelta) > 10 * 1024 * 1024) { // More than 10MB
          logger.warn('High memory usage request detected', {
            method: req.method,
            path: req.path,
            duration,
            memoryDelta,
            requestId
          });
        }
      });

      next();
    };
  }

  getSystemMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const activeRequests = this.activeRequests.size;

    // Calculate error rate
    const errorRate = this.totalRequests > 0 ? (this.totalErrors / this.totalRequests) * 100 : 0;

    // Calculate average response time from recent requests
    const recentCompletedRequests = this.recentRequests.filter(r => r.duration !== undefined);
    const averageResponseTime = recentCompletedRequests.length > 0
      ? recentCompletedRequests.reduce((sum, r) => sum + (r.duration || 0), 0) / recentCompletedRequests.length
      : 0;

    return {
      memoryUsage,
      cpuUsage: process.cpuUsage(),
      uptime,
      activeRequests,
      totalRequests: this.totalRequests,
      errorRate,
      averageResponseTime
    };
  }

  getHealthStatus(): { status: 'healthy' | 'warning' | 'critical'; issues: string[] } {
    const metrics = this.getSystemMetrics();
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check memory usage
    const memoryUsagePercent = (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      issues.push('High memory usage (>90%)');
      status = 'critical';
    } else if (memoryUsagePercent > 80) {
      issues.push('High memory usage (>80%)');
      if (status === 'healthy') status = 'warning';
    }

    // Check error rate
    if (metrics.errorRate > 20) {
      issues.push('High error rate (>20%)');
      status = 'critical';
    } else if (metrics.errorRate > 10) {
      issues.push('Elevated error rate (>10%)');
      if (status === 'healthy') status = 'warning';
    }

    // Check response time
    if (metrics.averageResponseTime > 2000) {
      issues.push('Slow response times (>2s average)');
      status = 'critical';
    } else if (metrics.averageResponseTime > 1000) {
      issues.push('Slow response times (>1s average)');
      if (status === 'healthy') status = 'warning';
    }

    // Check active requests
    if (metrics.activeRequests > 100) {
      issues.push('High number of active requests (>100)');
      if (status === 'healthy') status = 'warning';
    }

    return { status, issues };
  }

  cleanup(): void {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
    }
  }
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();
export default PerformanceMonitor;
