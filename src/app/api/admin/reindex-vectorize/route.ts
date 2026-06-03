import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { script } from "@/lib/db/schema";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { recomputeScriptEmbedding } from "@/lib/similarity";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-shot admin endpoint. After the int-id migration the Vectorize index
// still holds vectors keyed by old UUIDs. This:
//  1) reads _script_map (left around by migration 0004)
//  2) deletes the old vectors
//  3) re-embeds every script with its new int id
//  4) drops _script_map
//
// Idempotent: re-running after the map is gone is a no-op.
export async function POST() {
  try {
    await requireUserId(); // any logged-in user can run this
    const db = getDb();

    const hasMap = await db
      .get(sql`SELECT name FROM sqlite_master WHERE type='table' AND name='_script_map'`)
      .catch(() => null);
    if (!hasMap) {
      return Response.json({ status: "no-op", reason: "_script_map does not exist" });
    }

    const mapRows = (await db.all(
      sql`SELECT old_id, new_id FROM _script_map`,
    )) as { old_id: string; new_id: number }[];

    // 1) Delete old UUID-keyed vectors.
    if (mapRows.length > 0) {
      const { env } = getCloudflareContext();
      // VECTORIZE.deleteByIds accepts up to 1000 ids per call.
      const oldIds = mapRows.map((r) => r.old_id);
      await env.VECTORIZE.deleteByIds(oldIds);
    }

    // 2) Re-embed all scripts with new int ids.
    const scripts = await db
      .select({ id: script.id, content: script.content })
      .from(script);
    let reindexed = 0;
    for (const s of scripts) {
      if (!s.content.trim()) continue;
      await recomputeScriptEmbedding(s.id);
      reindexed++;
    }

    // 3) Drop the mapping table.
    await db.run(sql`DROP TABLE _script_map`);

    return Response.json({
      status: "ok",
      deleted: mapRows.length,
      reindexed,
    });
  } catch (err) {
    return jsonError(err);
  }
}
