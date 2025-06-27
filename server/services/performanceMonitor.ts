
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
    // Collect system metrics every 15 minutes
    this.systemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 900000);
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
      this.triggerMemoryCleanup();
    } else if (memoryUsagePercent > 80) {
      issues.push('High memory usage (>80%)');
      if (status === 'healthy') status = 'warning';
    }

    // Memory leak detection
    const memoryGrowthRate = this.detectMemoryLeaks();
    if (memoryGrowthRate > 0.1) { // 10% growth per interval
      issues.push(`Potential memory leak detected (${(memoryGrowthRate * 100).toFixed(1)}% growth rate)`);
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

    // Check for EventEmitter memory leaks
    const maxListeners = process.getMaxListeners();
    if (maxListeners < 50) { // Arbitrary threshold
      issues.push(`Low max listeners limit: ${maxListeners}`);
      if (status === 'healthy') status = 'warning';
    }

    return { status, issues };
  }

  private memorySnapshots: Array<{ timestamp: number; heapUsed: number }> = [];
  
  private detectMemoryLeaks(): number {
    const currentMemory = process.memoryUsage().heapUsed;
    const now = Date.now();
    
    this.memorySnapshots.push({ timestamp: now, heapUsed: currentMemory });
    
    // Keep only last 10 snapshots (about 2.5 hours of data)
    if (this.memorySnapshots.length > 10) {
      this.memorySnapshots.shift();
    }
    
    if (this.memorySnapshots.length < 3) {
      return 0; // Not enough data
    }
    
    const oldest = this.memorySnapshots[0];
    const newest = this.memorySnapshots[this.memorySnapshots.length - 1];
    const timeDiff = newest.timestamp - oldest.timestamp;
    const memoryDiff = newest.heapUsed - oldest.heapUsed;
    
    if (timeDiff === 0) return 0;
    
    // Calculate growth rate per millisecond, then convert to percentage
    const growthRate = memoryDiff / oldest.heapUsed;
    
    return Math.max(0, growthRate);
  }
  
  private triggerMemoryCleanup(): void {
    logger.warn('Triggering memory cleanup due to high usage');
    
    try {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        logger.info('Forced garbage collection completed');
      }
      
      // Clear old request data
      const cutoff = Date.now() - 300000; // 5 minutes ago
      this.recentRequests = this.recentRequests.filter(req => req.startTime > cutoff);
      
      // Clear memory snapshots older than 1 hour
      const snapshotCutoff = Date.now() - 3600000;
      this.memorySnapshots = this.memorySnapshots.filter(snap => snap.timestamp > snapshotCutoff);
      
      logger.info('Memory cleanup completed', {
        remainingRequests: this.recentRequests.length,
        remainingSnapshots: this.memorySnapshots.length
      });
      
    } catch (error) {
      logger.error('Memory cleanup failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
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
