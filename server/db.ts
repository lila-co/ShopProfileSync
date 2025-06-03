import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

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
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const db = drizzle(pool);