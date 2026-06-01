import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db/client";
import { script, collection } from "./db/schema";
import { embedText } from "./ai";

const SIM_THRESHOLD = 0.95;
const SIM_LIMIT = 20;

/**
 * Upsert the script's embedding into Vectorize. Stores collectionId in metadata
 * so we can filter similarity lookups to the same collection.
 */
export async function recomputeScriptEmbedding(scriptId: string) {
  const db = getDb();
  const [s] = await db.select().from(script).where(eq(script.id, scriptId));
  if (!s) return;

  const vector = await embedText(s.content);

  const { env } = getCloudflareContext();
  await env.VECTORIZE.upsert([
    {
      id: scriptId,
      values: vector,
      metadata: { collectionId: s.collectionId },
    },
  ]);

  await db
    .update(script)
    .set({ embeddingUpdatedAt: new Date() })
    .where(eq(script.id, scriptId));
}

/**
 * Returns scripts in the same collection with cosine similarity > 0.95.
 * Two-hop: fetch this script's vector from Vectorize, then query Vectorize
 * for nearest neighbours filtered by collection, then hydrate from D1.
 */
export async function listSimilarScripts(scriptId: string, userId: string) {
  const { env } = getCloudflareContext();

  // Fetch this script's vector so we can search for neighbours.
  const own = await env.VECTORIZE.getByIds([scriptId]);
  const myVector = own[0]?.values;
  if (!myVector) return [];

  const me = await getDb()
    .select({ collectionId: script.collectionId })
    .from(script)
    .innerJoin(collection, eq(collection.id, script.collectionId))
    .where(and(eq(script.id, scriptId), eq(collection.userId, userId)))
    .limit(1);
  if (!me[0]) return [];

  const result = await env.VECTORIZE.query(myVector, {
    topK: SIM_LIMIT + 1, // +1 because the query vector matches itself with score 1
    filter: { collectionId: me[0].collectionId },
    returnValues: false,
    returnMetadata: "none",
  });

  const candidates = result.matches
    .filter((m) => m.id !== scriptId && m.score >= SIM_THRESHOLD)
    .slice(0, SIM_LIMIT);
  if (candidates.length === 0) return [];

  const scoreById = new Map(candidates.map((m) => [m.id, m.score]));
  const ids = candidates.map((m) => m.id);

  const rows = await getDb()
    .select({
      id: script.id,
      content: script.content,
      collectionId: script.collectionId,
    })
    .from(script)
    .innerJoin(collection, eq(collection.id, script.collectionId))
    .where(and(inArray(script.id, ids), eq(collection.userId, userId)));

  return rows
    .map((r) => ({ ...r, score: scoreById.get(r.id) ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Delete a script's vector from Vectorize (called from DELETE /api/scripts/[id]).
 */
export async function deleteScriptEmbedding(scriptId: string) {
  const { env } = getCloudflareContext();
  await env.VECTORIZE.deleteByIds([scriptId]);
}
