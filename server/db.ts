import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

const connectionString = process.env.DATABASE_URL || "postgres://localhost:5432/shopping_app";

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // Suppress notices
  onparameter: () => {}, // Suppress parameter notices
});

export const db = drizzle(client, { schema });