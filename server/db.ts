import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { logger } from "./services/logger";
import { performanceMonitor } from "./services/performanceMonitor";

const { Pool } = pg;

// Primary database pool
const primaryPool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://replit:password@localhost:5432/smart_shopping",
  max: 20,
  min: 5,
  idle: 30000,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  maxUses: 7500,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  statement_timeout: 30000,
  query_timeout: 30000,
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

// Connection health monitoring
const checkDatabaseHealth = async (pool: Pool): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    logger.error('Database health check failed', { error });
    return false;
  }
};

// Automatic failover logic
const getHealthyPool = async (): Promise<Pool> => {
  const primaryHealthy = await checkDatabaseHealth(primaryPool);
  if (primaryHealthy) {
    return primaryPool;
  }
  
  logger.warn('Primary database unhealthy, checking read replica');
  const replicaHealthy = await checkDatabaseHealth(readPool);
  if (replicaHealthy) {
    return readPool;
  }
  
  throw new Error('All database connections are unhealthy');
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