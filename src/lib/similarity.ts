import "server-only";
import { sql, eq, or, and, desc } from "drizzle-orm";
import { getDb } from "./db/client";
import { script, scriptSimilarity, collection } from "./db/schema";
import { embedText } from "./openai";

const SIM_THRESHOLD = 0.95;
const SIM_LIMIT = 20;

function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

export async function recomputeScriptEmbeddingAndSimilarity(scriptId: string) {
  const db = getDb();

  const [s] = await db.select().from(script).where(eq(script.id, scriptId));
  if (!s) return;

  const vec = await embedText(s.content);
  const vecLit = toVectorLiteral(vec);

  await db.execute(sql`
    UPDATE "script"
    SET embedding = ${vecLit}::vector, embedding_updated_at = NOW()
    WHERE id = ${scriptId}
  `);

  // Same-collection similarity.
  const similar = (await db.execute(sql`
    SELECT id, (1 - (embedding <=> ${vecLit}::vector))::real AS score
    FROM "script"
    WHERE collection_id = ${s.collectionId}
      AND id != ${scriptId}
      AND embedding IS NOT NULL
      AND (1 - (embedding <=> ${vecLit}::vector)) > ${SIM_THRESHOLD}
    ORDER BY embedding <=> ${vecLit}::vector
    LIMIT ${SIM_LIMIT}
  `)) as unknown as { id: string; score: number }[];

  await db
    .delete(scriptSimilarity)
    .where(
      or(
        eq(scriptSimilarity.scriptId, scriptId),
        eq(scriptSimilarity.similarScriptId, scriptId),
      ),
    );

  if (similar.length > 0) {
    const rows = similar.flatMap((r) => [
      { scriptId, similarScriptId: r.id, score: r.score },
      { scriptId: r.id, similarScriptId: scriptId, score: r.score },
    ]);
    await db.insert(scriptSimilarity).values(rows).onConflictDoNothing();
  }
}

export async function listSimilarScripts(scriptId: string, userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: script.id,
      content: script.content,
      score: scriptSimilarity.score,
      collectionId: script.collectionId,
    })
    .from(scriptSimilarity)
    .innerJoin(script, eq(script.id, scriptSimilarity.similarScriptId))
    .innerJoin(collection, eq(collection.id, script.collectionId))
    .where(
      and(eq(scriptSimilarity.scriptId, scriptId), eq(collection.userId, userId)),
    )
    .orderBy(desc(scriptSimilarity.score));
  return rows;
}
