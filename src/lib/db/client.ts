import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cache } from "react";
import * as schema from "./schema";

type DB = PostgresJsDatabase<typeof schema>;

function resolveConnectionString(): string {
  try {
    const { env } = getCloudflareContext();
    if (env.HYPERDRIVE?.connectionString) return env.HYPERDRIVE.connectionString;
  } catch {
    // not in a Cloudflare context (drizzle-kit, plain node scripts)
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set and Hyperdrive binding missing");
  }
  return url;
}

// React `cache()` dedupes within ONE request (server component render or
// route handler invocation). Across requests we still create fresh — Workers
// I/O isolation requires it. So we get the best of both: only one postgres
// client per request, but no risk of cross-request I/O reuse.
export const getDb = cache((): DB => {
  const client = postgres(resolveConnectionString(), {
    prepare: false, // Neon -pooler is PgBouncer transaction mode
    max: 1,
    fetch_types: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(client, { schema });
});

export { schema };
