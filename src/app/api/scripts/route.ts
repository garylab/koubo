import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { collection, script } from "@/lib/db/schema";
import {
  getOrCreateDefaultCollection,
  jsonError,
  requireCollection,
  requireUserId,
} from "@/lib/api-helpers";
import { defer } from "@/lib/defer";
import { recomputeScriptEmbedding } from "@/lib/similarity";
import { generateTitle } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/scripts?collectionId=<id>  → list (optionally filtered by collection)
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const filterCollection = url.searchParams.get("collectionId");

    const db = getDb();
    const where = filterCollection
      ? and(eq(collection.userId, userId), eq(script.collectionId, filterCollection))
      : eq(collection.userId, userId);

    const rows = await db
      .select({
        id: script.id,
        collectionId: script.collectionId,
        content: script.content,
        updatedAt: script.updatedAt,
        embeddingUpdatedAt: script.embeddingUpdatedAt,
      })
      .from(script)
      .innerJoin(collection, eq(collection.id, script.collectionId))
      .where(where)
      .orderBy(desc(script.updatedAt));
    return Response.json(rows);
  } catch (err) {
    return jsonError(err);
  }
}

// POST /api/scripts  body: { content?, collectionId? }  → create
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as {
      content?: string;
      collectionId?: string;
    };
    const content = body.content ?? "";

    let collectionId: string;
    if (body.collectionId) {
      await requireCollection(body.collectionId, userId);
      collectionId = body.collectionId;
    } else {
      const def = await getOrCreateDefaultCollection(userId);
      collectionId = def.id;
    }

    const db = getDb();
    const [row] = await db
      .insert(script)
      .values({ collectionId, content })
      .returning();

    if (content.trim()) {
      defer(recomputeScriptEmbedding(row.id));
      defer(
        (async () => {
          const title = await generateTitle(content);
          if (!title) return;
          const db2 = getDb();
          await db2
            .update(script)
            .set({ title, updatedAt: new Date() })
            .where(eq(script.id, row.id));
          revalidatePath("/scripts");
          revalidatePath(`/scripts/${row.id}`);
        })(),
      );
    }
    revalidatePath("/scripts");
    return Response.json(row, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
