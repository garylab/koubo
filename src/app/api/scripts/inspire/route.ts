import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { collection, script } from "@/lib/db/schema";
import { requireUserId, jsonError } from "@/lib/api-helpers";
import { inspireScript } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/scripts/inspire
// Body: { collectionId?: string }
// Returns { title, content } — does NOT write to the DB. The caller decides
// whether to accept the suggestion via POST /api/scripts.
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as {
      collectionId?: string;
    };

    const db = getDb();

    const filters = [eq(collection.userId, userId)];
    if (body.collectionId) filters.push(eq(script.collectionId, body.collectionId));

    const samples = await db
      .select({
        title: script.title,
        content: script.content,
      })
      .from(script)
      .innerJoin(collection, eq(collection.id, script.collectionId))
      .where(and(...filters))
      .orderBy(sql`RANDOM()`)
      .limit(5);

    let collectionName: string | null = null;
    if (body.collectionId) {
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
