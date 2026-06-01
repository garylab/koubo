import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set (run with: node --env-file=.env.local ...)");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });
try {
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS script_embedding_hnsw_idx
    ON "script" USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL
  `);
  console.log("✓ HNSW index on script.embedding");
} finally {
  await sql.end();
}
