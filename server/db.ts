import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { logger } from "./services/logger";
import { performanceMonitor } from "./services/performanceMonitor";

const { Pool } = pg;

// Primary database pool with enhanced configuration
const primaryPool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://replit:password@localhost:5432/smart_shopping",
  max: 20,
  min: 5,
  idle: 30000,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  maxUses: 1000, // More frequent connection recycling
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  statement_timeout: 30000,
  query_timeout: 30000,
  // Enhanced validation and monitoring
  allowExitOnIdle: false,
  application_name: 'smartcart_primary',
  options: '-c lock_timeout=10000 -c statement_timeout=30000',
});

// Read replica pool for read-heavy operations
const readPool = new Pool({
  connectionString: process.env.READ_REPLICA_URL ?? process.env.DATABASE_URL ?? "postgresql://replit:password@localhost:5432/smart_shopping",
  max: 15, // Fewer connections for read operations
  min: 3,
  idle: 30000,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  maxUses: 10000, // Read operations can reuse connections more
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  statement_timeout: 15000, // Shorter timeout for reads
  query_timeout: 15000,
});

// Enhanced connection health monitoring with metrics
const checkDatabaseHealth = async (pool: Pool, poolName: string): Promise<boolean> => {
  const startTime = Date.now();
  try {
    const client = await pool.connect();
    try {
      // Test actual query performance, not just connection
      await client.query('SELECT 1, pg_backend_pid(), now()');
      const duration = Date.now() - startTime;
      
      performanceMonitor.recordMetric?.({
        name: 'database_health_check',
        value: duration,
        unit: 'ms',
        metadata: { poolName, success: true }
      });
      
      return duration < 1000; // Fail if health check takes > 1s
    } finally {
      client.release();
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Database health check failed', { error, poolName, duration });
    
    performanceMonitor.recordMetric?.({
      name: 'database_health_check',
      value: duration,
      unit: 'ms',
      metadata: { poolName, success: false, error: error instanceof Error ? error.message : 'Unknown' }
    });
    
    return false;
  }
};

// Circuit breaker pattern for database connections
class DatabaseCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold = 5;
  private readonly timeoutDuration = 30000; // 30 seconds

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeoutDuration) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - database unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.error('Database circuit breaker opened', { 
        failureCount: this.failureCount,
        state: this.state 
      });
    }
  }

  getState(): string {
    return this.state;
  }
}

const circuitBreaker = new DatabaseCircuitBreaker();

// Enhanced failover with circuit breaker
const getHealthyPool = async (): Promise<Pool> => {
  return circuitBreaker.execute(async () => {
    const primaryHealthy = await checkDatabaseHealth(primaryPool, 'primary');
    if (primaryHealthy) {
      return primaryPool;
    }
    
    logger.warn('Primary database unhealthy, checking read replica');
    const replicaHealthy = await checkDatabaseHealth(readPool, 'replica');
    if (replicaHealthy) {
      return readPool;
    }
    
    throw new Error('All database connections are unhealthy');
  });
};

const pool = primaryPool;

// Enhanced error handling and monitoring
pool.on('error', (err) => {
  logger.error('Database pool error', { error: err.message, stack: err.stack });
});

pool.on('connect', (client) => {
  logger.debug('Database client connected', { totalCount: pool.totalCount, idleCount: pool.idleCount });
});

pool.on('acquire', (client) => {
  logger.debug('Database client acquired', { totalCount: pool.totalCount, idleCount: pool.idleCount, waitingCount: pool.waitingCount });
});

pool.on('remove', (client) => {
  logger.debug('Database client removed', { totalCount: pool.totalCount, idleCount: pool.idleCount });
});

// Custom drizzle instance with query logging and performance monitoring
export const db = drizzle(pool, {
  logger: process.env.NODE_ENV === 'development' ? {
    logQuery: (query, params) => {
      const start = Date.now();
      logger.debug('Database query', { query, params, timestamp: start });
      return () => {
        const duration = Date.now() - start;
        if (duration > 1000) {
          logger.warn('Slow database query detected', { query, duration, params });
        }
        performanceMonitor.recordMetric?.({
          name: 'database_query_duration',
          value: duration,
          unit: 'ms',
          metadata: { query: query.slice(0, 100) }
        });
      };
    }
  } : false
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('Closing database pool...');
  await pool.end();
});

process.on('SIGINT', async () => {
  logger.info('Closing database pool...');
  await pool.end();
});