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
import { recomputeScriptEmbeddingAndSimilarity } from "@/lib/similarity";

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

    if (typeof body.content === "string") {
      patch.content = body.content;
      contentChanged = body.content !== existing.content;
    }

    if (typeof body.collectionId === "string" && body.collectionId !== existing.collectionId) {
      await requireCollection(body.collectionId, userId);
      patch.collectionId = body.collectionId;
    }

    const db = getDb();
    const [row] = await db
      .update(script)
      .set(patch)
      .where(eq(script.id, id))
      .returning();

    if (
      contentChanged &&
      typeof patch.content === "string" &&
      patch.content.trim().length > 0
    ) {
      defer(recomputeScriptEmbeddingAndSimilarity(id));
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
    return new Response(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
