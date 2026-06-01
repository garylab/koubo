import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

type DB = NeonDatabase<typeof schema>;

// IMPORTANT: do not cache the Pool / db at module scope.
// Cloudflare Workers isolates I/O objects per-request: a Pool created in
// request A throws "Cannot perform I/O on behalf of a different request"
// when reused by request B. Each request builds its own connection.
export function getDb(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url });
  return drizzle(pool, { schema });
}

export { schema };
