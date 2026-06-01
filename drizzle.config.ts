import { defineConfig } from "drizzle-kit";

// D1 is SQLite under the hood. drizzle-kit generates the migration SQL;
// we apply it via `wrangler d1 execute koubo-db --file=<sql> [--local|--remote]`.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  verbose: true,
  strict: true,
});
