import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { collection, script } from "@/lib/db/schema";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { inspireScript } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAMPLE_SIZE = 5;

// POST /api/scripts/inspire
// Body: { collectionId?: string }
// Returns { title, content } — does NOT write to the DB. The caller decides
// whether to accept the suggestion via POST /api/scripts.
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as {
      collectionId?: number;
    };

    const db = getDb();

    const filters = [eq(collection.userId, userId)];
    if (typeof body.collectionId === "number")
      filters.push(eq(script.collectionId, body.collectionId));

    // Equivalent of "pick a random offset, take 5 contiguous rows" — avoids
    // ORDER BY RANDOM()'s full-table sort. id is a UUID so we can't do
    // `WHERE id >= random_max_id`; OFFSET works for any id type.
    const [{ n }] = await db
      .select({ n: sql<number>`COUNT(*)`.as("n") })
      .from(script)
      .innerJoin(collection, eq(collection.id, script.collectionId))
      .where(and(...filters));

    let samples: { title: string | null; content: string }[] = [];
    if (n > 0) {
      const offset = n > SAMPLE_SIZE ? Math.floor(Math.random() * (n - SAMPLE_SIZE + 1)) : 0;
      samples = await db
        .select({ title: script.title, content: script.content })
        .from(script)
        .innerJoin(collection, eq(collection.id, script.collectionId))
        .where(and(...filters))
        .limit(SAMPLE_SIZE)
        .offset(offset);
    }

    let collectionName: string | null = null;
    if (typeof body.collectionId === "number") {
      const [c] = await db
        .select({ name: collection.name })
        .from(collection)
        .where(and(eq(collection.id, body.collectionId), eq(collection.userId, userId)))
        .limit(1);
      collectionName = c?.name ?? null;
    }

    const draft = await inspireScript({
      samples: samples.map((s) => ({ title: s.title ?? "", content: s.content })),
      collectionName,
    });

    return Response.json(draft);
  } catch (err) {
    return jsonError(err);
  }
}

