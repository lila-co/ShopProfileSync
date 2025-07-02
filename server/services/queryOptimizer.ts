
import { db } from '../db';
import { logger } from './logger';
import { performanceMonitor } from './performanceMonitor';

interface QueryMetrics {
  query: string;
  duration: number;
  rowCount?: number;
  memoryUsage?: number;
  timestamp: Date;
  params?: any[];
}

export class QueryOptimizer {
  private static queryCache = new Map<string, {
    result: any;
    timestamp: number;
    ttl: number;
  }>();
  
  private static slowQueries: QueryMetrics[] = [];
  private static readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHED_QUERIES = 100;

  static async executeWithMetrics<T>(
    queryFn: () => Promise<T>,
    queryInfo: {
      name: string;
      query?: string;
      params?: any[];
      cacheable?: boolean;
      cacheKey?: string;
      ttl?: number;
      priority?: 'high' | 'medium' | 'low';
    }
  ): Promise<T> {
    // Enhanced connection pool monitoring
    const poolStats = await this.getPoolStats();
    const poolUtilization = poolStats.activeConnections / poolStats.maxConnections;
    
    if (poolUtilization > 0.9) {
      logger.warn('Connection pool near capacity', { 
        ...poolStats, 
        utilization: poolUtilization,
        queryName: queryInfo.name 
      });
      
      // Reject low-priority queries when pool is stressed
      if (queryInfo.priority === 'low' && poolUtilization > 0.95) {
        throw new Error('Connection pool exhausted - low priority query rejected');
      }
    }

    // Query plan analysis for slow queries
    if (queryInfo.query && queryInfo.query.toLowerCase().includes('select')) {
      await this.analyzeQueryPlan(queryInfo.query, queryInfo.params);
    }
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    // Check cache first if cacheable
    if (queryInfo.cacheable && queryInfo.cacheKey) {
      const cached = this.queryCache.get(queryInfo.cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        logger.debug('Query cache hit', { 
          queryName: queryInfo.name,
          cacheKey: queryInfo.cacheKey 
        });
        return cached.result;
      }
    }

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage();
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      // Record metrics
      const metrics: QueryMetrics = {
        query: queryInfo.query || queryInfo.name,
        duration,
        memoryUsage: memoryDelta,
        timestamp: new Date(),
        params: queryInfo.params
      };

      // Track slow queries
      if (duration > this.SLOW_QUERY_THRESHOLD) {
        this.slowQueries.push(metrics);
        if (this.slowQueries.length > 50) {
          this.slowQueries.shift();
        }

        logger.warn('Slow query detected', {
          queryName: queryInfo.name,
          duration,
          memoryDelta,
          query: queryInfo.query?.substring(0, 200)
        });
      }

      // Record performance metrics
      performanceMonitor.recordMetric?.({
        name: 'database_query_performance',
        value: duration,
        unit: 'ms',
        metadata: {
          queryName: queryInfo.name,
          memoryDelta,
          success: true
        }
      });

      // Cache result if applicable
      if (queryInfo.cacheable && queryInfo.cacheKey && result) {
        const ttl = queryInfo.ttl || this.CACHE_TTL;
        this.queryCache.set(queryInfo.cacheKey, {
          result,
          timestamp: Date.now(),
          ttl
        });

        // Manage cache size
        if (this.queryCache.size > this.MAX_CACHED_QUERIES) {
          const oldestKey = Array.from(this.queryCache.keys())[0];
          this.queryCache.delete(oldestKey);
        }
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Database query failed', {
        queryName: queryInfo.name,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        query: queryInfo.query?.substring(0, 200)
      });

      performanceMonitor.recordMetric?.({
        name: 'database_query_performance',
        value: duration,
        unit: 'ms',
        metadata: {
          queryName: queryInfo.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  }

  static getSlowQueries(): QueryMetrics[] {
    return [...this.slowQueries];
  }

  static getCacheStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const cacheArray = Array.from(this.queryCache.values());
    const memoryUsage = JSON.stringify(cacheArray).length;
    
    return {
      size: this.queryCache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      memoryUsage
    };
  }

  static clearCache(): void {
    this.queryCache.clear();
    logger.info('Query cache cleared');
  }

  static optimizeIndexes(): string[] {
    // Analysis of common slow queries to suggest index optimizations
    const suggestions: string[] = [];
    
    const frequentSlowQueries = this.slowQueries.reduce((acc, query) => {
      const key = query.query.substring(0, 100);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(frequentSlowQueries)
      .filter(([_, count]) => count > 3)
      .forEach(([query]) => {
        if (query.includes('WHERE userId =')) {
          suggestions.push('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_queries ON purchases(userId);');
        }
        if (query.includes('ORDER BY purchaseDate')) {
          suggestions.push('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_date_desc ON purchases(purchaseDate DESC);');
        }
        if (query.includes('JOIN') && query.includes('productId')) {
          suggestions.push('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_joins ON purchase_items(productId, purchaseId);');
        }
      });

    return suggestions;
  }
}
static async getPoolStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    maxConnections: number;
  }> {
    // This would need to be implemented based on your pool implementation
    return {
      totalConnections: 0,
      activeConnections: 0, 
      idleConnections: 0,
      maxConnections: 20
    };
  }

  static async monitorConnectionHealth(): Promise<void> {
    const stats = await this.getPoolStats();
    
    performanceMonitor.recordMetric?.({
      name: 'database_pool_utilization',
      value: (stats.activeConnections / stats.maxConnections) * 100,
      unit: 'percentage',
      metadata: { 
        totalConnections: stats.totalConnections,
        activeConnections: stats.activeConnections
      }
    });
  }
static async analyzeQueryPlan(query: string, params?: any[]): Promise<void> {
    try {
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const result = await db.execute(explainQuery, params);
      const plan = result[0]?.['QUERY PLAN']?.[0];
      
      if (plan) {
        const executionTime = plan['Execution Time'];
        const planningTime = plan['Planning Time'];
        const totalTime = executionTime + planningTime;
        
        if (totalTime > 1000) { // Log slow query plans
          logger.warn('Slow query plan detected', {
            query: query.substring(0, 200),
            executionTime,
            planningTime,
            totalTime,
            plan: JSON.stringify(plan.Plan, null, 2)
          });
        }
        
        // Check for problematic patterns
        this.analyzeQueryPatterns(plan.Plan, query);
      }
    } catch (error) {
      // Don't fail the original query if plan analysis fails
      logger.debug('Query plan analysis failed', { error, query: query.substring(0, 100) });
    }
  }

  static analyzeQueryPatterns(plan: any, query: string): void {
    const issues: string[] = [];
    
    // Check for sequential scans on large tables
    if (plan['Node Type'] === 'Seq Scan' && plan['Actual Rows'] > 10000) {
      issues.push(`Sequential scan on large table: ${plan['Relation Name']}`);
    }
    
    // Check for expensive sorts
    if (plan['Node Type'] === 'Sort' && plan['Actual Total Time'] > 100) {
      issues.push(`Expensive sort operation (${plan['Actual Total Time']}ms)`);
    }
    
    // Check for nested loops with high row counts
    if (plan['Node Type'] === 'Nested Loop' && plan['Actual Rows'] > 1000) {
      issues.push(`Inefficient nested loop with ${plan['Actual Rows']} rows`);
    }
    
    // Recursively check child plans
    if (plan.Plans) {
      plan.Plans.forEach((childPlan: any) => this.analyzeQueryPatterns(childPlan, query));
    }
    
    if (issues.length > 0) {
      logger.warn('Query performance issues detected', {
        query: query.substring(0, 200),
        issues
      });
    }
  }

  static async monitorLockContention(): Promise<void> {
    try {
      const lockQuery = `
        SELECT 
          pg_class.relname,
          pg_locks.mode,
          pg_locks.granted,
          COUNT(*) as lock_count,
          AVG(EXTRACT(EPOCH FROM (now() - pg_stat_activity.query_start))) as avg_wait_time
        FROM pg_locks
        JOIN pg_class ON pg_locks.relation = pg_class.oid
        JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
        WHERE pg_locks.mode IN ('RowExclusiveLock', 'AccessExclusiveLock')
        GROUP BY pg_class.relname, pg_locks.mode, pg_locks.granted
        HAVING COUNT(*) > 5 OR AVG(EXTRACT(EPOCH FROM (now() - pg_stat_activity.query_start))) > 5
      `;
      
      const result = await db.execute(lockQuery);
      
      if (result.length > 0) {
        logger.warn('Lock contention detected', { lockStats: result });
        
        result.forEach((row: any) => {
          performanceMonitor.recordMetric?.({
            name: 'database_lock_contention',
            value: row.lock_count,
            unit: 'count',
            metadata: {
              table: row.relname,
              mode: row.mode,
              granted: row.granted,
              avgWaitTime: row.avg_wait_time
            }
          });
        });
      }
    } catch (error) {
      logger.debug('Lock monitoring failed', { error });
    }
  }

  static async getDetailedPoolStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    maxConnections: number;
    waitingCount: number;
    connectionUtilization: number;
    avgConnectionAge: number;
  }> {
    try {
      const statsQuery = `
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          AVG(EXTRACT(EPOCH FROM (now() - backend_start))) as avg_connection_age
        FROM pg_stat_activity 
        WHERE application_name LIKE 'smartcart%'
      `;
      
      const result = await db.execute(statsQuery);
      const stats = result[0] || {};
      
      const totalConnections = parseInt(stats.total_connections) || 0;
      const activeConnections = parseInt(stats.active_connections) || 0;
      const idleConnections = parseInt(stats.idle_connections) || 0;
      const maxConnections = 20; // From pool config
      const waitingCount = Math.max(0, activeConnections - maxConnections);
      const connectionUtilization = totalConnections / maxConnections;
      const avgConnectionAge = parseFloat(stats.avg_connection_age) || 0;
      
      return {
        totalConnections,
        activeConnections,
        idleConnections,
        maxConnections,
        waitingCount,
        connectionUtilization,
        avgConnectionAge
      };
    } catch (error) {
      logger.error('Failed to get detailed pool stats', { error });
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        maxConnections: 20,
        waitingCount: 0,
        connectionUtilization: 0,
        avgConnectionAge: 0
      };
    }
  }
