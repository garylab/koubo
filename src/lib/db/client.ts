import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";
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

// IMPORTANT: do NOT cache the client / db at module scope.
// Workers isolates I/O per request; a postgres client reused across requests
// throws "Cannot perform I/O on behalf of a different request".
// Hyperdrive makes per-request setup cheap: the worker→hyperdrive socket is
// intra-DC and the actual DB connection is reused from its warm pool.
export function getDb(): DB {
  const client = postgres(resolveConnectionString(), {
    // Neon's -pooler endpoint is PgBouncer in transaction mode.
    prepare: false,
    max: 1,
    fetch_types: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(client, { schema });
}

export { schema };
