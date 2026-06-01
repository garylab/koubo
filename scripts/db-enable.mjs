import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set (run with: node --env-file=.env.local ...)");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });
try {
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  console.log("✓ pgvector extension enabled");
} finally {
  await sql.end();
}
