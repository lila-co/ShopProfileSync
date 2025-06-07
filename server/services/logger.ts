
import fs from 'fs';
import path from 'path';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  stack?: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class Logger {
  private logDir: string;
  private metricsDir: string;
  private maxLogFileSize = 10 * 1024 * 1024; // 10MB
  private maxLogFiles = 5;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.metricsDir = path.join(process.cwd(), 'metrics');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
      if (!fs.existsSync(this.metricsDir)) {
        fs.mkdirSync(this.metricsDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directories:', error);
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry) + '\n';
  }

  private getLogFileName(level: LogLevel): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${level}-${date}.log`);
  }

  private getMetricsFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.metricsDir, `metrics-${date}.log`);
  }

  private rotateLogFile(filename: string): void {
    try {
      if (!fs.existsSync(filename)) return;

      const stats = fs.statSync(filename);
      if (stats.size < this.maxLogFileSize) return;

      // Rotate files
      for (let i = this.maxLogFiles - 1; i > 0; i--) {
        const oldFile = `${filename}.${i}`;
        const newFile = `${filename}.${i + 1}`;
        if (fs.existsSync(oldFile)) {
          fs.renameSync(oldFile, newFile);
        }
      }

      fs.renameSync(filename, `${filename}.1`);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  private writeLog(entry: LogEntry): void {
    try {
      const filename = this.getLogFileName(entry.level);
      this.rotateLogFile(filename);
      
      const logLine = this.formatLogEntry(entry);
      fs.appendFileSync(filename, logLine);

      // Also write to console in development
      if (process.env.NODE_ENV === 'development') {
        const color = this.getLogColor(entry.level);
        console.log(color, `[${entry.level.toUpperCase()}] ${entry.message}`, '\x1b[0m');
        if (entry.metadata) {
          console.log(JSON.stringify(entry.metadata, null, 2));
        }
      }
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  private getLogColor(level: LogLevel): string {
    switch (level) {
      case 'error': return '\x1b[31m'; // Red
      case 'warn': return '\x1b[33m';  // Yellow
      case 'info': return '\x1b[36m';  // Cyan
      case 'debug': return '\x1b[90m'; // Gray
      default: return '\x1b[0m';       // Reset
    }
  }

  error(message: string, metadata?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      metadata,
      stack: error?.stack
    };
    this.writeLog(entry);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      metadata
    };
    this.writeLog(entry);
  }

  info(message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      metadata
    };
    this.writeLog(entry);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'debug',
        message,
        metadata
      };
      this.writeLog(entry);
    }
  }

  // Request logging with context
  logRequest(req: any, res: any, duration: number, requestId: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 400 ? 'warn' : 'info',
      message: `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`,
      requestId,
      userId: req.headers['x-current-user-id'],
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      metadata: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined
      }
    };
    this.writeLog(entry);
  }

  // Performance metrics
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    try {
      const metricEntry: PerformanceMetric = {
        ...metric,
        timestamp: new Date().toISOString()
      };

      const filename = this.getMetricsFileName();
      const metricLine = JSON.stringify(metricEntry) + '\n';
      fs.appendFileSync(filename, metricLine);
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }

  // Get recent logs (for admin dashboard)
  getRecentLogs(level?: LogLevel, limit = 100): LogEntry[] {
    try {
      const files = fs.readdirSync(this.logDir);
      const logFiles = files
        .filter(file => !level || file.startsWith(level))
        .sort()
        .reverse()
        .slice(0, 3); // Get last 3 files

      const logs: LogEntry[] = [];
      
      for (const file of logFiles) {
        const content = fs.readFileSync(path.join(this.logDir, file), 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        for (const line of lines.reverse()) {
          try {
            logs.push(JSON.parse(line));
            if (logs.length >= limit) break;
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
        if (logs.length >= limit) break;
      }

      return logs.slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent logs:', error);
      return [];
    }
  }

  // Get performance metrics summary
  getMetricsSummary(hours = 24): Record<string, any> {
    try {
      const files = fs.readdirSync(this.metricsDir);
      const metricsFiles = files
        .filter(file => file.startsWith('metrics-'))
        .sort()
        .reverse()
        .slice(0, 7); // Get last week

      const metrics: PerformanceMetric[] = [];
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      for (const file of metricsFiles) {
        const content = fs.readFileSync(path.join(this.metricsDir, file), 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const metric = JSON.parse(line);
            if (new Date(metric.timestamp) > cutoffTime) {
              metrics.push(metric);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }

      // Aggregate metrics
      const summary: Record<string, any> = {};
      
      for (const metric of metrics) {
        if (!summary[metric.name]) {
          summary[metric.name] = {
            count: 0,
            sum: 0,
            min: Infinity,
            max: -Infinity,
            avg: 0,
            unit: metric.unit
          };
        }

        const s = summary[metric.name];
        s.count++;
        s.sum += metric.value;
        s.min = Math.min(s.min, metric.value);
        s.max = Math.max(s.max, metric.value);
        s.avg = s.sum / s.count;
      }

      return summary;
    } catch (error) {
      console.error('Failed to get metrics summary:', error);
      return {};
    }
  }
}

export const logger = new Logger();
export default Logger;
