import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

type DB = NeonDatabase<typeof schema>;

let cached: DB | null = null;

export function getDb(): DB {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  // Neon serverless: WebSocket-based connection, native to Workers & Node.
  // Supports transactions (Better Auth's signup flow needs them).
  const pool = new Pool({ connectionString: url });
  cached = drizzle(pool, { schema });
  return cached;
}

export { schema };
