import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cache } from "react";
import * as schema from "./schema";

type DB = DrizzleD1Database<typeof schema>;

// React.cache dedupes within one request; across requests Workers
// gives us a fresh env (and thus fresh D1 binding) anyway.
export const getDb = cache((): DB => {
  const { env } = getCloudflareContext();
  return drizzle(env.DB, { schema });
});

export { schema };
