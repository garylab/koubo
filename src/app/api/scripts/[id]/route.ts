import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { script } from "@/lib/db/schema";
import {
  jsonError,
  requireCollection,
  requireScript,
  requireUserId,
} from "@/lib/api-helpers";
import { defer } from "@/lib/defer";
import {
  deleteScriptEmbedding,
  recomputeScriptEmbedding,
} from "@/lib/similarity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await requireUserId();
    const { script: s } = await requireScript(id, userId);
    return Response.json(s);
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await requireUserId();
    const { script: existing } = await requireScript(id, userId);
    const body = (await req.json()) as { content?: string; collectionId?: string };

    const patch: Partial<typeof script.$inferInsert> = { updatedAt: new Date() };
    let contentChanged = false;
    let collectionChanged = false;

    if (typeof body.content === "string") {
      patch.content = body.content;
      contentChanged = body.content !== existing.content;
    }

    if (
      typeof body.collectionId === "string" &&
      body.collectionId !== existing.collectionId
    ) {
      await requireCollection(body.collectionId, userId);
      patch.collectionId = body.collectionId;
      collectionChanged = true;
    }

    const db = getDb();
    const [row] = await db
      .update(script)
      .set(patch)
      .where(eq(script.id, id))
      .returning();

    // Re-embed if content changed (or refresh metadata when collection moved
    // — Vectorize doesn't expose a partial-metadata update, easiest is to
    // re-upsert with the existing vector via recompute).
    if (
      (contentChanged || collectionChanged) &&
      (patch.content ?? existing.content).trim().length > 0
    ) {
      defer(recomputeScriptEmbedding(id));
    }

    return Response.json(row);
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await requireUserId();
    await requireScript(id, userId);
    const db = getDb();
    await db.delete(script).where(eq(script.id, id));
    defer(deleteScriptEmbedding(id));
    return new Response(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
