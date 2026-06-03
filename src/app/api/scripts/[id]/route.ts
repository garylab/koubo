import { revalidatePath } from "next/cache";
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
import { isScriptStatus } from "@/lib/script-status";
import { generateTitle } from "@/lib/ai";

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
    const body = (await req.json()) as {
      content?: string;
      collectionId?: string;
      status?: string;
      title?: string;
    };

    const patch: Partial<typeof script.$inferInsert> = { updatedAt: new Date() };
    let contentChanged = false;
    let collectionChanged = false;

    if (typeof body.content === "string") {
      patch.content = body.content;
      contentChanged = body.content !== existing.content;
    }

    if (typeof body.title === "string") {
      const trimmed = body.title.trim();
      patch.title = trimmed || null;
    }

    if (
      typeof body.collectionId === "string" &&
      body.collectionId !== existing.collectionId
    ) {
      await requireCollection(body.collectionId, userId);
      patch.collectionId = body.collectionId;
      collectionChanged = true;
    }

    if (body.status !== undefined) {
      if (!isScriptStatus(body.status)) {
        return Response.json({ error: "invalid status" }, { status: 400 });
      }
      patch.status = body.status;
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

    // If the title is still empty after this PATCH and we have content,
    // generate one in the background. The user can always override it later.
    const effectiveTitle =
      patch.title !== undefined ? patch.title : existing.title;
    const effectiveContent = patch.content ?? existing.content;
    if (
      (effectiveTitle == null || effectiveTitle.trim() === "") &&
      effectiveContent.trim().length > 0
    ) {
      defer(
        (async () => {
          const title = await generateTitle(effectiveContent);
          if (!title) return;
          const db2 = getDb();
          await db2
            .update(script)
            .set({ title, updatedAt: new Date() })
            .where(eq(script.id, id));
          revalidatePath("/scripts");
          revalidatePath(`/scripts/${id}`);
        })(),
      );
    }

    revalidatePath("/scripts");
    revalidatePath(`/scripts/${id}`);
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
    revalidatePath("/scripts");
    revalidatePath(`/scripts/${id}`);
    return new Response(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
