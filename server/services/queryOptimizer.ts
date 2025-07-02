
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
    }
  ): Promise<T> {
    // Check connection pool health before executing
    const poolStats = await this.getPoolStats();
    if (poolStats.activeConnections > poolStats.maxConnections * 0.9) {
      logger.warn('Connection pool near capacity', poolStats);
      // Consider queuing or rejecting non-critical queries
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
