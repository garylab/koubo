import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

type DB = PostgresJsDatabase<typeof schema>;

let cached: DB | null = null;

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

export function getDb(): DB {
  if (cached) return cached;
  const client = postgres(resolveConnectionString(), {
    // Neon pooler is PgBouncer in transaction mode — prepared statements must be off.
    prepare: false,
    // Workers are short-lived; one connection per isolate is enough.
    max: 1,
    // Skip type fetching to avoid an extra round-trip on cold start.
    fetch_types: false,
  });
  cached = drizzle(client, { schema });
  return cached;
}

export { schema };
