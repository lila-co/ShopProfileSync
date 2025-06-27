import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { logger } from "./services/logger";
import { performanceMonitor } from "./services/performanceMonitor";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://replit:password@localhost:5432/smart_shopping",
  // Optimize connection pool
  max: 20, // Maximum number of clients in the pool
  min: 5,  // Minimum number of clients in the pool
  idle: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return error if connection takes longer than 5 seconds
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  maxUses: 7500, // Close connection after 7500 uses
  // Additional performance optimizations
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  statement_timeout: 30000, // 30 second statement timeout
  query_timeout: 30000,
});

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